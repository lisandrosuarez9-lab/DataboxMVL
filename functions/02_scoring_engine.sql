-- Core scoring functions with weight application and normalization
CREATE OR REPLACE FUNCTION public.apply_weights(
  p_features JSONB,
  p_model_id UUID
)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  factor_record RECORD;
  feature_value NUMERIC;
  weighted_contribution NUMERIC;
  total_raw_score NUMERIC := 0;
  contributions JSONB := '{}';
  model_exists BOOLEAN;
BEGIN
  -- Verify model exists
  SELECT EXISTS(SELECT 1 FROM scoring_models WHERE id = p_model_id) INTO model_exists;
  IF NOT model_exists THEN
    RAISE EXCEPTION 'Scoring model % does not exist', p_model_id;
  END IF;

  -- Process each scoring factor for the model
  FOR factor_record IN 
    SELECT factor_key, weight, description
    FROM score_factors 
    WHERE model_id = p_model_id
    ORDER BY factor_key
  LOOP
    -- Extract feature value, defaulting to 0 if not present
    feature_value := COALESCE((p_features ->> factor_record.factor_key)::NUMERIC, 0);
    
    -- Calculate weighted contribution
    weighted_contribution := feature_value * factor_record.weight;
    
    -- Add to total score
    total_raw_score := total_raw_score + weighted_contribution;
    
    -- Track individual contributions for explanation
    contributions := contributions || jsonb_build_object(
      factor_record.factor_key, jsonb_build_object(
        'raw_value', feature_value,
        'weight', factor_record.weight,
        'contribution', weighted_contribution,
        'description', factor_record.description
      )
    );
  END LOOP;
  
  -- Return comprehensive scoring result
  RETURN jsonb_build_object(
    'raw_score', total_raw_score,
    'contributions', contributions,
    'model_id', p_model_id,
    'computation_timestamp', now(),
    'total_factors_processed', jsonb_object_length(contributions)
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error applying weights for model %: %', p_model_id, SQLERRM;
END;
$$;

-- Normalize raw score to 0-1000 scale based on model-specific bounds
CREATE OR REPLACE FUNCTION public.normalize_score(
  p_raw_score NUMERIC,
  p_model_id UUID DEFAULT NULL,
  p_min_score NUMERIC DEFAULT -100,
  p_max_score NUMERIC DEFAULT 100
)
RETURNS INTEGER
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  model_min_score NUMERIC;
  model_max_score NUMERIC;
  normalized_score INTEGER;
BEGIN
  -- Use model-specific bounds if model_id provided
  IF p_model_id IS NOT NULL THEN
    -- Get model-specific normalization bounds if they exist
    SELECT 
      COALESCE(MIN(min_score), p_min_score),
      COALESCE(MAX(max_score), p_max_score)
    INTO model_min_score, model_max_score
    FROM risk_bands 
    WHERE model_id = p_model_id;
    
    -- Use derived bounds or fallback to provided defaults
    p_min_score := COALESCE(model_min_score, p_min_score);
    p_max_score := COALESCE(model_max_score, p_max_score);
  END IF;
  
  -- Ensure valid bounds
  IF p_max_score <= p_min_score THEN
    RAISE EXCEPTION 'Invalid score bounds: min_score (%) must be less than max_score (%)', p_min_score, p_max_score;
  END IF;
  
  -- Normalize to 0-1000 scale with bounds enforcement
  normalized_score := GREATEST(0, 
    LEAST(1000, 
      FLOOR(((p_raw_score - p_min_score) / (p_max_score - p_min_score)) * 1000)
    )
  );
  
  RETURN normalized_score;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error normalizing score %: %', p_raw_score, SQLERRM;
END;
$$;

-- Get risk band for a given score and model
CREATE OR REPLACE FUNCTION public.get_risk_band(
  p_score INTEGER,
  p_model_id UUID
)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  risk_band_info RECORD;
BEGIN
  -- Find the appropriate risk band for the score
  SELECT band, min_score, max_score, recommendation
  INTO risk_band_info
  FROM risk_bands
  WHERE model_id = p_model_id
    AND p_score >= min_score 
    AND p_score <= max_score
  ORDER BY min_score DESC
  LIMIT 1;
  
  -- Return risk band information
  IF FOUND THEN
    RETURN jsonb_build_object(
      'band', risk_band_info.band,
      'min_score', risk_band_info.min_score,
      'max_score', risk_band_info.max_score,
      'recommendation', risk_band_info.recommendation,
      'score', p_score
    );
  ELSE
    -- Fallback for scores outside defined bands
    RETURN jsonb_build_object(
      'band', 'UNCLASSIFIED',
      'min_score', NULL,
      'max_score', NULL,
      'recommendation', 'Score falls outside defined risk bands - manual review required',
      'score', p_score
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error determining risk band for score % in model %: %', p_score, p_model_id, SQLERRM;
END;
$$;

-- Complete credit score computation function
CREATE OR REPLACE FUNCTION public.compute_credit_score(
  p_persona_id UUID,
  p_model_id UUID
)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  features JSONB;
  weighted_result JSONB;
  raw_score NUMERIC;
  normalized_score INTEGER;
  risk_band_info JSONB;
  result_record JSONB;
  inserted_id UUID;
  audit_log_id UUID;
BEGIN
  -- Extract features
  features := public.extract_features(p_persona_id);
  
  -- Apply weights
  weighted_result := public.apply_weights(features, p_model_id);
  raw_score := (weighted_result->>'raw_score')::NUMERIC;
  
  -- Normalize score
  normalized_score := public.normalize_score(raw_score, p_model_id);
  
  -- Get risk band information
  risk_band_info := public.get_risk_band(normalized_score, p_model_id);
  
  -- Build comprehensive explanation
  result_record := jsonb_build_object(
    'raw_score', raw_score,
    'normalized_score', normalized_score,
    'features', features,
    'weighted_contributions', weighted_result->'contributions',
    'risk_band', risk_band_info,
    'model_id', p_model_id,
    'computation_metadata', jsonb_build_object(
      'computed_at', now(),
      'feature_count', jsonb_object_length(features),
      'factors_applied', weighted_result->'total_factors_processed'
    )
  );
  
  -- Create audit log entry (if audit system exists)
  BEGIN
    INSERT INTO audit_logs (
      persona_id, 
      action, 
      details, 
      created_at
    ) VALUES (
      p_persona_id,
      'CREDIT_SCORE_COMPUTED',
      jsonb_build_object(
        'model_id', p_model_id,
        'score', normalized_score,
        'risk_band', risk_band_info->>'band'
      ),
      now()
    ) RETURNING id INTO audit_log_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue if audit logging fails
      audit_log_id := NULL;
  END;
  
  -- Persist credit score
  INSERT INTO credit_scores (
    persona_id, 
    model_id, 
    score, 
    explanation, 
    computed_at,
    audit_log_id
  ) VALUES (
    p_persona_id, 
    p_model_id, 
    normalized_score, 
    result_record, 
    now(),
    audit_log_id
  ) RETURNING id INTO inserted_id;
  
  -- Return full result with ID
  RETURN result_record || jsonb_build_object(
    'id', inserted_id,
    'persona_id', p_persona_id,
    'audit_log_id', audit_log_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error computing credit score for persona % with model %: %', p_persona_id, p_model_id, SQLERRM;
END;
$$;

-- Add function comments for documentation
COMMENT ON FUNCTION public.apply_weights(JSONB, UUID) IS 'Apply model-specific weights to extracted features and calculate raw score';
COMMENT ON FUNCTION public.normalize_score(NUMERIC, UUID, NUMERIC, NUMERIC) IS 'Normalize raw score to 0-1000 scale based on model bounds';
COMMENT ON FUNCTION public.get_risk_band(INTEGER, UUID) IS 'Determine risk band classification for a given score';
COMMENT ON FUNCTION public.compute_credit_score(UUID, UUID) IS 'Compute and persist complete credit score with full explanation';