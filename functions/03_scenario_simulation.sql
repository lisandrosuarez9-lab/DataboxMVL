-- Scenario simulation function
CREATE OR REPLACE FUNCTION public.simulate_credit_score(
  p_persona_id UUID,
  p_model_id UUID,
  p_feature_overrides JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  original_features JSONB;
  modified_features JSONB;
  original_score_result JSONB;
  simulated_score_result JSONB;
  weighted_result JSONB;
  raw_score NUMERIC;
  normalized_score INTEGER;
  risk_band_info JSONB;
  simulation_id UUID;
  override_key TEXT;
  override_value TEXT;
  audit_log_id UUID;
BEGIN
  -- Generate simulation ID for tracking
  simulation_id := gen_random_uuid();
  
  -- Extract original features
  original_features := public.extract_features(p_persona_id);
  
  -- Apply feature overrides to create modified feature set
  modified_features := original_features;
  
  -- Process each override
  FOR override_key, override_value IN SELECT * FROM jsonb_each_text(p_feature_overrides)
  LOOP
    -- Validate override key exists in original features or is a valid feature
    IF original_features ? override_key OR override_key ~ '^(tx_6m_count|tx_6m_avg_amount|tx_6m_sum|days_since_last_tx|remesa_12m_count|remesa_12m_sum|bills_paid_ratio|avg_bill_amount|micro_active|micro_active_sum)$' THEN
      -- Apply override (convert to appropriate type)
      modified_features := modified_features || jsonb_build_object(
        override_key, 
        CASE 
          WHEN override_value ~ '^[0-9]+\.?[0-9]*$' THEN override_value::NUMERIC
          WHEN override_value IN ('true', 'false') THEN override_value::BOOLEAN
          ELSE override_value
        END
      );
    ELSE
      RAISE WARNING 'Invalid feature override key: %', override_key;
    END IF;
  END LOOP;
  
  -- Compute original score for comparison
  BEGIN
    original_score_result := jsonb_build_object(
      'features', original_features,
      'weighted_result', public.apply_weights(original_features, p_model_id)
    );
    original_score_result := original_score_result || jsonb_build_object(
      'normalized_score', public.normalize_score(
        (original_score_result->'weighted_result'->>'raw_score')::NUMERIC, 
        p_model_id
      )
    );
    original_score_result := original_score_result || jsonb_build_object(
      'risk_band', public.get_risk_band(
        (original_score_result->>'normalized_score')::INTEGER, 
        p_model_id
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      original_score_result := jsonb_build_object(
        'error', 'Could not compute original score: ' || SQLERRM
      );
  END;
  
  -- Compute simulated score with modified features
  weighted_result := public.apply_weights(modified_features, p_model_id);
  raw_score := (weighted_result->>'raw_score')::NUMERIC;
  normalized_score := public.normalize_score(raw_score, p_model_id);
  risk_band_info := public.get_risk_band(normalized_score, p_model_id);
  
  -- Build simulation result
  simulated_score_result := jsonb_build_object(
    'simulation_id', simulation_id,
    'persona_id', p_persona_id,
    'model_id', p_model_id,
    'simulation_timestamp', now(),
    
    -- Original vs Simulated comparison
    'original', original_score_result,
    'simulated', jsonb_build_object(
      'features', modified_features,
      'weighted_result', weighted_result,
      'raw_score', raw_score,
      'normalized_score', normalized_score,
      'risk_band', risk_band_info
    ),
    
    -- Applied overrides for audit trail
    'feature_overrides', p_feature_overrides,
    'overrides_applied', jsonb_object_length(p_feature_overrides),
    
    -- Impact analysis
    'impact_analysis', jsonb_build_object(
      'score_change', normalized_score - COALESCE((original_score_result->>'normalized_score')::INTEGER, 0),
      'band_change', jsonb_build_object(
        'from', original_score_result->'risk_band'->>'band',
        'to', risk_band_info->>'band'
      ),
      'risk_level_change', CASE 
        WHEN (original_score_result->'risk_band'->>'band') = (risk_band_info->>'band') THEN 'NO_CHANGE'
        WHEN (original_score_result->'risk_band'->>'band') < (risk_band_info->>'band') THEN 'IMPROVED'
        ELSE 'DEGRADED'
      END
    ),
    
    -- Simulation metadata
    'simulation_metadata', jsonb_build_object(
      'is_simulation', true,
      'persisted', false,
      'computation_method', 'scenario_simulation',
      'feature_version', '1.0'
    )
  );
  
  -- Create audit log entry for simulation (if audit system exists)
  BEGIN
    INSERT INTO audit_logs (
      persona_id, 
      action, 
      details, 
      created_at
    ) VALUES (
      p_persona_id,
      'CREDIT_SCORE_SIMULATED',
      jsonb_build_object(
        'simulation_id', simulation_id,
        'model_id', p_model_id,
        'original_score', COALESCE((original_score_result->>'normalized_score')::INTEGER, 0),
        'simulated_score', normalized_score,
        'feature_overrides', p_feature_overrides,
        'risk_band_change', simulated_score_result->'impact_analysis'->'band_change'
      ),
      now()
    ) RETURNING id INTO audit_log_id;
    
    simulated_score_result := simulated_score_result || jsonb_build_object(
      'audit_log_id', audit_log_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue if audit logging fails
      simulated_score_result := simulated_score_result || jsonb_build_object(
        'audit_log_id', NULL,
        'audit_warning', 'Could not create audit log: ' || SQLERRM
      );
  END;
  
  RETURN simulated_score_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error simulating credit score for persona % with model %: %', p_persona_id, p_model_id, SQLERRM;
END;
$$;

-- Historical score trend analysis function
CREATE OR REPLACE FUNCTION public.get_score_trend(
  p_persona_id UUID,
  p_model_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE(month DATE, avg_score NUMERIC, score_count INTEGER)
SECURITY INVOKER
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', computed_at)::DATE AS month,
    AVG(score)::NUMERIC AS avg_score,
    COUNT(*)::INTEGER AS score_count
  FROM credit_scores
  WHERE persona_id = p_persona_id
    AND model_id = p_model_id
    AND computed_at > now() - (p_months || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', computed_at)
  ORDER BY month DESC;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error retrieving score trend for persona % with model %: %', p_persona_id, p_model_id, SQLERRM;
END;
$$;

-- Batch simulation for multiple scenarios
CREATE OR REPLACE FUNCTION public.simulate_multiple_scenarios(
  p_persona_id UUID,
  p_model_id UUID,
  p_scenario_overrides JSONB
)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  scenario_name TEXT;
  scenario_overrides JSONB;
  scenario_result JSONB;
  all_results JSONB := '{}';
  batch_id UUID;
BEGIN
  batch_id := gen_random_uuid();
  
  -- Process each scenario
  FOR scenario_name, scenario_overrides IN SELECT * FROM jsonb_each(p_scenario_overrides)
  LOOP
    BEGIN
      scenario_result := public.simulate_credit_score(
        p_persona_id, 
        p_model_id, 
        scenario_overrides
      );
      
      all_results := all_results || jsonb_build_object(
        scenario_name, 
        scenario_result || jsonb_build_object('scenario_name', scenario_name)
      );
    EXCEPTION
      WHEN OTHERS THEN
        all_results := all_results || jsonb_build_object(
          scenario_name,
          jsonb_build_object(
            'error', 'Scenario simulation failed: ' || SQLERRM,
            'scenario_name', scenario_name
          )
        );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'batch_id', batch_id,
    'persona_id', p_persona_id,
    'model_id', p_model_id,
    'batch_timestamp', now(),
    'scenarios_processed', jsonb_object_length(p_scenario_overrides),
    'results', all_results
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error processing batch simulation for persona % with model %: %', p_persona_id, p_model_id, SQLERRM;
END;
$$;

-- Add function comments for documentation
COMMENT ON FUNCTION public.simulate_credit_score(UUID, UUID, JSONB) IS 'Simulate credit score with feature overrides without persistence';
COMMENT ON FUNCTION public.get_score_trend(UUID, UUID, INTEGER) IS 'Get historical score trends for a persona over specified months';
COMMENT ON FUNCTION public.simulate_multiple_scenarios(UUID, UUID, JSONB) IS 'Run multiple simulation scenarios in batch for comparative analysis';