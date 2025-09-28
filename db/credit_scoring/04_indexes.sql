-- Performance Indexes
-- Step 4: Create Indexes for Performance

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_id ON public.credit_scores(persona_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_model_id ON public.credit_scores(model_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_computed_at ON public.credit_scores(computed_at);
CREATE INDEX IF NOT EXISTS idx_credit_scores_score ON public.credit_scores(score);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_model ON public.credit_scores(persona_id, model_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_computed ON public.credit_scores(persona_id, computed_at DESC);

-- Risk bands indexes
CREATE INDEX IF NOT EXISTS idx_risk_bands_model_id ON public.risk_bands(model_id);
CREATE INDEX IF NOT EXISTS idx_risk_bands_score_range ON public.risk_bands(model_id, min_score, max_score);

-- Score factors indexes
CREATE INDEX IF NOT EXISTS idx_score_factors_model_id ON public.score_factors(model_id);
CREATE INDEX IF NOT EXISTS idx_score_factors_feature_key ON public.score_factors(feature_key);

-- Add index comments for documentation
COMMENT ON INDEX idx_credit_scores_persona_id IS 'Fast lookup of credit scores by persona';
COMMENT ON INDEX idx_credit_scores_model_id IS 'Fast lookup of credit scores by model';
COMMENT ON INDEX idx_credit_scores_computed_at IS 'Chronological ordering of credit scores';
COMMENT ON INDEX idx_credit_scores_persona_model IS 'Composite index for persona-model queries';
COMMENT ON INDEX idx_risk_bands_score_range IS 'Fast risk band classification by score range';