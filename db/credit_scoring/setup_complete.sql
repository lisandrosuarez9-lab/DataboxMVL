-- Complete Credit Scoring System Setup
-- Run this script to set up the entire credit scoring system

\echo 'Setting up Credit Scoring System...'

-- Step 1: Create Tables
\echo 'Creating tables...'

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

\echo 'Tables created successfully.'

-- Step 2: Create Functions
\echo 'Creating functions...'

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

\echo 'Functions created successfully.'

-- Step 3: Create Indexes
\echo 'Creating indexes...'

CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_id ON public.credit_scores(persona_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_model_id ON public.credit_scores(model_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_computed_at ON public.credit_scores(computed_at);
CREATE INDEX IF NOT EXISTS idx_credit_scores_score ON public.credit_scores(score);
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_model ON public.credit_scores(persona_id, model_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_persona_computed ON public.credit_scores(persona_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_bands_model_id ON public.risk_bands(model_id);
CREATE INDEX IF NOT EXISTS idx_risk_bands_score_range ON public.risk_bands(model_id, min_score, max_score);
CREATE INDEX IF NOT EXISTS idx_score_factors_model_id ON public.score_factors(model_id);
CREATE INDEX IF NOT EXISTS idx_score_factors_feature_key ON public.score_factors(feature_key);

\echo 'Indexes created successfully.'

-- Step 4: Enable RLS and Create Policies
\echo 'Setting up Row-Level Security...'

ALTER TABLE public.score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;

-- Risk bands policies
CREATE POLICY risk_bands_read_policy ON public.risk_bands
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY risk_bands_write_policy ON public.risk_bands
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- Score factors policies
CREATE POLICY score_factors_read_policy ON public.score_factors
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY score_factors_write_policy ON public.score_factors
  FOR ALL USING (auth.role() IN ('service_role', 'admin'));

-- Credit scores policies
CREATE POLICY credit_scores_read_policy ON public.credit_scores
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_personas 
      WHERE persona_id = credit_scores.persona_id
    ) OR auth.role() IN ('service_role', 'admin')
  );
  
CREATE POLICY credit_scores_write_policy ON public.credit_scores
  FOR INSERT USING (
    auth.uid() IN (
      SELECT user_id FROM user_personas 
      WHERE persona_id = credit_scores.persona_id
    ) OR auth.role() IN ('service_role', 'admin')
  );

\echo 'RLS policies created successfully.'

-- Step 5: Populate Initial Data
\echo 'Populating initial data for Model 1...'

-- Populate score factors for model_id = 1
INSERT INTO public.score_factors (model_id, feature_key, weight, description) VALUES
(1, 'tx_6m_count', 0.5, 'Number of transactions in last 6 months'),
(1, 'tx_6m_avg_amount', 0.3, 'Average transaction amount in last 6 months'),
(1, 'tx_6m_sum', 0.4, 'Sum of transactions in last 6 months'),
(1, 'days_since_last_tx', -0.2, 'Days since last transaction (negative impact)'),
(1, 'remesa_12m_sum', 0.5, 'Sum of remittances in last 12 months'),
(1, 'bills_paid_ratio', 0.7, 'Ratio of paid utility bills'),
(1, 'avg_bill_amount', 0.2, 'Average bill amount'),
(1, 'micro_active', 0.3, 'Has active microcredit'),
(1, 'micro_active_sum', 0.2, 'Sum of active microcredits')
ON CONFLICT (model_id, feature_key) DO UPDATE SET
  weight = EXCLUDED.weight,
  description = EXCLUDED.description;

-- Populate risk bands for model_id = 1
INSERT INTO public.risk_bands (model_id, band, min_score, max_score, recommendation) VALUES
(1, 'A', 800, 1000, 'Eligible for premium credit products with lowest interest rates'),
(1, 'B', 650, 799, 'Eligible for standard credit products with competitive rates'),
(1, 'C', 450, 649, 'Eligible for basic credit products with standard rates'),
(1, 'D', 0, 449, 'Limited eligibility, consider secured credit options only')
ON CONFLICT (model_id, band) DO UPDATE SET
  min_score = EXCLUDED.min_score,
  max_score = EXCLUDED.max_score,
  recommendation = EXCLUDED.recommendation;

\echo 'Initial data populated successfully.'

-- Final verification
DO $$
DECLARE
  factor_count INTEGER;
  band_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO factor_count FROM score_factors WHERE model_id = 1;
  SELECT COUNT(*) INTO band_count FROM risk_bands WHERE model_id = 1;
  
  RAISE NOTICE 'Credit Scoring System Setup Complete:';
  RAISE NOTICE '  - Score Factors: %', factor_count;
  RAISE NOTICE '  - Risk Bands: %', band_count;
  RAISE NOTICE '  - Tables: score_factors, risk_bands, credit_scores';
  RAISE NOTICE '  - Functions: extract_features, apply_weights, normalize_score, compute_credit_score, get_score_trend, simulate_credit_score';
  RAISE NOTICE '  - RLS Policies: Enabled and configured';
  RAISE NOTICE '  - Indexes: Performance optimized';
END $$;

\echo 'Credit Scoring System setup completed successfully!'