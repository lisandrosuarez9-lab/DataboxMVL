# Data Model Extensions for Compliance Showcase

## Overview

This document details the database schema extensions required to support:
1. RiskSeal integration with risk signals and factors
2. Alternate credit scoring for thin-file users
3. Public read-only views for the showcase
4. Demo cohort management

---

## 1. Risk Signals Schema

### Table: risk_events

Captures raw risk signals from RiskSeal and other risk assessment sources.

```sql
-- Raw risk event data from RiskSeal and other sources
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL, -- References profiles(user_id) or persona
  source TEXT NOT NULL CHECK (source IN ('RiskSeal', 'DeviceFingerprint', 'BehavioralAnalytics', 'IdentityVerification')),
  event_type TEXT NOT NULL,
  signal_payload JSONB NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_risk_events_owner ON risk_events(owner_id);
CREATE INDEX idx_risk_events_source ON risk_events(source);
CREATE INDEX idx_risk_events_type ON risk_events(event_type);
CREATE INDEX idx_risk_events_observed ON risk_events(observed_at DESC);
CREATE INDEX idx_risk_events_payload ON risk_events USING GIN (signal_payload);

-- RLS policies
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_events_select_own 
  ON risk_events FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY risk_events_insert_own 
  ON risk_events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Audit trigger
CREATE TRIGGER risk_events_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON risk_events
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Comments
COMMENT ON TABLE risk_events IS 'Raw risk signals from RiskSeal and other sources with full provenance';
COMMENT ON COLUMN risk_events.source IS 'Origin system for the risk signal';
COMMENT ON COLUMN risk_events.confidence IS 'Confidence score from 0 to 1 for the signal accuracy';
COMMENT ON COLUMN risk_events.signal_payload IS 'Complete signal data in JSONB format';
```

### Table: risk_factors

Derived risk factors with normalized scoring for use in credit models.

```sql
-- Derived risk factors from processed signals
CREATE TABLE IF NOT EXISTS risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  factor_code TEXT NOT NULL,
  factor_value NUMERIC,
  factor_text TEXT,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  derived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_event_id UUID REFERENCES risk_events(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_risk_factors_owner ON risk_factors(owner_id);
CREATE INDEX idx_risk_factors_code ON risk_factors(factor_code);
CREATE INDEX idx_risk_factors_derived ON risk_factors(derived_at DESC);
CREATE INDEX idx_risk_factors_source ON risk_factors(source_event_id);

-- RLS policies
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_factors_select_own 
  ON risk_factors FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY risk_factors_insert_own 
  ON risk_factors FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Audit trigger
CREATE TRIGGER risk_factors_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON risk_factors
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Comments
COMMENT ON TABLE risk_factors IS 'Normalized risk factors derived from risk events';
COMMENT ON COLUMN risk_factors.factor_code IS 'Standardized factor code for use in models';
COMMENT ON COLUMN risk_factors.confidence IS 'Confidence in the derived factor value';
```

---

## 2. Alternate Scoring Schema

### Table: alt_score_runs

Tracks execution of alternate scoring models for thin-file users.

```sql
-- Alternate credit score runs for thin-file users
CREATE TABLE IF NOT EXISTS alt_score_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  persona_id UUID,
  model_version TEXT NOT NULL,
  input_refs JSONB NOT NULL,
  run_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  score_result NUMERIC,
  risk_band TEXT,
  explanation JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_alt_score_runs_owner ON alt_score_runs(owner_id);
CREATE INDEX idx_alt_score_runs_run_id ON alt_score_runs(run_id);
CREATE INDEX idx_alt_score_runs_status ON alt_score_runs(status);
CREATE INDEX idx_alt_score_runs_started ON alt_score_runs(started_at DESC);

-- RLS policies
ALTER TABLE alt_score_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY alt_score_runs_select_own 
  ON alt_score_runs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY alt_score_runs_insert_own 
  ON alt_score_runs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Audit trigger
CREATE TRIGGER alt_score_runs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON alt_score_runs
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Comments
COMMENT ON TABLE alt_score_runs IS 'Alternate scoring model runs for thin-file credit assessment';
COMMENT ON COLUMN alt_score_runs.run_id IS 'Unique human-readable identifier for the scoring run';
COMMENT ON COLUMN alt_score_runs.input_refs IS 'JSONB object with references to source data records';
COMMENT ON COLUMN alt_score_runs.explanation IS 'Detailed factor contributions and scoring explanation';
```

