-- Baseline score factors and risk bands
-- Insert baseline scoring model
INSERT INTO scoring_models (id, name, version, description) VALUES
('11111111-1111-1111-1111-111111111111', 'FactorA Base Model', '1.0', 'Baseline credit scoring model for financial inclusion')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  updated_at = now();

-- Baseline score factors for model_id=1
INSERT INTO score_factors (model_id, factor_key, weight, description)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'tx_6m_count', 0.05, 'Transaction frequency in last 6 months'),
  ('11111111-1111-1111-1111-111111111111', 'tx_6m_avg_amount', 0.15, 'Average transaction amount in last 6 months'),
  ('11111111-1111-1111-1111-111111111111', 'tx_6m_sum', 0.20, 'Total transaction volume in last 6 months'),
  ('11111111-1111-1111-1111-111111111111', 'days_since_last_tx', -0.10, 'Days since last transaction (negative impact)'),
  ('11111111-1111-1111-1111-111111111111', 'remesa_12m_count', 0.08, 'Remittance frequency in last 12 months'),
  ('11111111-1111-1111-1111-111111111111', 'remesa_12m_sum', 0.12, 'Total remittance volume in last 12 months'),
  ('11111111-1111-1111-1111-111111111111', 'bills_paid_ratio', 0.18, 'Ratio of utility bills paid on time'),
  ('11111111-1111-1111-1111-111111111111', 'avg_bill_amount', 0.07, 'Average utility bill amount'),
  ('11111111-1111-1111-1111-111111111111', 'micro_active', 0.09, 'Has active microcredit (binary indicator)'),
  ('11111111-1111-1111-1111-111111111111', 'micro_active_sum', 0.06, 'Sum of active microcredit amounts'),
  -- Additional behavioral and stability factors
  ('11111111-1111-1111-1111-111111111111', 'payment_consistency', 0.14, 'Consistency in payment behavior'),
  ('11111111-1111-1111-1111-111111111111', 'account_age_days', 0.11, 'Length of relationship (account age)'),
  ('11111111-1111-1111-1111-111111111111', 'transaction_velocity', 0.08, 'Normalized transaction activity level'),
  ('11111111-1111-1111-1111-111111111111', 'remittance_stability', 0.10, 'Stability of remittance patterns'),
  ('11111111-1111-1111-1111-111111111111', 'credit_utilization_ratio', -0.13, 'Credit utilization ratio (negative impact if high)')
ON CONFLICT (model_id, factor_key) DO UPDATE SET
  weight = EXCLUDED.weight,
  description = EXCLUDED.description,
  updated_at = now();

-- Risk bands A through D with proper score ranges
INSERT INTO risk_bands (model_id, band, min_score, max_score, recommendation) VALUES
('11111111-1111-1111-1111-111111111111', 'A', 800, 1000, 'Eligible for premium credit products with lowest interest rates and highest limits'),
('11111111-1111-1111-1111-111111111111', 'B', 650, 799, 'Eligible for standard credit products with competitive rates and moderate limits'),
('11111111-1111-1111-1111-111111111111', 'C', 450, 649, 'Eligible for basic credit products with standard rates and lower limits'),
('11111111-1111-1111-1111-111111111111', 'D', 0, 449, 'Limited eligibility - consider secured credit options, financial education, or alternative products')
ON CONFLICT (model_id, band) DO UPDATE SET
  min_score = EXCLUDED.min_score,
  max_score = EXCLUDED.max_score,
  recommendation = EXCLUDED.recommendation,
  updated_at = now();

