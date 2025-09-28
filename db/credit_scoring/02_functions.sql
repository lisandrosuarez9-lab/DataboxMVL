-- Credit Scoring Functions
-- Step 2: Create Required Functions

-- Extract features from persona data
CREATE OR REPLACE FUNCTION public.extract_features(persona_id UUID)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tx_6m_count', COALESCE((SELECT COUNT(*) FROM transactions WHERE persona_id = $1 AND created_at > now() - INTERVAL '6 months'), 0),
    'tx_6m_avg_amount', COALESCE((SELECT AVG(amount) FROM transactions WHERE persona_id = $1 AND created_at > now() - INTERVAL '6 months'), 0),
    'tx_6m_sum', COALESCE((SELECT SUM(amount) FROM transactions WHERE persona_id = $1 AND created_at > now() - INTERVAL '6 months'), 0),
    'days_since_last_tx', COALESCE((SELECT EXTRACT(DAY FROM now() - MAX(created_at)) FROM transactions WHERE persona_id = $1), 365),
    'remesa_12m_sum', COALESCE((SELECT SUM(amount) FROM remittances WHERE persona_id = $1 AND created_at > now() - INTERVAL '12 months'), 0),
    'bills_paid_ratio', COALESCE((
      SELECT COUNT(*) FILTER (WHERE status = 'paid') / NULLIF(COUNT(*), 0)::float
      FROM utility_bills WHERE persona_id = $1 AND due_date > now() - INTERVAL '12 months'
    ), 0),
    'avg_bill_amount', COALESCE((SELECT AVG(amount) FROM utility_bills WHERE persona_id = $1), 0),
    'micro_active', COALESCE((SELECT COUNT(*) > 0 FROM microcredits WHERE persona_id = $1 AND status = 'active'), FALSE),
    'micro_active_sum', COALESCE((SELECT SUM(amount) FROM microcredits WHERE persona_id = $1 AND status = 'active'), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Apply weights to features
CREATE OR REPLACE FUNCTION public.apply_weights(features JSONB, model_id INTEGER)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  weights JSONB;
  contribution JSONB = '{}'::JSONB;
  feature_key TEXT;
  feature_value NUMERIC;
  weight NUMERIC;
  raw_score NUMERIC = 0;
BEGIN
  -- Get all weights for the model
  SELECT jsonb_object_agg(feature_key, weight) INTO weights
  FROM score_factors
  WHERE model_id = $2;
  
  -- Calculate contribution for each feature
  FOR feature_key, feature_value IN SELECT * FROM jsonb_each_text(features)
  LOOP
    weight := COALESCE((weights ->> feature_key)::NUMERIC, 0);
    
    -- Convert boolean to numeric if needed
    IF jsonb_typeof(features -> feature_key) = 'boolean' THEN
      feature_value := CASE WHEN features ->> feature_key = 'true' THEN 1 ELSE 0 END;
    ELSE
      feature_value := COALESCE((features ->> feature_key)::NUMERIC, 0);
    END IF;
    
    contribution := contribution || jsonb_build_object(feature_key, feature_value * weight);
    raw_score := raw_score + (feature_value * weight);
  END LOOP;
  
  RETURN jsonb_build_object('raw_score', raw_score, 'contributions', contribution);
END;
$$;

-- Normalize score to 0-1000 scale
CREATE OR REPLACE FUNCTION public.normalize_score(raw_score NUMERIC, min_score NUMERIC DEFAULT -100, max_score NUMERIC DEFAULT 100)
RETURNS INTEGER
SECURITY INVOKER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN GREATEST(0, LEAST(1000, FLOOR(((raw_score - min_score) / (max_score - min_score)) * 1000)));
END;
$$;

-- Compute full credit score
CREATE OR REPLACE FUNCTION public.compute_credit_score(persona_id UUID, model_id INTEGER)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  features JSONB;
  weighted_result JSONB;
  normalized_score INTEGER;
  raw_score NUMERIC;
  result_record JSONB;
  inserted_id UUID;
  risk_band_info JSONB;
BEGIN
  -- Extract features
  features := public.extract_features(persona_id);
  
  -- Apply weights
  weighted_result := public.apply_weights(features, model_id);
  raw_score := (weighted_result->>'raw_score')::NUMERIC;
  
  -- Normalize score
  normalized_score := public.normalize_score(raw_score);
  
  -- Get risk band information
  SELECT jsonb_build_object(
    'band', band,
    'recommendation', recommendation
  ) INTO risk_band_info
  FROM risk_bands
  WHERE model_id = $2
    AND normalized_score BETWEEN min_score AND max_score;
    
  -- Build explanation
  result_record := jsonb_build_object(
    'features', features,
    'weighted_result', weighted_result,
    'normalized_score', normalized_score,
    'risk_band', risk_band_info
  );
  
  -- Insert record
  INSERT INTO credit_scores (persona_id, model_id, score, explanation, computed_at)
  VALUES (persona_id, model_id, normalized_score, result_record, now())
  RETURNING id INTO inserted_id;
  
  -- Return full result
  RETURN jsonb_build_object(
    'id', inserted_id,
    'persona_id', persona_id,
    'model_id', model_id,
    'score', normalized_score,
    'explanation', result_record,
    'computed_at', now()
  );
END;
$$;

-- Get score trend
CREATE OR REPLACE FUNCTION public.get_score_trend(persona_id UUID, model_id INTEGER, months INTEGER DEFAULT 12)
RETURNS TABLE(month DATE, avg_score NUMERIC)
SECURITY INVOKER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT DATE_TRUNC('month', computed_at)::DATE AS month,
         AVG(score)::NUMERIC AS avg_score
  FROM credit_scores
  WHERE persona_id = $1
    AND model_id = $2
    AND computed_at > now() - ($3 || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', computed_at)
  ORDER BY month;
END;
$$;

-- Simulate credit score without persistence
CREATE OR REPLACE FUNCTION public.simulate_credit_score(persona_id UUID, model_id INTEGER, feature_overrides JSONB DEFAULT '{}'::JSONB)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  features JSONB;
  weighted_result JSONB;
  normalized_score INTEGER;
  raw_score NUMERIC;
  result_record JSONB;
  risk_band_info JSONB;
BEGIN
  -- Extract features
  features := public.extract_features(persona_id);
  
  -- Apply overrides
  features := features || feature_overrides;
  
  -- Apply weights
  weighted_result := public.apply_weights(features, model_id);
  raw_score := (weighted_result->>'raw_score')::NUMERIC;
  
  -- Normalize score
  normalized_score := public.normalize_score(raw_score);
  
  -- Get risk band information
  SELECT jsonb_build_object(
    'band', band,
    'recommendation', recommendation
  ) INTO risk_band_info
  FROM risk_bands
  WHERE model_id = $2
    AND normalized_score BETWEEN min_score AND max_score;
    
  -- Build explanation (without persistence)
  result_record := jsonb_build_object(
    'features', features,
    'weighted_result', weighted_result,
    'normalized_score', normalized_score,
    'risk_band', risk_band_info,
    'simulation', true
  );
  
  -- Return full result
  RETURN jsonb_build_object(
    'persona_id', persona_id,
    'model_id', model_id,
    'score', normalized_score,
    'explanation', result_record,
    'simulated_at', now()
  );
END;
$$;

-- Add function comments for documentation
COMMENT ON FUNCTION public.extract_features(UUID) IS 'Extract credit scoring features from persona transaction data';
COMMENT ON FUNCTION public.apply_weights(JSONB, INTEGER) IS 'Apply model weights to features and calculate contributions';
COMMENT ON FUNCTION public.normalize_score(NUMERIC, NUMERIC, NUMERIC) IS 'Normalize raw score to 0-1000 scale';
COMMENT ON FUNCTION public.compute_credit_score(UUID, INTEGER) IS 'Compute and persist complete credit score';
COMMENT ON FUNCTION public.get_score_trend(UUID, INTEGER, INTEGER) IS 'Get historical score trends for a persona';
COMMENT ON FUNCTION public.simulate_credit_score(UUID, INTEGER, JSONB) IS 'Simulate credit score with feature overrides without persistence';