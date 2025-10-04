# Compliance Showcase Database Extensions

This directory contains SQL scripts to extend the DataboxMVL database with features required for the public GitHub Pages compliance showcase.

## Overview

The showcase extensions add:

1. **Risk Signals**: Capture and process RiskSeal signals
2. **Alternate Scoring**: Support thin-file credit assessment
3. **Public Views**: Read-only anonymized data for public access
4. **Demo Cohort**: Manage synthetic personas for demonstrations
5. **Utility Functions**: Integrity verification and data generation

## Files

### 01_tables.sql
Creates core tables for the showcase:
- `risk_events` - Raw risk signals from RiskSeal
- `risk_factors` - Derived, normalized risk factors
- `alt_score_runs` - Alternate scoring model executions
- `demo_cohort` - Synthetic personas for public demos

Includes:
- Comprehensive indexes for performance
- Row Level Security (RLS) policies
- Audit triggers (if available)

### 02_public_views.sql
Creates read-only views for safe public access:
- `public_score_models` - Scoring models (weights redacted)
- `public_risk_factors` - Anonymized risk factors
- `public_score_runs` - Score run summaries
- `public_audit_summary` - Audit metrics
- `public_risk_events` - Anonymized risk events
- `public_alt_score_runs` - Alternate score runs

All views:
- Anonymize owner IDs (e.g., "demo-12345678")
- Filter to demo cohort only
- Redact sensitive information
- Grant SELECT to anon and authenticated

### 03_functions.sql
Utility functions for the showcase:
- `verify_ownership_integrity()` - Check for orphan records
- `get_latest_run_id()` - Get most recent run ID
- `get_integrity_status()` - Complete integrity metrics
- `generate_demo_persona()` - Create demo persona
- `generate_risk_signals()` - Generate realistic signals
- `create_demo_scenario()` - Complete demo setup

## Installation

### Prerequisites

- PostgreSQL 12 or higher
- Supabase instance (or standard PostgreSQL with auth schema)
- Existing credit scoring tables (credit_scores, score_models, etc.)

### Installation Steps

1. **Backup your database**
   ```bash
   pg_dump -Fc your_database > backup.dump
   ```

2. **Apply the extensions in order**
   ```bash
   psql -d your_database -f 01_tables.sql
   psql -d your_database -f 02_public_views.sql
   psql -d your_database -f 03_functions.sql
   ```

3. **Verify installation**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');

   -- Check views created
   SELECT table_name FROM information_schema.views 
   WHERE table_schema = 'public' 
     AND table_name LIKE 'public_%';

   -- Check functions created
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
     AND routine_name IN ('get_integrity_status', 'generate_demo_persona');
   ```

4. **Test integrity function**
   ```sql
   SELECT * FROM get_integrity_status();
   ```

## Usage

### Creating Demo Data

#### 1. Create a thin-file demo persona
```sql
SELECT create_demo_scenario(
  'thin_file',
  'Maria Rodriguez',
  'New to credit, relies on remittances and microcredit'
);
```

#### 2. Create a traditional credit persona
```sql
SELECT create_demo_scenario(
  'traditional',
  'Carlos Mendez',
  'Established credit history with regular income'
);
```

#### 3. Create multiple demo personas
```sql
-- Create a set of diverse demo personas
DO $$
DECLARE
  scenarios TEXT[][] := ARRAY[
    ['thin_file', 'Ana López', 'Young professional, first-time borrower'],
    ['mixed', 'Juan Pérez', 'Mix of traditional and alternative credit data'],
    ['new_borrower', 'Sofia García', 'Recent graduate seeking first loan'],
    ['traditional', 'Diego Martínez', 'Long credit history, stable employment']
  ];
  scenario TEXT[];
BEGIN
  FOREACH scenario SLICE 1 IN ARRAY scenarios
  LOOP
    PERFORM create_demo_scenario(scenario[1], scenario[2], scenario[3]);
  END LOOP;
END $$;
```

### Querying Public Views

#### Get all demo personas
```sql
SELECT * FROM demo_cohort WHERE active = true;
```

#### View risk factors for a demo persona
```sql
SELECT * FROM public_risk_factors 
WHERE owner_ref = 'demo-12345678'
ORDER BY derived_at DESC;
```

#### Check scoring runs
```sql
SELECT 
  persona_ref,
  score,
  risk_band->>'band' as band,
  computed_at
FROM public_score_runs
ORDER BY computed_at DESC
LIMIT 10;
```

#### Get audit summary
```sql
SELECT * FROM public_audit_summary;
```

### Integrity Verification

#### Check for orphan records
```sql
SELECT * FROM verify_ownership_integrity();
```

Expected output (all should be 0):
```
 table_name     | orphan_count | last_check