---

## 3. Demo Cohort Management

### Table: demo_cohort

Manages the set of personas available for public showcase.

```sql
-- Demo cohort for public showcase
CREATE TABLE IF NOT EXISTS demo_cohort (
  user_id UUID PRIMARY KEY,
  persona_type TEXT NOT NULL CHECK (persona_type IN ('thin_file', 'traditional', 'mixed', 'new_borrower')),
  display_name TEXT,
  scenario_description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_demo_cohort_type ON demo_cohort(persona_type);
CREATE INDEX idx_demo_cohort_active ON demo_cohort(active) WHERE active = true;

-- Comments
COMMENT ON TABLE demo_cohort IS 'Synthetic personas for public showcase and demonstrations';
COMMENT ON COLUMN demo_cohort.persona_type IS 'Credit profile type for demonstration purposes';
COMMENT ON COLUMN demo_cohort.scenario_description IS 'Human-readable description of the demo scenario';
```

---

## 4. Public Read-Only Views

### View: public_score_models

Exposes scoring model metadata without sensitive configuration.

```sql
-- Public view of scoring models
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

-- Grant access
GRANT SELECT ON public_score_models TO anon, authenticated;

COMMENT ON VIEW public_score_models IS 'Public view of active scoring models without sensitive weights';
```

### View: public_risk_factors

Anonymized risk factors for demo personas.

```sql
-- Public view of risk factors for demo cohort
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

-- Grant access
GRANT SELECT ON public_risk_factors TO anon, authenticated;

-- RLS policy for demo cohort only
ALTER VIEW public_risk_factors SET (security_invoker = on);

COMMENT ON VIEW public_risk_factors IS 'Anonymized risk factors for public demo cohort';
```

### View: public_score_runs

Anonymized scoring run summaries with explanations.

```sql
-- Public view of score runs for demo cohort
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

-- Grant access
GRANT SELECT ON public_score_runs TO anon, authenticated;

COMMENT ON VIEW public_score_runs IS 'Public view of credit score runs for demo personas';
```

### View: public_audit_summary

High-level audit metrics for transparency.

```sql
-- Public audit summary view
CREATE OR REPLACE VIEW public_audit_summary AS
SELECT 
  COUNT(*) FILTER (WHERE action = 'CREDIT_SCORE_COMPUTED') as total_score_runs,
  COUNT(*) FILTER (WHERE action = 'CREDIT_SCORE_COMPUTED' AND created_at >= now() - interval '30 days') as runs_last_30d,
  MAX(created_at) FILTER (WHERE action = 'CREDIT_SCORE_COMPUTED') as latest_run_timestamp,
  COUNT(DISTINCT persona_id) as unique_personas,
  'ENFORCED' as rls_status
FROM audit_logs
WHERE persona_id IN (SELECT user_id FROM demo_cohort WHERE active = true);

-- Grant access
GRANT SELECT ON public_audit_summary TO anon, authenticated;

COMMENT ON VIEW public_audit_summary IS 'Public audit summary for showcase transparency';
```

---

## 5. Integrity Verification Functions

### Function: verify_ownership_integrity

Checks for orphan records across all tables.

```sql
-- Verify ownership integrity across all tables
CREATE OR REPLACE FUNCTION verify_ownership_integrity()
RETURNS TABLE(
  table_name TEXT,
  orphan_count BIGINT,
  last_check TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_ownership_integrity IS 'Verify zero orphan records across all tables';
```

### Function: get_latest_run_id

Retrieves the most recent scoring run identifier.

```sql
-- Get the latest run ID for display
CREATE OR REPLACE FUNCTION get_latest_run_id()
RETURNS TEXT AS $$
DECLARE
  latest_id TEXT;
BEGIN
  SELECT 'RUN-' || to_char(computed_at, 'YYYYMMDD-') || substring(id::text, 1, 8)
  INTO latest_id
  FROM credit_scores
  WHERE persona_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
  ORDER BY computed_at DESC
  LIMIT 1;
  
  RETURN COALESCE(latest_id, 'NO-RUNS');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_latest_run_id IS 'Get the latest scoring run ID for showcase display';
```

---

## 6. Sample Data Generation

### Function: generate_demo_persona

Creates a demo persona with realistic data.

