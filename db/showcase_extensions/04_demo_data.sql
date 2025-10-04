-- Demo Data Generation Script for Showcase
-- Version: 1.0.0
-- Purpose: Generate 10-15 demo personas with associated financial data and risk signals

-- ============================================================================
-- 1. INSERT DEMO PERSONAS
-- ============================================================================

-- Insert demo personas with varied profiles
INSERT INTO demo_cohort (user_id, persona_type, display_name, scenario_description, active) VALUES
  -- Thin-file users
  (gen_random_uuid(), 'thin_file', 'Ana Martinez - Remittance Receiver', 'Regular remittance receiver with limited traditional credit history, demonstrating alternate scoring potential', true),
  (gen_random_uuid(), 'thin_file', 'Carlos Lopez - Microcredit Borrower', 'Active microcredit borrower with excellent repayment history but no bank credit', true),
  (gen_random_uuid(), 'thin_file', 'Maria Rodriguez - New to Credit', 'Recent graduate with consistent income but no established credit history', true),
  
  -- Traditional users
  (gen_random_uuid(), 'traditional', 'Juan Perez - Bank Customer', 'Established bank customer with credit card and loan history', true),
  (gen_random_uuid(), 'traditional', 'Sofia Garcia - Mortgage Holder', 'Homeowner with mortgage and multiple credit accounts', true),
  
  -- Mixed profile users
  (gen_random_uuid(), 'mixed', 'Diego Fernandez - Hybrid Profile', 'Combines traditional banking with remittances and microcredit', true),
  (gen_random_uuid(), 'mixed', 'Isabella Santos - Freelancer', 'Freelancer with irregular income but strong payment history', true),
  (gen_random_uuid(), 'mixed', 'Miguel Torres - Small Business Owner', 'Small business owner mixing personal and business finances', true),
  
  -- New borrowers
  (gen_random_uuid(), 'new_borrower', 'Valentina Ruiz - First Time Borrower', 'First-time credit seeker with strong utility payment history', true),
  (gen_random_uuid(), 'new_borrower', 'Lucas Morales - Student', 'University student with part-time income and family support', true),
  
  -- Additional thin-file users
  (gen_random_uuid(), 'thin_file', 'Camila Jimenez - Gig Worker', 'Gig economy worker with consistent platform earnings', true),
  (gen_random_uuid(), 'thin_file', 'Sebastian Vargas - Informal Sector', 'Informal sector worker with mobile money usage', true),
  (gen_random_uuid(), 'thin_file', 'Daniela Castro - Rural Resident', 'Rural resident with agricultural income and community ties', true);

-- Store persona IDs for reference
CREATE TEMP TABLE temp_demo_personas AS
SELECT user_id, persona_type, display_name FROM demo_cohort WHERE active = true;

-- ============================================================================
-- 2. GENERATE RISK EVENTS (RiskSeal Signals)
-- ============================================================================

-- Insert risk events for each demo persona
DO $$
DECLARE
  persona RECORD;
  event_count INT;
  i INT;
