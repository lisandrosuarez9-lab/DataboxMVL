-- Initial Data Population
-- Step 5: Populate Initial Data for Model ID 1

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

-- Add validation to ensure risk bands don't overlap
DO $$
DECLARE
  band_count INTEGER;
  overlap_count INTEGER;
BEGIN
  -- Check for overlaps in risk bands
  SELECT COUNT(*) INTO overlap_count
  FROM (
    SELECT r1.model_id, r1.band as band1, r2.band as band2
    FROM risk_bands r1
    JOIN risk_bands r2 ON r1.model_id = r2.model_id AND r1.id != r2.id
    WHERE (r1.min_score BETWEEN r2.min_score AND r2.max_score)
       OR (r1.max_score BETWEEN r2.min_score AND r2.max_score)
       OR (r2.min_score BETWEEN r1.min_score AND r1.max_score)
       OR (r2.max_score BETWEEN r1.min_score AND r1.max_score)
  ) overlaps;
  
  IF overlap_count > 0 THEN
    RAISE WARNING 'Found % overlapping risk band ranges. Please review risk band configurations.', overlap_count;
  END IF;
  
  -- Verify all score factors have been inserted
  SELECT COUNT(*) INTO band_count FROM risk_bands WHERE model_id = 1;
  RAISE NOTICE 'Initialized % risk bands for model 1', band_count;
  
  SELECT COUNT(*) INTO band_count FROM score_factors WHERE model_id = 1;
  RAISE NOTICE 'Initialized % scoring factors for model 1', band_count;
END $$;