----------------+--------------+------------------------
 personas       |            0 | 2024-01-15 10:30:00+00
 credit_scores  |            0 | 2024-01-15 10:30:00+00
 risk_events    |            0 | 2024-01-15 10:30:00+00
 risk_factors   |            0 | 2024-01-15 10:30:00+00
 alt_score_runs |            0 | 2024-01-15 10:30:00+00
```

#### Get complete integrity status
```sql
SELECT jsonb_pretty(get_integrity_status());
```

Example output:
```json
{
  "orphan_records": 0,
  "latest_run_id": "RUN-20240115-ABCD1234",
  "audit_entries_30d": 127,
  "rls_status": "ENFORCED",
  "last_verification": "2024-01-15T10:30:00Z",
  "tables_checked": 5
}
```

## Security

### Row Level Security (RLS)

All new tables have RLS enabled with policies that:
- Allow users to SELECT their own data
- Allow SELECT for demo cohort (for public showcase)
- Allow INSERT only for own data
- Deny all UPDATE and DELETE (except by admin)

### View Security

Public views:
- Only expose demo cohort data
- Anonymize all owner IDs
- Redact sensitive fields
- Grant SELECT to anon and authenticated roles

### API Security

When exposing these views via API:
- Use rate limiting (100 req/min recommended)
- Implement token scoping for demo access
- Log all access for audit purposes
- Monitor for abuse patterns

## Data Management

### Adding Demo Personas

Use the `create_demo_scenario()` function for consistent demo data:

```sql
SELECT create_demo_scenario(
  'thin_file',
  'Display Name',
  'Scenario description for this persona'
);
```

### Deactivating Demo Personas

```sql
UPDATE demo_cohort 
SET active = false 
WHERE user_id = 'uuid-here';
```

### Cleaning Up Demo Data

```sql
-- Remove all inactive demo personas and their data
DO $$
DECLARE
  inactive_ids UUID[];
BEGIN
  -- Get inactive demo persona IDs
  SELECT array_agg(user_id) INTO inactive_ids
  FROM demo_cohort
  WHERE active = false;

  -- Delete related data
  DELETE FROM risk_factors WHERE owner_id = ANY(inactive_ids);
  DELETE FROM risk_events WHERE owner_id = ANY(inactive_ids);
  DELETE FROM alt_score_runs WHERE owner_id = ANY(inactive_ids);
  DELETE FROM credit_scores WHERE persona_id = ANY(inactive_ids);
  
  -- Delete demo cohort entries
  DELETE FROM demo_cohort WHERE active = false;
END $$;
```

## Monitoring

### Check Table Sizes

```sql
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort')
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

### Monitor View Usage

```sql
SELECT 
  schemaname,
  viewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||viewname)) as size
FROM pg_views
WHERE viewname LIKE 'public_%'
ORDER BY viewname;
```

## Troubleshooting

### Issue: Views return no data

**Cause**: No active demo personas in demo_cohort

**Solution**:
```sql
-- Check demo cohort
SELECT * FROM demo_cohort;

-- If empty, create demo data
SELECT create_demo_scenario('thin_file', 'Test User', 'Test scenario');
```

### Issue: RLS blocking access

**Cause**: User not authenticated or demo cohort policy not matching

**Solution**:
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('risk_events', 'risk_factors', 'alt_score_runs');

-- Verify demo cohort has active users
SELECT COUNT(*) FROM demo_cohort WHERE active = true;
```

### Issue: Orphan records detected

**Cause**: Data inserted without proper ownership reference

**Solution**:
```sql
-- Identify orphan records
SELECT * FROM verify_ownership_integrity();

-- Fix by either:
-- 1. Add missing owner to demo_cohort, or
-- 2. Delete orphan records (if they're invalid test data)
```

## Maintenance

### Regular Tasks

1. **Daily**: Verify integrity
   ```sql
   SELECT * FROM verify_ownership_integrity();
   ```

2. **Weekly**: Review demo cohort
   ```sql
   SELECT persona_type, COUNT(*), MIN(created_at), MAX(created_at)
   FROM demo_cohort
   WHERE active = true
   GROUP BY persona_type;
   ```

3. **Monthly**: Cleanup old test data
   ```sql
   -- Deactivate personas older than 90 days
   UPDATE demo_cohort 
   SET active = false 
   WHERE created_at < now() - interval '90 days';
   ```

## Related Documentation

- [GITHUB_PAGES_SHOWCASE.md](../GITHUB_PAGES_SHOWCASE.md) - Complete showcase architecture
- [DATA_MODEL_EXTENSIONS.md](../DATA_MODEL_EXTENSIONS.md) - Detailed schema documentation
- [CREDIT_SCORING_IMPLEMENTATION.md](../CREDIT_SCORING_IMPLEMENTATION.md) - Credit scoring system

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main documentation in `/docs`
3. Create an issue in the repository with details

## Version History

- **1.0.0** (2024-01-15): Initial release
  - Risk signals tables
  - Alternate scoring support
  - Public views for demo cohort
  - Utility functions