BEGIN
  FOR persona IN SELECT user_id, persona_type FROM temp_demo_personas LOOP
    -- Determine number of events based on persona type
    event_count := CASE 
      WHEN persona.persona_type IN ('traditional', 'mixed') THEN 8 + floor(random() * 5)::int
      ELSE 4 + floor(random() * 4)::int
    END;
    
    FOR i IN 1..event_count LOOP
      -- Device consistency check
      IF random() > 0.3 THEN
        INSERT INTO risk_events (owner_id, source, event_type, signal_payload, confidence, observed_at)
        VALUES (
          persona.user_id,
          'RiskSeal',
          'device_consistency_check',
          jsonb_build_object(
            'device_id', 'dev_' || substr(md5(random()::text), 1, 12),
            'match_score', 0.75 + (random() * 0.24),
            'anomaly_flags', '[]'::jsonb
          ),
          0.85 + (random() * 0.14),
          now() - (random() * interval '90 days')
        );
      END IF;
      
      -- Identity verification
      IF random() > 0.4 THEN
        INSERT INTO risk_events (owner_id, source, event_type, signal_payload, confidence, observed_at)
        VALUES (
          persona.user_id,
          'IdentityVerification',
          'identity_match',
          jsonb_build_object(
            'match_score', 0.80 + (random() * 0.19),
            'verification_level', CASE WHEN random() > 0.5 THEN 'high' ELSE 'medium' END
          ),
          0.88 + (random() * 0.11),
          now() - (random() * interval '60 days')
        );
      END IF;
      
      -- Behavioral analytics
      IF random() > 0.5 THEN
        INSERT INTO risk_events (owner_id, source, event_type, signal_payload, confidence, observed_at)
        VALUES (
          persona.user_id,
          'BehavioralAnalytics',
          'transaction_pattern_analysis',
          jsonb_build_object(
            'pattern_consistency', 0.70 + (random() * 0.29),
            'anomaly_score', random() * 0.2
          ),
          0.80 + (random() * 0.15),
          now() - (random() * interval '45 days')
        );
      END IF;
      
      -- Fraud check
      IF random() > 0.6 THEN
        INSERT INTO risk_events (owner_id, source, event_type, signal_payload, confidence, observed_at)
        VALUES (
          persona.user_id,
          'RiskSeal',
          'fraud_check',
          jsonb_build_object(
            'fraud_score', random() * 0.15,
            'risk_level', 'low'
          ),
          0.93 + (random() * 0.06),
          now() - (random() * interval '30 days')
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- 3. DERIVE RISK FACTORS FROM EVENTS
-- ============================================================================

-- Create risk factors from events
INSERT INTO risk_factors (owner_id, factor_code, factor_value, confidence, derived_at, source_event_id)
SELECT 
  re.owner_id,
  CASE re.event_type
    WHEN 'device_consistency_check' THEN 'device_consistency'
    WHEN 'identity_match' THEN 'identity_match_score'
    WHEN 'transaction_pattern_analysis' THEN 'behavior_consistency'
    WHEN 'fraud_check' THEN 'fraud_risk'
    ELSE 'unknown_factor'
  END as factor_code,
  CASE re.event_type
    WHEN 'device_consistency_check' THEN (re.signal_payload->>'match_score')::numeric
    WHEN 'identity_match' THEN (re.signal_payload->>'match_score')::numeric
    WHEN 'transaction_pattern_analysis' THEN (re.signal_payload->>'pattern_consistency')::numeric
    WHEN 'fraud_check' THEN (re.signal_payload->>'fraud_score')::numeric
    ELSE 0.5
  END as factor_value,
  re.confidence,
  re.observed_at + interval '1 hour' as derived_at,
  re.id as source_event_id
FROM risk_events re
WHERE re.owner_id IN (SELECT user_id FROM temp_demo_personas);

-- ============================================================================
-- 4. GENERATE ALTERNATE SCORE RUNS
-- ============================================================================

-- Create alternate score runs for thin-file and new borrower personas
INSERT INTO alt_score_runs (
  owner_id,
  persona_id,
  model_version,
  input_refs,
  run_id,
  started_at,
  finished_at,
  status,
  score_result,
  risk_band,
  explanation
)
SELECT 
  tdp.user_id,
  tdp.user_id as persona_id,
  'alt-credit-v2.1' as model_version,
  jsonb_build_object(
    'remittance_count', floor(random() * 24)::int,
    'utility_payment_count', floor(random() * 36)::int,
    'microcredit_count', floor(random() * 6)::int
  ) as input_refs,
  'ALT-RUN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)) as run_id,
  now() - interval '1 day' as started_at,
  now() - interval '1 day' + interval '5 minutes' as finished_at,
  'completed' as status,
  550 + floor(random() * 250)::numeric as score_result,
  CASE 
    WHEN random() > 0.8 THEN 'EXCELLENT'
    WHEN random() > 0.5 THEN 'GOOD'
    WHEN random() > 0.2 THEN 'MODERATE'
    ELSE 'FAIR'
  END as risk_band,
  jsonb_build_object(
    'factors', jsonb_build_array(
      jsonb_build_object(
        'factor', 'remittance_regularity',
        'weight', 0.30,
        'value', 0.80 + (random() * 0.19),
        'contribution', (0.30 * (0.80 + (random() * 0.19)))::numeric(5,4),
        'confidence', 0.90 + (random() * 0.09)
      ),
      jsonb_build_object(
        'factor', 'utility_payment_consistency',
        'weight', 0.20,
        'value', 0.75 + (random() * 0.24),
        'contribution', (0.20 * (0.75 + (random() * 0.24)))::numeric(5,4),
        'confidence', 0.88 + (random() * 0.11)
      )
    ),
    'methodology', 'thin-file alternate scoring using behavioral and payment data'
  ) as explanation
FROM temp_demo_personas tdp
WHERE tdp.persona_type IN ('thin_file', 'new_borrower');

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Verify demo personas created
SELECT 
  persona_type,
  COUNT(*) as count
FROM demo_cohort
WHERE active = true
GROUP BY persona_type
ORDER BY persona_type;

-- Verify risk events generated
SELECT 
  COUNT(*) as total_risk_events,
  COUNT(DISTINCT owner_id) as personas_with_events
FROM risk_events
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true);

-- Verify risk factors derived
SELECT 
  factor_code,
  COUNT(*) as count,
  ROUND(AVG(confidence)::numeric, 3) as avg_confidence
FROM risk_factors
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
GROUP BY factor_code
ORDER BY count DESC;

-- Verify alternate score runs
SELECT 
  status,
  risk_band,
  COUNT(*) as count
FROM alt_score_runs
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
GROUP BY status, risk_band
ORDER BY status, risk_band;

-- Summary report
SELECT 
  'Demo Personas' as metric,
  COUNT(*)::text as value
FROM demo_cohort WHERE active = true
UNION ALL
SELECT 
  'Risk Events' as metric,
  COUNT(*)::text as value
FROM risk_events
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
UNION ALL
SELECT 
  'Risk Factors' as metric,
  COUNT(*)::text as value
FROM risk_factors
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
UNION ALL
SELECT 
  'Alt Score Runs' as metric,
  COUNT(*)::text as value
FROM alt_score_runs
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true);

-- Clean up temp table
DROP TABLE IF EXISTS temp_demo_personas;
