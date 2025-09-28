-- Credit Scoring Tables
-- Step 1: Database Schema Implementation

-- Score factors table with weights for each feature
CREATE TABLE IF NOT EXISTS public.score_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id INTEGER NOT NULL,
  feature_key TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_id, feature_key)
);

-- Risk bands table for score categorization
CREATE TABLE IF NOT EXISTS public.risk_bands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id INTEGER NOT NULL,
  band TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_id, band)
);

-- Credit scores table to store computed scores
CREATE TABLE IF NOT EXISTS public.credit_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_id UUID NOT NULL REFERENCES public.personas(id),
  model_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  explanation JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.score_factors IS 'Model feature weights for credit scoring calculations';
COMMENT ON TABLE public.risk_bands IS 'Score ranges and corresponding risk band classifications';
COMMENT ON TABLE public.credit_scores IS 'Historical credit scores computed for personas';

COMMENT ON COLUMN public.score_factors.model_id IS 'Model version identifier';
COMMENT ON COLUMN public.score_factors.feature_key IS 'Feature identifier (e.g., tx_6m_count)';
COMMENT ON COLUMN public.score_factors.weight IS 'Weight applied to this feature in scoring';

COMMENT ON COLUMN public.risk_bands.band IS 'Risk band identifier (A, B, C, D)';
COMMENT ON COLUMN public.risk_bands.min_score IS 'Minimum score for this risk band (inclusive)';
COMMENT ON COLUMN public.risk_bands.max_score IS 'Maximum score for this risk band (inclusive)';

COMMENT ON COLUMN public.credit_scores.score IS 'Computed credit score (0-1000 scale)';
COMMENT ON COLUMN public.credit_scores.explanation IS 'Detailed scoring breakdown and feature contributions';