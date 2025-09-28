-- Feature extraction with comprehensive data aggregation
CREATE OR REPLACE FUNCTION public.extract_features(p_persona_id UUID)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql AS $$
DECLARE
  result JSONB;
  tx_6m_count INTEGER;
  tx_6m_avg_amount NUMERIC;
  tx_6m_sum NUMERIC;
  days_since_last_tx INTEGER;
  remesa_12m_count INTEGER;
  remesa_12m_sum NUMERIC;
  bills_paid_ratio NUMERIC;
  avg_bill_amount NUMERIC;
  micro_active BOOLEAN;
  micro_active_sum NUMERIC;
  account_age_days INTEGER;
  avg_monthly_balance NUMERIC;
  credit_utilization_ratio NUMERIC;
BEGIN
  -- Transaction-based features (6 months)
  SELECT 
    COUNT(*),
    COALESCE(AVG(amount), 0),
    COALESCE(SUM(amount), 0)
  INTO tx_6m_count, tx_6m_avg_amount, tx_6m_sum
  FROM transactions 
  WHERE persona_id = p_persona_id 
    AND created_at > now() - INTERVAL '6 months';

  -- Days since last transaction
  SELECT COALESCE(EXTRACT(DAY FROM now() - MAX(created_at)), 365)
  INTO days_since_last_tx
  FROM transactions 
  WHERE persona_id = p_persona_id;

  -- Remittance features (12 months)
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO remesa_12m_count, remesa_12m_sum
  FROM remittances 
  WHERE persona_id = p_persona_id 
    AND created_at > now() - INTERVAL '12 months';

  -- Utility bill payment behavior
  SELECT 
    COALESCE(
      COUNT(*) FILTER (WHERE status = 'paid') / NULLIF(COUNT(*), 0)::NUMERIC, 
      0
    ),
    COALESCE(AVG(amount), 0)
  INTO bills_paid_ratio, avg_bill_amount
  FROM utility_bills 
  WHERE persona_id = p_persona_id 
    AND due_date > now() - INTERVAL '12 months';

  -- Microcredit activity
  SELECT 
    COUNT(*) > 0,
    COALESCE(SUM(amount), 0)
  INTO micro_active, micro_active_sum
  FROM microcredits 
  WHERE persona_id = p_persona_id 
    AND status = 'active';

  -- Account age (relationship longevity)
  SELECT COALESCE(EXTRACT(DAY FROM now() - MIN(created_at)), 0)
  INTO account_age_days
  FROM transactions 
  WHERE persona_id = p_persona_id;

  -- Average monthly balance (if account balance data available)
  SELECT COALESCE(AVG(balance), 0)
  INTO avg_monthly_balance
  FROM account_balances 
  WHERE persona_id = p_persona_id 
    AND recorded_at > now() - INTERVAL '6 months';

  -- Credit utilization ratio (if credit limit data available)
  SELECT COALESCE(
    AVG(current_balance / NULLIF(credit_limit, 0)), 
    0
  )
  INTO credit_utilization_ratio
  FROM credit_accounts 
  WHERE persona_id = p_persona_id 
    AND status = 'active';

  -- Build comprehensive feature set
  SELECT jsonb_build_object(
    -- Core transaction features
    'tx_6m_count', tx_6m_count,
    'tx_6m_avg_amount', tx_6m_avg_amount,
    'tx_6m_sum', tx_6m_sum,
    'days_since_last_tx', days_since_last_tx,
    
    -- Remittance features
    'remesa_12m_count', remesa_12m_count,
    'remesa_12m_sum', remesa_12m_sum,
    
    -- Bill payment behavior
    'bills_paid_ratio', bills_paid_ratio,
    'avg_bill_amount', avg_bill_amount,
    
    -- Microcredit activity
    'micro_active', CASE WHEN micro_active THEN 1 ELSE 0 END,
    'micro_active_sum', micro_active_sum,
    
    -- Additional stability indicators
    'account_age_days', account_age_days,
    'avg_monthly_balance', avg_monthly_balance,
    'credit_utilization_ratio', credit_utilization_ratio,
    
    -- Computed behavioral scores
    'payment_consistency', LEAST(1.0, bills_paid_ratio * 1.2),
    'transaction_velocity', CASE 
      WHEN tx_6m_count > 0 THEN LEAST(1.0, tx_6m_count / 50.0) 
      ELSE 0 
    END,
    'remittance_stability', CASE 
      WHEN remesa_12m_count >= 6 THEN 1.0
      WHEN remesa_12m_count >= 3 THEN 0.7
      WHEN remesa_12m_count >= 1 THEN 0.4
      ELSE 0
    END,
    
    -- Risk indicators
    'recency_risk', CASE 
      WHEN days_since_last_tx <= 30 THEN 0
      WHEN days_since_last_tx <= 90 THEN 0.3
      WHEN days_since_last_tx <= 180 THEN 0.6
      ELSE 1.0
    END,
    'credit_risk', GREATEST(0, LEAST(1.0, credit_utilization_ratio)),
    
    -- Metadata for audit trail
    'extraction_timestamp', now(),
    'feature_version', '1.0',
    'persona_id', p_persona_id
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return basic feature set
    RAISE WARNING 'Feature extraction error for persona %: %', p_persona_id, SQLERRM;
    RETURN jsonb_build_object(
      'tx_6m_count', 0,
      'tx_6m_avg_amount', 0,
      'tx_6m_sum', 0,
      'days_since_last_tx', 365,
      'remesa_12m_count', 0,
      'remesa_12m_sum', 0,
      'bills_paid_ratio', 0,
      'avg_bill_amount', 0,
      'micro_active', 0,
      'micro_active_sum', 0,
      'extraction_error', SQLERRM,
      'extraction_timestamp', now(),
      'persona_id', p_persona_id
    );
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.extract_features(UUID) IS 'Extract comprehensive credit scoring features from persona transaction and payment data';