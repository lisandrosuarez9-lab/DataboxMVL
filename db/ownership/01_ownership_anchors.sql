-- Step 1: Ownership Anchors
-- Adds owner_id column and foreign key constraints to all operational tables
-- This script is idempotent and can be run multiple times safely

\echo 'Step 1: Establishing Ownership Anchors...'
\echo '=========================================='

-- Define the tables that need ownership anchors
DO $$
DECLARE
  table_name TEXT;
  tables_to_anchor TEXT[] := ARRAY[
    'persona',
    'transaccion',
    'remesa',
    'microcredito',
    'factura_utilidad',
    'telco_topup',
    'financial_events',
    'credit_scores',
    'score_runs'
  ];
  column_exists BOOLEAN;
  constraint_exists BOOLEAN;
BEGIN
  -- Ensure profiles table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'Creating profiles table as it does not exist...';
    CREATE TABLE IF NOT EXISTS public.profiles (
      user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE '✓ profiles table created';
  ELSE
    RAISE NOTICE '✓ profiles table exists';
  END IF;

  -- Process each table
  FOREACH table_name IN ARRAY tables_to_anchor
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Processing table: %', table_name;
    
    -- Check if table exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      RAISE NOTICE '⚠ Table % does not exist, skipping...', table_name;
      CONTINUE;
    END IF;

    -- Check if owner_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name
      AND column_name = 'owner_id'
    ) INTO column_exists;

    IF NOT column_exists THEN
      RAISE NOTICE '  → Adding owner_id column to %', table_name;
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN owner_id UUID', table_name);
      RAISE NOTICE '  ✓ owner_id column added';
    ELSE
      RAISE NOTICE '  ✓ owner_id column already exists';
    END IF;

    -- Check if foreign key constraint exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = table_name
      AND constraint_name = format('%s_owner_id_fkey', table_name)
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
      RAISE NOTICE '  → Adding foreign key constraint to %', table_name;
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I 
         FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id) 
         ON UPDATE CASCADE ON DELETE RESTRICT',
        table_name,
        format('%s_owner_id_fkey', table_name)
      );
      RAISE NOTICE '  ✓ Foreign key constraint added';
    ELSE
      RAISE NOTICE '  ✓ Foreign key constraint already exists';
    END IF;

    -- Create index on owner_id for performance
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = table_name
      AND indexname = format('idx_%s_owner_id', table_name)
    ) THEN
      RAISE NOTICE '  → Creating index on owner_id for %', table_name;
      EXECUTE format('CREATE INDEX %I ON public.%I(owner_id)', 
        format('idx_%s_owner_id', table_name), 
        table_name
      );
      RAISE NOTICE '  ✓ Index created';
    ELSE
      RAISE NOTICE '  ✓ Index already exists';
    END IF;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Step 1 Complete: All ownership anchors established';
  RAISE NOTICE '========================================';
END;
$$;
