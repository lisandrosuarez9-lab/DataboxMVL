-- Core scoring tables with proper indexing and RLS enforcement
CREATE TABLE IF NOT EXISTS scoring_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS score_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES scoring_models(id) ON DELETE CASCADE,
  factor_key TEXT NOT NULL,
  weight DECIMAL NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_id, factor_key)
);

CREATE TABLE IF NOT EXISTS risk_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES scoring_models(id) ON DELETE CASCADE,
  band TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_id, band),
  CHECK (min_score >= 0 AND max_score <= 1000 AND min_score <= max_score)
);

CREATE TABLE IF NOT EXISTS credit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES scoring_models(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
  explanation JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  audit_log_id UUID -- Reference to audit trail
);

-- Create indexes for performance-critical queries
CREATE INDEX IF NOT EXISTS idx_score_factors_model_id ON score_factors(model_id);
CREATE INDEX IF NOT EXISTS idx_score_factors_factor_key ON score_factors(factor_key);
CREATE INDEX IF NOT EXISTS idx_score_factors_model_factor ON score_factors(model_id, factor_key);

CREATE INDEX IF NOT EXISTS idx_risk_bands_model_id ON risk_bands(model_id);
CREATE INDEX IF NOT EXISTS idx_risk_bands_score_range ON risk_bands(model_id, min_score, max_score);
CREATE INDEX IF NOT EXISTS idx_risk_bands_band ON risk_bands(model_id, band);

CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_id ON credit_scores(persona_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_model_id ON credit_scores(model_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_computed_at ON credit_scores(computed_at);
CREATE INDEX IF NOT EXISTS idx_credit_scores_score ON credit_scores(score);
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_model ON credit_scores(persona_id, model_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_computed ON credit_scores(persona_id, computed_at DESC);

-- Enable Row-Level Security
ALTER TABLE scoring_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scoring_models
CREATE POLICY scoring_models_read_policy ON scoring_models
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY scoring_models_write_policy ON scoring_models
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- RLS Policies for score_factors
CREATE POLICY score_factors_read_policy ON score_factors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY score_factors_write_policy ON score_factors
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- RLS Policies for risk_bands
CREATE POLICY risk_bands_read_policy ON risk_bands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY risk_bands_write_policy ON risk_bands
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- RLS Policies for credit_scores
CREATE POLICY credit_scores_read_policy ON credit_scores
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_personas 
      WHERE persona_id = credit_scores.persona_id
    ) OR auth.role() IN ('service_role', 'admin')
  );

CREATE POLICY credit_scores_write_policy ON credit_scores
  FOR INSERT USING (
    auth.uid() IN (
      SELECT user_id FROM user_personas 
      WHERE persona_id = credit_scores.persona_id
    ) OR auth.role() IN ('service_role', 'admin')
  );

-- Add table comments for documentation
COMMENT ON TABLE scoring_models IS 'Scoring model definitions and metadata';
COMMENT ON TABLE score_factors IS 'Model feature weights for credit scoring calculations';
COMMENT ON TABLE risk_bands IS 'Score ranges and corresponding risk band classifications';
COMMENT ON TABLE credit_scores IS 'Historical credit scores computed for personas';

-- Add column comments
COMMENT ON COLUMN score_factors.model_id IS 'Reference to scoring model';
COMMENT ON COLUMN score_factors.factor_key IS 'Feature identifier (e.g., tx_6m_count)';
COMMENT ON COLUMN score_factors.weight IS 'Weight applied to this feature in scoring';

COMMENT ON COLUMN risk_bands.band IS 'Risk band identifier (A, B, C, D)';
COMMENT ON COLUMN risk_bands.min_score IS 'Minimum score for this risk band (inclusive)';
COMMENT ON COLUMN risk_bands.max_score IS 'Maximum score for this risk band (inclusive)';

COMMENT ON COLUMN credit_scores.score IS 'Computed credit score (0-1000 scale)';
COMMENT ON COLUMN credit_scores.explanation IS 'Detailed scoring breakdown and feature contributions';