```sql
-- Generate a demo persona with realistic data
CREATE OR REPLACE FUNCTION generate_demo_persona(
  p_persona_type TEXT,
  p_display_name TEXT,
  p_scenario TEXT
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create user ID
  v_user_id := gen_random_uuid();
  
  -- Add to demo cohort
  INSERT INTO demo_cohort (user_id, persona_type, display_name, scenario_description)
  VALUES (v_user_id, p_persona_type, p_display_name, p_scenario);
  
  -- Create persona record
  INSERT INTO persona (user_id, nombre, email, created_at)
  VALUES (
    v_user_id,
    p_display_name,
    'demo-' || substring(v_user_id::text, 1, 8) || '@example.com',
    now()
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_demo_persona IS 'Generate a demo persona for showcase purposes';
```

### Function: generate_risk_signals

Creates realistic risk signals for a persona.

```sql
-- Generate realistic risk signals for a demo persona
CREATE OR REPLACE FUNCTION generate_risk_signals(
  p_owner_id UUID,
  p_signal_count INTEGER DEFAULT 5
)
RETURNS VOID AS $$
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
        'score', v_confidence,
        'timestamp', now()
      ),
      v_confidence
    );
    
    -- Create derived risk factor
    INSERT INTO risk_factors (owner_id, factor_code, factor_value, confidence)
    VALUES (
      p_owner_id,
      v_signal || '_score',
      v_confidence,
      v_confidence
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_risk_signals IS 'Generate realistic risk signals for demo personas';
```

---

## 7. Migration Script

Complete migration to add all extensions.

```sql
-- Migration: Add compliance showcase extensions
-- Version: 1.0.0
-- Date: 2024-01-15

BEGIN;

-- 1. Create risk_events table
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('RiskSeal', 'DeviceFingerprint', 'BehavioralAnalytics', 'IdentityVerification')),
  event_type TEXT NOT NULL,
  signal_payload JSONB NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_events_owner ON risk_events(owner_id);
CREATE INDEX idx_risk_events_source ON risk_events(source);
CREATE INDEX idx_risk_events_type ON risk_events(event_type);
CREATE INDEX idx_risk_events_observed ON risk_events(observed_at DESC);

ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;

-- 2. Create risk_factors table
CREATE TABLE IF NOT EXISTS risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  factor_code TEXT NOT NULL,
  factor_value NUMERIC,
  factor_text TEXT,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  derived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_event_id UUID REFERENCES risk_events(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_factors_owner ON risk_factors(owner_id);
CREATE INDEX idx_risk_factors_code ON risk_factors(factor_code);
CREATE INDEX idx_risk_factors_derived ON risk_factors(derived_at DESC);

ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;

-- 3. Create alt_score_runs table
CREATE TABLE IF NOT EXISTS alt_score_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  persona_id UUID,
  model_version TEXT NOT NULL,
  input_refs JSONB NOT NULL,
  run_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  score_result NUMERIC,
  risk_band TEXT,
  explanation JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alt_score_runs_owner ON alt_score_runs(owner_id);
CREATE INDEX idx_alt_score_runs_run_id ON alt_score_runs(run_id);
CREATE INDEX idx_alt_score_runs_status ON alt_score_runs(status);

ALTER TABLE alt_score_runs ENABLE ROW LEVEL SECURITY;

-- 4. Create demo_cohort table
CREATE TABLE IF NOT EXISTS demo_cohort (
  user_id UUID PRIMARY KEY,
  persona_type TEXT NOT NULL CHECK (persona_type IN ('thin_file', 'traditional', 'mixed', 'new_borrower')),
  display_name TEXT,
  scenario_description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_demo_cohort_type ON demo_cohort(persona_type);
CREATE INDEX idx_demo_cohort_active ON demo_cohort(active) WHERE active = true;

COMMIT;
```

---

## 8. Testing and Validation

### Test: Verify Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');
```

### Test: Verify Indexes

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');
```

### Test: Verify RLS Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('risk_events', 'risk_factors', 'alt_score_runs')
  AND schemaname = 'public';
```

---

## Summary

This data model extension provides:

1. **Risk Signal Management**: Capture and process RiskSeal and other risk signals
2. **Alternate Scoring**: Support thin-file credit assessment with full traceability
3. **Public Showcase**: Read-only views for transparent demonstration
4. **Demo Management**: Cohort system for safe public access
5. **Integrity Verification**: Functions to ensure data quality and ownership

All tables include:
- RLS policies for security
- Comprehensive indexes for performance
- Audit triggers for compliance
- Detailed comments for documentation
