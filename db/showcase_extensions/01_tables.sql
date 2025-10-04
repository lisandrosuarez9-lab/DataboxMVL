-- Compliance Showcase Database Extensions
-- Version: 1.0.0
-- Purpose: Add risk signals, alternate scoring, and public views for GitHub Pages showcase

-- ============================================================================
-- 1. RISK SIGNALS TABLES
-- ============================================================================

-- Raw risk event data from RiskSeal and other sources
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_events_owner ON risk_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_source ON risk_events(source);
CREATE INDEX IF NOT EXISTS idx_risk_events_type ON risk_events(event_type);
CREATE INDEX IF NOT EXISTS idx_risk_events_observed ON risk_events(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_payload ON risk_events USING GIN (signal_payload);

-- Comments
COMMENT ON TABLE risk_events IS 'Raw risk signals from RiskSeal and other sources with full provenance';
COMMENT ON COLUMN risk_events.source IS 'Origin system for the risk signal';
COMMENT ON COLUMN risk_events.confidence IS 'Confidence score from 0 to 1 for the signal accuracy';
COMMENT ON COLUMN risk_events.signal_payload IS 'Complete signal data in JSONB format';

-- ============================================================================
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
CREATE INDEX IF NOT EXISTS idx_risk_factors_owner ON risk_factors(owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_factors_code ON risk_factors(factor_code);
CREATE INDEX IF NOT EXISTS idx_risk_factors_derived ON risk_factors(derived_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_factors_source ON risk_factors(source_event_id);

-- Comments
COMMENT ON TABLE risk_factors IS 'Normalized risk factors derived from risk events';
COMMENT ON COLUMN risk_factors.factor_code IS 'Standardized factor code for use in models';
COMMENT ON COLUMN risk_factors.confidence IS 'Confidence in the derived factor value';

-- ============================================================================
-- 2. ALTERNATE SCORING TABLE
-- ============================================================================

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
CREATE INDEX IF NOT EXISTS idx_alt_score_runs_owner ON alt_score_runs(owner_id);
CREATE INDEX IF NOT EXISTS idx_alt_score_runs_run_id ON alt_score_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_alt_score_runs_status ON alt_score_runs(status);
CREATE INDEX IF NOT EXISTS idx_alt_score_runs_started ON alt_score_runs(started_at DESC);

-- Comments
COMMENT ON TABLE alt_score_runs IS 'Alternate scoring model runs for thin-file credit assessment';
COMMENT ON COLUMN alt_score_runs.run_id IS 'Unique human-readable identifier for the scoring run';
COMMENT ON COLUMN alt_score_runs.input_refs IS 'JSONB object with references to source data records';
COMMENT ON COLUMN alt_score_runs.explanation IS 'Detailed factor contributions and scoring explanation';

-- ============================================================================
-- 3. DEMO COHORT TABLE
-- ============================================================================

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demo_cohort_type ON demo_cohort(persona_type);
CREATE INDEX IF NOT EXISTS idx_demo_cohort_active ON demo_cohort(active) WHERE active = true;

-- Comments
COMMENT ON TABLE demo_cohort IS 'Synthetic personas for public showcase and demonstrations';
COMMENT ON COLUMN demo_cohort.persona_type IS 'Credit profile type for demonstration purposes';
COMMENT ON COLUMN demo_cohort.scenario_description IS 'Human-readable description of the demo scenario';

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE alt_score_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for risk_events
CREATE POLICY IF NOT EXISTS risk_events_select_own 
  ON risk_events FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
  );

CREATE POLICY IF NOT EXISTS risk_events_insert_own 
  ON risk_events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS policies for risk_factors
CREATE POLICY IF NOT EXISTS risk_factors_select_own 
  ON risk_factors FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
  );

CREATE POLICY IF NOT EXISTS risk_factors_insert_own 
  ON risk_factors FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS policies for alt_score_runs
CREATE POLICY IF NOT EXISTS alt_score_runs_select_own 
  ON alt_score_runs FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true)
  );

CREATE POLICY IF NOT EXISTS alt_score_runs_insert_own 
  ON alt_score_runs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- 5. AUDIT TRIGGERS (if log_audit_event function exists)
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_event') THEN
    -- Create triggers for new tables
    DROP TRIGGER IF EXISTS risk_events_audit_trigger ON risk_events;
    CREATE TRIGGER risk_events_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON risk_events
      FOR EACH ROW EXECUTE FUNCTION log_audit_event();
    
    DROP TRIGGER IF EXISTS risk_factors_audit_trigger ON risk_factors;
    CREATE TRIGGER risk_factors_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON risk_factors
      FOR EACH ROW EXECUTE FUNCTION log_audit_event();
    
    DROP TRIGGER IF EXISTS alt_score_runs_audit_trigger ON alt_score_runs;
    CREATE TRIGGER alt_score_runs_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON alt_score_runs
      FOR EACH ROW EXECUTE FUNCTION log_audit_event();
  END IF;
END $$;
