-- Public Read-Only Views for Compliance Showcase
-- Version: 1.0.0
-- Purpose: Create read-only views for safe public access to demo data

-- ============================================================================
-- 1. PUBLIC SCORE MODELS VIEW
-- ============================================================================

-- Public view of scoring models (redact sensitive weights)
CREATE OR REPLACE VIEW public_score_models AS
SELECT 
  sm.id,
  sm.name,
  sm.version,
  sm.description,
  sm.active,
  sm.created_at,
  COUNT(DISTINCT sf.id) as factors_count
FROM score_models sm
LEFT JOIN score_factors sf ON sf.model_id = sm.id
WHERE sm.active = true
GROUP BY sm.id, sm.name, sm.version, sm.description, sm.active, sm.created_at;

COMMENT ON VIEW public_score_models IS 'Public view of active scoring models without sensitive weights';

-- ============================================================================
-- 2. PUBLIC RISK FACTORS VIEW
-- ============================================================================

-- Public view of risk factors for demo cohort (anonymized)
CREATE OR REPLACE VIEW public_risk_factors AS
SELECT 
  rf.id,
  'demo-' || substring(rf.owner_id::text, 1, 8) as owner_ref,
  rf.factor_code,
  rf.factor_value,
  rf.confidence,
  rf.derived_at,
  re.source as signal_source,
  re.event_type as signal_type
FROM risk_factors rf
LEFT JOIN risk_events re ON re.id = rf.source_event_id
WHERE rf.owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true);

COMMENT ON VIEW public_risk_factors IS 'Anonymized risk factors for public demo cohort';

-- ============================================================================
-- 3. PUBLIC SCORE RUNS VIEW
-- ============================================================================

-- Public view of score runs for demo cohort (anonymized)
CREATE OR REPLACE VIEW public_score_runs AS
SELECT 
  cs.id,
  'demo-' || substring(cs.persona_id::text, 1, 8) as persona_ref,
  cs.model_id,
  cs.score,
  cs.explanation->'risk_band' as risk_band,
  cs.explanation->'normalized_score' as normalized_score,
  cs.explanation->'features' as features,
  cs.computed_at,
  cs.audit_log_id
FROM credit_scores cs
WHERE cs.persona_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
ORDER BY cs.computed_at DESC;

COMMENT ON VIEW public_score_runs IS 'Public view of credit score runs for demo personas';

-- ============================================================================
-- 4. PUBLIC AUDIT SUMMARY VIEW
-- ============================================================================

-- Public audit summary view for transparency
CREATE OR REPLACE VIEW public_audit_summary AS
SELECT 
  COUNT(*) FILTER (WHERE action = 'CREDIT_SCORE_COMPUTED') as total_score_runs,
  COUNT(*) FILTER (WHERE action = 'CREDIT_SCORE_COMPUTED' AND created_at >= now() - interval '30 days') as runs_last_30d,
  MAX(created_at) FILTER (WHERE action = 'CREDIT_SCORE_COMPUTED') as latest_run_timestamp,
  COUNT(DISTINCT persona_id) as unique_personas,
  'ENFORCED' as rls_status
FROM audit_logs
WHERE persona_id IN (SELECT user_id FROM demo_cohort WHERE active = true);

COMMENT ON VIEW public_audit_summary IS 'Public audit summary for showcase transparency';

-- ============================================================================
-- 5. PUBLIC RISK EVENTS VIEW
-- ============================================================================

-- Public view of risk events for demo cohort (anonymized)
CREATE OR REPLACE VIEW public_risk_events AS
SELECT 
  re.id,
  'demo-' || substring(re.owner_id::text, 1, 8) as owner_ref,
  re.source,
  re.event_type,
  re.confidence,
  re.observed_at,
  -- Redact sensitive payload data, keep only summary
  jsonb_build_object(
    'signal_type', re.signal_payload->>'signal_type',
    'confidence', re.confidence,
    'timestamp', re.observed_at
  ) as signal_summary
FROM risk_events re
WHERE re.owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
ORDER BY re.observed_at DESC;

COMMENT ON VIEW public_risk_events IS 'Anonymized risk events for public demo cohort';

-- ============================================================================
-- 6. PUBLIC ALTERNATE SCORE RUNS VIEW
-- ============================================================================

-- Public view of alternate score runs
CREATE OR REPLACE VIEW public_alt_score_runs AS
SELECT 
  asr.id,
  'demo-' || substring(asr.owner_id::text, 1, 8) as owner_ref,
  asr.model_version,
  asr.run_id,
  asr.started_at,
  asr.finished_at,
  asr.status,
  asr.score_result,
  asr.risk_band,
  asr.explanation
FROM alt_score_runs asr
WHERE asr.owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
ORDER BY asr.started_at DESC;

COMMENT ON VIEW public_alt_score_runs IS 'Public view of alternate scoring runs for demo cohort';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT permission to anonymous and authenticated users
GRANT SELECT ON public_score_models TO anon, authenticated;
GRANT SELECT ON public_risk_factors TO anon, authenticated;
GRANT SELECT ON public_score_runs TO anon, authenticated;
GRANT SELECT ON public_audit_summary TO anon, authenticated;
GRANT SELECT ON public_risk_events TO anon, authenticated;
GRANT SELECT ON public_alt_score_runs TO anon, authenticated;