-- Validation and audit of seed data
DO $$
DECLARE
  factor_count INTEGER;
  band_count INTEGER;
  weight_sum NUMERIC;
  overlap_count INTEGER;
  model_id_uuid UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Verify score factors insertion
  SELECT COUNT(*), SUM(weight) 
  INTO factor_count, weight_sum
  FROM score_factors 
  WHERE model_id = model_id_uuid;
  
  RAISE NOTICE 'Inserted % score factors with total weight sum: %', factor_count, weight_sum;
  
  -- Verify risk bands insertion
  SELECT COUNT(*) INTO band_count
  FROM risk_bands 
  WHERE model_id = model_id_uuid;
  
  RAISE NOTICE 'Inserted % risk bands', band_count;
  
  -- Check for overlapping risk bands
  SELECT COUNT(*) INTO overlap_count
  FROM (
    SELECT r1.band as band1, r2.band as band2
    FROM risk_bands r1
    JOIN risk_bands r2 ON r1.model_id = r2.model_id AND r1.id != r2.id
    WHERE r1.model_id = model_id_uuid
      AND (
        (r1.min_score BETWEEN r2.min_score AND r2.max_score)
        OR (r1.max_score BETWEEN r2.min_score AND r2.max_score)
        OR (r2.min_score BETWEEN r1.min_score AND r1.max_score)
        OR (r2.max_score BETWEEN r1.min_score AND r1.max_score)
      )
  ) overlaps;
  
  IF overlap_count > 0 THEN
    RAISE WARNING 'Found % overlapping risk band ranges for model %', overlap_count, model_id_uuid;
  ELSE
    RAISE NOTICE 'Risk bands validated - no overlaps detected';
  END IF;
  
  -- Verify complete score range coverage
  IF NOT EXISTS (
    SELECT 1 FROM risk_bands 
    WHERE model_id = model_id_uuid 
      AND min_score = 0 
      AND max_score >= 999
  ) THEN
    -- Check if we have complete coverage from 0 to 1000
    DECLARE
      min_coverage INTEGER;
      max_coverage INTEGER;
    BEGIN
      SELECT MIN(min_score), MAX(max_score) 
      INTO min_coverage, max_coverage
      FROM risk_bands 
      WHERE model_id = model_id_uuid;
      
      IF min_coverage > 0 OR max_coverage < 1000 THEN
        RAISE WARNING 'Risk bands do not provide complete coverage (%-%). Scores outside this range will be unclassified.', min_coverage, max_coverage;
      ELSE
        RAISE NOTICE 'Risk bands provide complete score coverage (0-1000)';
      END IF;
    END;
  END IF;
  
  -- Summary report
  RAISE NOTICE '=== Seed Data Summary ===';
  RAISE NOTICE 'Model ID: %', model_id_uuid;
  RAISE NOTICE 'Score Factors: % (Total Weight: %)', factor_count, weight_sum;
  RAISE NOTICE 'Risk Bands: %', band_count;
  RAISE NOTICE 'Data validation: %', CASE WHEN overlap_count = 0 THEN 'PASSED' ELSE 'WARNINGS' END;
  RAISE NOTICE '========================';
END $$;

-- Create sample test personas for validation (optional)
INSERT INTO personas (id, name, email, created_at) VALUES
('22222222-2222-2222-2222-222222222222', 'Test Persona Alpha', 'test.alpha@example.com', now()),
('33333333-3333-3333-3333-333333333333', 'Test Persona Beta', 'test.beta@example.com', now()),
('44444444-4444-4444-4444-444444444444', 'Test Persona Gamma', 'test.gamma@example.com', now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = now();

-- Insert sample transactions for test personas
INSERT INTO transactions (persona_id, amount, description, created_at) VALUES
-- Alpha - High activity, good amounts
('22222222-2222-2222-2222-222222222222', 150.00, 'Grocery purchase', now() - INTERVAL '1 week'),
('22222222-2222-2222-2222-222222222222', 75.50, 'Utility payment', now() - INTERVAL '2 weeks'),
('22222222-2222-2222-2222-222222222222', 200.00, 'Salary deposit', now() - INTERVAL '1 month'),
-- Beta - Moderate activity
('33333333-3333-3333-3333-333333333333', 45.00, 'Market purchase', now() - INTERVAL '3 days'),
('33333333-3333-3333-3333-333333333333', 120.00, 'Bill payment', now() - INTERVAL '1 month'),
-- Gamma - Low activity
('44444444-4444-4444-4444-444444444444', 25.00, 'Small purchase', now() - INTERVAL '2 months')
ON CONFLICT DO NOTHING;