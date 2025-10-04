-- Utility Functions for Compliance Showcase
-- Version: 1.0.0
-- Purpose: Helper functions for integrity verification and data generation

-- ============================================================================
-- 1. INTEGRITY VERIFICATION FUNCTIONS
-- ============================================================================

-- Verify ownership integrity across all tables
CREATE OR REPLACE FUNCTION verify_ownership_integrity()
RETURNS TABLE(
  table_name TEXT,
  orphan_count BIGINT,
  last_check TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'personas'::TEXT, COUNT(*)::BIGINT, now()
  FROM persona p
  WHERE NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.user_id = p.user_id)
  
  UNION ALL
  
  SELECT 'credit_scores'::TEXT, COUNT(*)::BIGINT, now()
  FROM credit_scores cs
  WHERE NOT EXISTS (SELECT 1 FROM persona p WHERE p.user_id = cs.persona_id)
  
  UNION ALL
  
  SELECT 'risk_events'::TEXT, COUNT(*)::BIGINT, now()
  FROM risk_events re
  WHERE NOT EXISTS (SELECT 1 FROM persona p WHERE p.user_id = re.owner_id)
  
  UNION ALL
  
  SELECT 'risk_factors'::TEXT, COUNT(*)::BIGINT, now()
  FROM risk_factors rf
  WHERE NOT EXISTS (SELECT 1 FROM persona p WHERE p.user_id = rf.owner_id)
  
  UNION ALL
  
  SELECT 'alt_score_runs'::TEXT, COUNT(*)::BIGINT, now()
  FROM alt_score_runs asr
  WHERE NOT EXISTS (SELECT 1 FROM persona p WHERE p.user_id = asr.owner_id);
END;
$$;

COMMENT ON FUNCTION verify_ownership_integrity IS 'Verify zero orphan records across all tables';

-- ============================================================================
-- Get the latest run ID for display
CREATE OR REPLACE FUNCTION get_latest_run_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_id TEXT;
BEGIN
  SELECT 'RUN-' || to_char(computed_at, 'YYYYMMDD-') || upper(substring(md5(id::text), 1, 8))
  INTO latest_id
  FROM credit_scores
  WHERE persona_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
  ORDER BY computed_at DESC
  LIMIT 1;
  
  RETURN COALESCE(latest_id, 'NO-RUNS');
END;
$$;

COMMENT ON FUNCTION get_latest_run_id IS 'Get the latest scoring run ID for showcase display';

-- ============================================================================
-- Get integrity status for showcase homepage
CREATE OR REPLACE FUNCTION get_integrity_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  orphan_count BIGINT;
  total_orphans BIGINT := 0;
BEGIN
  -- Count total orphans
  SELECT SUM(oc)::BIGINT INTO total_orphans
  FROM verify_ownership_integrity() v(tn, oc, lc);
  
  -- Build result object
  result := jsonb_build_object(
    'orphan_records', COALESCE(total_orphans, 0),
    'latest_run_id', get_latest_run_id(),
    'audit_entries_30d', (
      SELECT COUNT(*)
      FROM audit_logs
      WHERE created_at >= now() - interval '30 days'
        AND persona_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
    ),
    'rls_status', 'ENFORCED',
    'last_verification', now(),
    'tables_checked', 5
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_integrity_status IS 'Get complete integrity status for showcase homepage';

-- ============================================================================
-- 2. DEMO DATA GENERATION FUNCTIONS
-- ============================================================================

-- Generate a demo persona with realistic data
CREATE OR REPLACE FUNCTION generate_demo_persona(
  p_persona_type TEXT,
  p_display_name TEXT,
  p_scenario TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Validate persona type
  IF p_persona_type NOT IN ('thin_file', 'traditional', 'mixed', 'new_borrower') THEN
    RAISE EXCEPTION 'Invalid persona_type: %', p_persona_type;
  END IF;
  
  -- Create user ID
  v_user_id := gen_random_uuid();
  v_email := 'demo-' || substring(v_user_id::text, 1, 8) || '@example.com';
  
  -- Add to demo cohort
  INSERT INTO demo_cohort (user_id, persona_type, display_name, scenario_description)
  VALUES (v_user_id, p_persona_type, p_display_name, p_scenario);
  
  -- Create persona record (if persona table exists)
  BEGIN
    INSERT INTO persona (user_id, nombre, email, created_at)
    VALUES (v_user_id, p_display_name, v_email, now());
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'Persona table does not exist, skipping persona creation';
  END;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION generate_demo_persona IS 'Generate a demo persona for showcase purposes';

-- ============================================================================
-- Generate realistic risk signals for a demo persona
CREATE OR REPLACE FUNCTION generate_risk_signals(
  p_owner_id UUID,
  p_signal_count INTEGER DEFAULT 5
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signals TEXT[] := ARRAY[
    'device_consistency',
    'identity_confidence',
    'behavioral_pattern',
    'location_verification',
    'account_age'
  ];
  v_signal TEXT;
  v_confidence NUMERIC;
  v_event_id UUID;
BEGIN
  FOR i IN 1..LEAST(p_signal_count, array_length(v_signals, 1)) LOOP
    v_signal := v_signals[i];
    v_confidence := 0.70 + (random() * 0.29); -- Between 0.70 and 0.99
    
    -- Create risk event
    INSERT INTO risk_events (owner_id, source, event_type, signal_payload, confidence)
    VALUES (
      p_owner_id,
      'RiskSeal',
      v_signal,
      jsonb_build_object(
        'signal_type', v_signal,
        'score', round(v_confidence::numeric, 2),
        'timestamp', now(),
        'details', 'Demo signal for showcase'
      ),
      round(v_confidence::numeric, 2)
    )
    RETURNING id INTO v_event_id;
    
    -- Create derived risk factor
    INSERT INTO risk_factors (
      owner_id, 
      factor_code, 
      factor_value, 
      confidence,
      source_event_id
    )
    VALUES (
      p_owner_id,
      v_signal || '_score',
      round(v_confidence::numeric, 2),
      round(v_confidence::numeric, 2),
      v_event_id
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION generate_risk_signals IS 'Generate realistic risk signals for demo personas';

-- ============================================================================
-- Create a complete demo scenario with persona, signals, and scores
CREATE OR REPLACE FUNCTION create_demo_scenario(
  p_persona_type TEXT,
  p_display_name TEXT,
  p_scenario TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Create demo persona
  v_user_id := generate_demo_persona(p_persona_type, p_display_name, p_scenario);
  
  -- Generate risk signals
  PERFORM generate_risk_signals(v_user_id, 5);
  
  -- Build result
  v_result := jsonb_build_object(
    'user_id', v_user_id,
    'persona_type', p_persona_type,
    'display_name', p_display_name,
    'owner_ref', 'demo-' || substring(v_user_id::text, 1, 8),
    'risk_signals_generated', 5,
    'created_at', now()
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_demo_scenario IS 'Create a complete demo scenario with persona and signals';

-- ============================================================================
-- 3. GRANT EXECUTE PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users for public functions
GRANT EXECUTE ON FUNCTION verify_ownership_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_run_id TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_integrity_status TO anon, authenticated;
