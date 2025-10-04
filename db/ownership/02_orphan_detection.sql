-- Step 2: Orphan Detection
-- Detects all rows without valid owner_id references
-- Creates temporary orphan_index table with all orphaned records

\echo 'Step 2: Orphan Detection...'
\echo '============================'

-- Drop and recreate orphan_index table
DROP TABLE IF EXISTS orphan_index CASCADE;

CREATE TEMP TABLE orphan_index (
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  owner_id UUID,
  issue TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

\echo 'Scanning tables for orphaned records...'

-- Check persona table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persona') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'persona',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.persona
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  persona: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check transaccion table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaccion') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'transaccion',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.transaccion
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  transaccion: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check remesa table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'remesa') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'remesa',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.remesa
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  remesa: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check microcredito table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'microcredito') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'microcredito',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.microcredito
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  microcredito: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check factura_utilidad table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'factura_utilidad') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'factura_utilidad',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.factura_utilidad
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  factura_utilidad: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check telco_topup table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telco_topup') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'telco_topup',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.telco_topup
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  telco_topup: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check financial_events table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_events') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'financial_events',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.financial_events
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  financial_events: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check credit_scores table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_scores') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'credit_scores',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.credit_scores
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  credit_scores: % orphaned records', orphan_count;
  END IF;
END $$;

-- Check score_runs table
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'score_runs') THEN
    INSERT INTO orphan_index (table_name, record_id, owner_id, issue)
    SELECT 
      'score_runs',
      COALESCE(id::TEXT, '<no-id>'),
      owner_id,
      CASE 
        WHEN owner_id IS NULL THEN 'owner_id is NULL'
        ELSE 'owner_id not in profiles'
      END
    FROM public.score_runs
    WHERE owner_id IS NULL 
       OR owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    RAISE NOTICE '  score_runs: % orphaned records', orphan_count;
  END IF;
END $$;

\echo ''
\echo '============================'
\echo 'Orphan Detection Complete'
\echo '============================'
\echo ''
\echo 'Orphan Index Summary:'

-- Display summary
SELECT 
  table_name,
  COUNT(*) as orphan_count,
  COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as null_owners,
  COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as invalid_references
FROM orphan_index
GROUP BY table_name
ORDER BY table_name;

\echo ''
\echo 'Total orphaned records:'
SELECT COUNT(*) as total_orphans FROM orphan_index;
