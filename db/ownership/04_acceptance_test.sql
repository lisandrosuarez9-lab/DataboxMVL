-- Step 4: Acceptance Test
-- Validates ownership integrity and generates audit artifacts
-- Fails if any orphans are detected, passes if all tables are clean

\echo 'Step 4: Running Acceptance Test...'
\echo '==================================='

-- Set client encoding for clean output
\set QUIET on
SET client_min_messages TO WARNING;
\set QUIET off

-- Generate RUN_ID if not provided
\set run_id `echo ${RUN_ID:-$(date +%Y%m%d_%H%M%S)_$(uuidgen | cut -c1-8)}`

\echo 'RUN_ID: ' :run_id

-- Create a temporary table to store results
DROP TABLE IF EXISTS acceptance_test_results;
CREATE TEMP TABLE acceptance_test_results (
  table_name TEXT PRIMARY KEY,
  total_records BIGINT DEFAULT 0,
  records_with_owner BIGINT DEFAULT 0,
  orphaned_records BIGINT DEFAULT 0,
  null_owners BIGINT DEFAULT 0,
  invalid_owners BIGINT DEFAULT 0,
  compliance_status TEXT,
  tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test persona table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persona') THEN
    SELECT COUNT(*) INTO v_total FROM public.persona;
    SELECT COUNT(*) INTO v_with_owner FROM public.persona WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.persona WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.persona 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('persona', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test transaccion table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaccion') THEN
    SELECT COUNT(*) INTO v_total FROM public.transaccion;
    SELECT COUNT(*) INTO v_with_owner FROM public.transaccion WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.transaccion WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.transaccion 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('transaccion', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test remesa table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'remesa') THEN
    SELECT COUNT(*) INTO v_total FROM public.remesa;
    SELECT COUNT(*) INTO v_with_owner FROM public.remesa WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.remesa WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.remesa 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('remesa', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test microcredito table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'microcredito') THEN
    SELECT COUNT(*) INTO v_total FROM public.microcredito;
    SELECT COUNT(*) INTO v_with_owner FROM public.microcredito WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.microcredito WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.microcredito 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('microcredito', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test factura_utilidad table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'factura_utilidad') THEN
    SELECT COUNT(*) INTO v_total FROM public.factura_utilidad;
    SELECT COUNT(*) INTO v_with_owner FROM public.factura_utilidad WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.factura_utilidad WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.factura_utilidad 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('factura_utilidad', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test telco_topup table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telco_topup') THEN
    SELECT COUNT(*) INTO v_total FROM public.telco_topup;
    SELECT COUNT(*) INTO v_with_owner FROM public.telco_topup WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.telco_topup WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.telco_topup 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('telco_topup', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test financial_events table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_events') THEN
    SELECT COUNT(*) INTO v_total FROM public.financial_events;
    SELECT COUNT(*) INTO v_with_owner FROM public.financial_events WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.financial_events WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.financial_events 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('financial_events', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test credit_scores table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_scores') THEN
    SELECT COUNT(*) INTO v_total FROM public.credit_scores;
    SELECT COUNT(*) INTO v_with_owner FROM public.credit_scores WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.credit_scores WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.credit_scores 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('credit_scores', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Test score_runs table
DO $$
DECLARE
  v_total BIGINT := 0;
  v_with_owner BIGINT := 0;
  v_orphans BIGINT := 0;
  v_null_owners BIGINT := 0;
  v_invalid_owners BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'score_runs') THEN
    SELECT COUNT(*) INTO v_total FROM public.score_runs;
    SELECT COUNT(*) INTO v_with_owner FROM public.score_runs WHERE owner_id IS NOT NULL;
    SELECT COUNT(*) INTO v_null_owners FROM public.score_runs WHERE owner_id IS NULL;
    SELECT COUNT(*) INTO v_invalid_owners 
    FROM public.score_runs 
    WHERE owner_id IS NOT NULL 
      AND owner_id NOT IN (SELECT user_id FROM public.profiles);
    
    v_orphans := v_null_owners + v_invalid_owners;
    
    INSERT INTO acceptance_test_results (table_name, total_records, records_with_owner, orphaned_records, null_owners, invalid_owners, compliance_status)
    VALUES ('score_runs', v_total, v_with_owner, v_orphans, v_null_owners, v_invalid_owners, 
            CASE WHEN v_orphans = 0 THEN 'PASS' ELSE 'FAIL' END);
  END IF;
END $$;

-- Display results
\echo ''
\echo 'Acceptance Test Results:'
\echo '------------------------'

SELECT 
  table_name,
  total_records,
  records_with_owner,
  orphaned_records as remaining_orphans,
  compliance_status
FROM acceptance_test_results
ORDER BY table_name;

-- Calculate overall pass/fail status
DO $$
DECLARE
  v_total_orphans BIGINT;
  v_failed_tables INT;
  v_test_status TEXT;
BEGIN
  SELECT 
    COALESCE(SUM(orphaned_records), 0),
    COUNT(*) FILTER (WHERE compliance_status = 'FAIL')
  INTO v_total_orphans, v_failed_tables
  FROM acceptance_test_results;
  
  IF v_total_orphans = 0 THEN
    v_test_status := 'PASSED';
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE '✓ ACCEPTANCE TEST PASSED';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'All tables have valid ownership. No orphans detected.';
  ELSE
    v_test_status := 'FAILED';
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE '✗ ACCEPTANCE TEST FAILED';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Total orphaned records: %', v_total_orphans;
    RAISE NOTICE 'Tables failing compliance: %', v_failed_tables;
    RAISE NOTICE '';
    RAISE NOTICE 'ACTION REQUIRED: Remediate orphaned records before proceeding.';
    RAISE EXCEPTION 'Ownership audit failed: % orphaned records detected', v_total_orphans;
  END IF;
END $$;

-- Export results for artifacts (these would be captured by the CI/CD pipeline)
\echo ''
\echo 'Generating artifacts...'

-- CSV format
\copy (SELECT table_name, orphaned_records as remaining_orphans FROM acceptance_test_results ORDER BY table_name) TO '/tmp/ownership_audit_summary.csv' WITH CSV HEADER;

-- JSON format (PostgreSQL 9.2+)
\copy (SELECT json_agg(json_build_object('table_name', table_name, 'remaining_orphans', orphaned_records)) FROM acceptance_test_results) TO '/tmp/ownership_audit_summary.json';

\echo '✓ Artifacts generated:'
\echo '  - /tmp/ownership_audit_summary.csv'
\echo '  - /tmp/ownership_audit_summary.json'
