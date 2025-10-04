# Database Schema Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the showcase database extensions to Supabase.

## Prerequisites
- Active Supabase project
- Database administrator access
- Supabase CLI installed (optional but recommended)
- PostgreSQL client (psql) or Supabase SQL Editor access

## Files to Deploy
1. `01_tables.sql` - Core tables for risk signals, alternate scoring, and demo cohort
2. `02_public_views.sql` - Read-only public views for API access
3. `03_functions.sql` - Database functions for integrity checks and demo data generation

## Deployment Methods

### Method 1: Using Supabase SQL Editor (Recommended for Quick Setup)

1. **Log into Supabase Dashboard**
   - Navigate to your project at https://app.supabase.com
   - Go to SQL Editor

2. **Execute Scripts in Order**
   
   **Step 1: Deploy Tables**
   ```sql
   -- Copy and paste content from db/showcase_extensions/01_tables.sql
   -- Execute the script
   ```
   
   **Step 2: Deploy Public Views**
   ```sql
   -- Copy and paste content from db/showcase_extensions/02_public_views.sql
   -- Execute the script
   ```
   
   **Step 3: Deploy Functions**
   ```sql
   -- Copy and paste content from db/showcase_extensions/03_functions.sql
   -- Execute the script
   ```

3. **Verify Deployment**
   ```sql
   -- Check tables created
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');

   -- Check views created
   SELECT table_name 
   FROM information_schema.views 
   WHERE table_schema = 'public' 
     AND table_name LIKE 'public_%';

   -- Check functions created
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
     AND routine_name IN ('verify_ownership_integrity', 'get_integrity_status', 'generate_demo_persona');
   ```

### Method 2: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Link to Your Project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Execute Migrations**
   ```bash
   supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.YOUR-PROJECT-REF.supabase.co:5432/postgres"
   ```

4. **Or Execute Individual Files**
   ```bash
   psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f db/showcase_extensions/01_tables.sql
   psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f db/showcase_extensions/02_public_views.sql
   psql -h db.YOUR-PROJECT-REF.supabase.co -U postgres -d postgres -f db/showcase_extensions/03_functions.sql
   ```

### Method 3: Using Local psql Client

1. **Get Connection String from Supabase**
   - Dashboard → Settings → Database → Connection String
   - Use the "URI" format

2. **Execute Scripts**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f db/showcase_extensions/01_tables.sql
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f db/showcase_extensions/02_public_views.sql
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f db/showcase_extensions/03_functions.sql
   ```

## Post-Deployment Verification

### 1. Verify Table Creation
```sql
-- Should return 4 rows
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');
```

### 2. Verify Indexes
```sql
-- Check all indexes are created
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort')
ORDER BY tablename, indexname;
```

### 3. Verify Public Views
```sql
-- Should return 6 views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'public_%';
```

### 4. Test Functions
```sql
-- Test integrity check function
SELECT * FROM verify_ownership_integrity();

-- Test get_integrity_status function
SELECT * FROM get_integrity_status();

-- The results should show 0 orphan records initially
```

### 5. Verify RLS Policies

**Enable RLS on tables:**
```sql
-- Enable RLS on all showcase tables
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE alt_score_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_cohort ENABLE ROW LEVEL SECURITY;
```

**Create RLS Policies:**
```sql
-- Policy for risk_events (owner access only)
CREATE POLICY owner_access_only ON risk_events
  FOR ALL
  USING (owner_id = auth.uid());

-- Policy for risk_factors (owner access only)
CREATE POLICY owner_access_only ON risk_factors
  FOR ALL
  USING (owner_id = auth.uid());

-- Policy for alt_score_runs (owner access only)
CREATE POLICY owner_access_only ON alt_score_runs
  FOR ALL
  USING (owner_id = auth.uid());

-- Policy for demo_cohort (read-only public access for active demos)
CREATE POLICY public_demo_read ON demo_cohort
  FOR SELECT
  USING (active = true);

-- Service role can do everything
CREATE POLICY service_role_all ON risk_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_role_all ON risk_factors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_role_all ON alt_score_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_role_all ON demo_cohort
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Verify RLS is Active:**
```sql
-- Should return true for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');
```

## Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already exist. Either:
- Drop existing tables: `DROP TABLE IF EXISTS table_name CASCADE;`
- Or skip table creation and only update functions/views

### Error: "permission denied"
**Solution:** Ensure you're connected as the postgres user or a user with sufficient privileges.

### Error: "view depends on another object"
**Solution:** Drop dependent views first, then recreate:
```sql
DROP VIEW IF EXISTS public_risk_factors CASCADE;
-- Then re-create the view
```

### Error: Function compilation failed
**Solution:** Check that all referenced tables and columns exist. Execute table creation scripts first.

## Rollback Procedure

If you need to rollback the changes:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS verify_ownership_integrity();
DROP FUNCTION IF EXISTS get_integrity_status();
DROP FUNCTION IF EXISTS get_latest_run_id();
DROP FUNCTION IF EXISTS generate_demo_persona(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS generate_risk_signals(UUID, INT);
DROP FUNCTION IF EXISTS create_demo_scenario(TEXT, TEXT, TEXT);

-- Drop views
DROP VIEW IF EXISTS public_score_models CASCADE;
DROP VIEW IF EXISTS public_risk_factors CASCADE;
DROP VIEW IF EXISTS public_score_runs CASCADE;
DROP VIEW IF EXISTS public_audit_summary CASCADE;
DROP VIEW IF EXISTS public_risk_events CASCADE;
DROP VIEW IF EXISTS public_alt_score_runs CASCADE;

-- Drop tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS demo_cohort CASCADE;
DROP TABLE IF EXISTS alt_score_runs CASCADE;
DROP TABLE IF EXISTS risk_factors CASCADE;
DROP TABLE IF EXISTS risk_events CASCADE;
```

## Security Checklist

After deployment, verify:

- [ ] RLS is enabled on all tables
- [ ] RLS policies are created and active
- [ ] Anonymous users can only read public views
- [ ] Authenticated users can only access their own data
- [ ] Service role has full access for admin operations
- [ ] No PII is exposed in public views
- [ ] All owner_id references are anonymized in public views
- [ ] Demo cohort is properly filtered (active = true)

## Performance Optimization

After deployment, consider:

1. **Analyze Tables**
   ```sql
   ANALYZE risk_events;
   ANALYZE risk_factors;
   ANALYZE alt_score_runs;
   ANALYZE demo_cohort;
   ```

2. **Check Index Usage**
   ```sql
   SELECT 
     schemaname,
     tablename,
     indexname,
     idx_scan as index_scans
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
     AND tablename IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort')
   ORDER BY idx_scan DESC;
   ```

3. **Monitor Query Performance**
   - Use Supabase Query Performance Monitor
   - Check slow queries in Dashboard → Database → Query Performance

## Next Steps

1. Deploy Edge Functions (see Phase 3)
2. Generate demo dataset (see Phase 4)
3. Test public API endpoints
4. Run integration tests

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review error logs in Supabase Dashboard → Logs
- Contact database administrator

## Version History

- **v1.0.0** - Initial showcase extensions deployment
  - Added risk_events, risk_factors tables
  - Added alt_score_runs table
  - Added demo_cohort table
  - Created 6 public views
  - Added integrity verification functions
