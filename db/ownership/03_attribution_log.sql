-- Step 3: Universal Attribution Log
-- Creates an immutable, append-only log for all ownership attributions
-- This table records every manual attribution with full audit trail

\echo 'Step 3: Creating Universal Attribution Log...'
\echo '=============================================='

-- Create the universal_attribution_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.universal_attribution_log (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  attributed_owner UUID,
  attributed_by TEXT DEFAULT current_user,
  attributed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT fk_attributed_owner 
    FOREIGN KEY (attributed_owner) 
    REFERENCES public.profiles(user_id) 
    ON DELETE RESTRICT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attribution_log_run_id 
  ON public.universal_attribution_log(run_id);

CREATE INDEX IF NOT EXISTS idx_attribution_log_table_name 
  ON public.universal_attribution_log(table_name);

CREATE INDEX IF NOT EXISTS idx_attribution_log_attributed_at 
  ON public.universal_attribution_log(attributed_at DESC);

CREATE INDEX IF NOT EXISTS idx_attribution_log_record 
  ON public.universal_attribution_log(table_name, record_id);

-- Add table comment
COMMENT ON TABLE public.universal_attribution_log IS 
  'Immutable audit log for all ownership attributions. Append-only - no updates or deletes permitted.';

-- Add column comments
COMMENT ON COLUMN public.universal_attribution_log.run_id IS 
  'Unique identifier for each attribution run (e.g., GitHub Actions run ID or timestamp)';

COMMENT ON COLUMN public.universal_attribution_log.table_name IS 
  'Name of the table where the attribution was made';

COMMENT ON COLUMN public.universal_attribution_log.record_id IS 
  'Primary key or unique identifier of the attributed record';

COMMENT ON COLUMN public.universal_attribution_log.attributed_owner IS 
  'The user_id from profiles table that was assigned as owner';

COMMENT ON COLUMN public.universal_attribution_log.attributed_by IS 
  'Database user or system that performed the attribution';

COMMENT ON COLUMN public.universal_attribution_log.attributed_at IS 
  'Timestamp when the attribution was recorded';

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE public.universal_attribution_log ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (all authenticated users can read)
DROP POLICY IF EXISTS attribution_log_read_policy ON public.universal_attribution_log;
CREATE POLICY attribution_log_read_policy ON public.universal_attribution_log
  FOR SELECT
  USING (true);

-- Create policy for inserting (all authenticated users can insert)
DROP POLICY IF EXISTS attribution_log_insert_policy ON public.universal_attribution_log;
CREATE POLICY attribution_log_insert_policy ON public.universal_attribution_log
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes via policies (making it append-only)
DROP POLICY IF EXISTS attribution_log_no_update_policy ON public.universal_attribution_log;
CREATE POLICY attribution_log_no_update_policy ON public.universal_attribution_log
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS attribution_log_no_delete_policy ON public.universal_attribution_log;
CREATE POLICY attribution_log_no_delete_policy ON public.universal_attribution_log
  FOR DELETE
  USING (false);

-- Create a trigger to prevent updates and deletes at the table level
CREATE OR REPLACE FUNCTION prevent_attribution_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Updates are not allowed on universal_attribution_log table. This is an append-only table.';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Deletes are not allowed on universal_attribution_log table. This is an append-only table.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_attribution_log_modification_trigger ON public.universal_attribution_log;
CREATE TRIGGER prevent_attribution_log_modification_trigger
  BEFORE UPDATE OR DELETE ON public.universal_attribution_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_attribution_log_modification();

\echo '✓ Universal attribution log table created'
\echo '✓ Indexes created for performance'
\echo '✓ Row Level Security policies configured'
\echo '✓ Append-only constraints enforced via trigger'
\echo ''
\echo '=============================================='
\echo 'Step 3 Complete: Attribution log ready'
\echo '=============================================='
\echo ''
\echo 'Attribution Log Summary:'

-- Display current log stats
SELECT 
  COUNT(*) as total_attributions,
  COUNT(DISTINCT run_id) as unique_runs,
  COUNT(DISTINCT table_name) as tables_affected,
  MIN(attributed_at) as first_attribution,
  MAX(attributed_at) as latest_attribution
FROM public.universal_attribution_log;
