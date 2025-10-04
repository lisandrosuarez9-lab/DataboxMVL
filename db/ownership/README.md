# Ownership Audit Infrastructure

This directory contains the complete implementation of the **FactorA Universal Ownership & Attribution Mandate** for the DataboxMVL project.

## Overview

The ownership audit system ensures that every operational record is anchored to a valid `profiles.user_id`. This provides:

- **Schema-level sovereignty** - No orphaned records allowed
- **Audit trail** - All ownership changes are logged immutably
- **Compliance enforcement** - CI/CD pipeline fails if orphans are detected
- **Evidence generation** - Automated artifacts for regulatory compliance

## Files

### Migration Scripts

1. **`01_ownership_anchors.sql`** - Step 1: Establishes ownership columns and foreign keys
   - Adds `owner_id UUID` column to all operational tables
   - Creates foreign key constraints to `profiles.user_id`
   - Constraints: `ON UPDATE CASCADE`, `ON DELETE RESTRICT`
   - Idempotent - safe to run multiple times

2. **`02_orphan_detection.sql`** - Step 2: Detects orphaned records
   - Creates temporary `orphan_index` table
   - Scans all tables for NULL or invalid `owner_id` values
   - Reports orphan counts per table

3. **`03_attribution_log.sql`** - Step 3: Creates attribution log
   - Establishes `universal_attribution_log` table
   - Append-only design (no updates or deletes)
   - Tracks all manual ownership attributions
   - Protected by triggers and RLS policies

4. **`04_acceptance_test.sql`** - Step 4: Validates compliance
   - Tests all tables for orphaned records
   - Generates CSV and JSON artifacts
   - Fails if any orphans are detected
   - Passes if all tables are compliant

5. **`run_ownership_audit.sql`** - Master orchestration script
   - Runs all four steps in sequence
   - Generates `run_id.txt` for traceability
   - Produces all required artifacts

## Tables in Scope

The following tables are anchored to `profiles.user_id`:

- `persona`
- `transaccion`
- `remesa`
- `microcredito`
- `factura_utilidad`
- `telco_topup`
- `financial_events`
- `credit_scores`
- `score_runs`

## Usage

### Manual Execution

Run the complete audit locally:

```bash
# Set your database connection
export DATABASE_URL="postgresql://user:password@host:port/database"

# Generate a unique RUN_ID
export RUN_ID="manual_$(date +%Y%m%d_%H%M%S)_$(uuidgen | cut -c1-8)"

# Execute the audit
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v run_id="$RUN_ID" -f db/ownership/run_ownership_audit.sql
```

### Run Individual Steps

Execute steps separately for debugging:

```bash
# Step 1: Add ownership columns and constraints
psql "$DATABASE_URL" -f db/ownership/01_ownership_anchors.sql

# Step 2: Detect orphaned records
psql "$DATABASE_URL" -f db/ownership/02_orphan_detection.sql

# Step 3: Create attribution log
psql "$DATABASE_URL" -f db/ownership/03_attribution_log.sql

# Step 4: Run acceptance test
psql "$DATABASE_URL" -f db/ownership/04_acceptance_test.sql
```

## CI/CD Integration

The ownership audit runs automatically via GitHub Actions:

- **Triggers:**
  - Every push to `main` branch
  - Daily at 2 AM UTC (scheduled)
  - Manual workflow dispatch

- **Configuration:**
  - Set `DATABASE_URL` secret in GitHub → Repo → Settings → Secrets → Actions
  - Format: `postgresql://user:password@host:port/database`

- **Artifacts:**
  - `run_id.txt` - Unique identifier for the run
  - `ownership_audit_summary.csv` - Table-by-table orphan counts
  - `ownership_audit_summary.json` - Same data in JSON format
  - `audit_log.txt` - Complete execution log
  - `summary.md` - Human-readable summary report

- **Failure Handling:**
  - Workflow fails if any orphans are detected
  - Artifacts are uploaded regardless of success/failure
  - Artifacts retained for 90 days

## Manual Attribution

If orphans are detected, you must manually attribute ownership:

```sql
-- 1. Identify orphaned records
SELECT * FROM orphan_index;

-- 2. Determine correct owner for each record
-- (This requires business logic and cannot be automated)

-- 3. Update the record with valid owner_id
UPDATE public.persona 
SET owner_id = '<valid-user-id-from-profiles>' 
WHERE id = '<orphaned-record-id>';

-- 4. Log the attribution
INSERT INTO public.universal_attribution_log 
  (run_id, table_name, record_id, attributed_owner, notes)
VALUES 
  ('manual_YYYYMMDD_HHMMSS', 'persona', '<record-id>', '<owner-id>', 'Manual attribution: <reason>');

-- 5. Re-run the audit to verify
```

## Architecture Principles

### No Placeholders
- Never insert fake or placeholder owners
- All attributions must reference real `profiles.user_id` entries

### No Automatic Attribution
- Orphans are surfaced, not silently fixed
- Manual investigation and attribution required

### Fail-Fast
- Any orphan causes pipeline failure
- Forces explicit remediation

### Immutable Logging
- All attributions logged in `universal_attribution_log`
- Table is append-only - no updates or deletes
- Provides complete audit trail

## Artifacts

All audit runs generate three key artifacts:

### 1. run_id.txt
```
GHA_123456789_42_20240104_020000
```

### 2. ownership_audit_summary.csv
```csv
table_name,remaining_orphans
persona,0
transaccion,0
remesa,0
microcredito,0
factura_utilidad,0
telco_topup,0
financial_events,0
credit_scores,0
score_runs,0
```

### 3. ownership_audit_summary.json
```json
[
  {"table_name": "persona", "remaining_orphans": 0},
  {"table_name": "transaccion", "remaining_orphans": 0},
  ...
]
```

## Monitoring

View audit results:

1. **GitHub Actions:**
   - Go to Actions tab in repository
   - Select "Ownership Audit" workflow
   - Review latest run status and artifacts

2. **Database:**
   ```sql
   -- Check attribution log
   SELECT * FROM public.universal_attribution_log 
   ORDER BY attributed_at DESC 
   LIMIT 50;
   
   -- Count attributions by run
   SELECT 
     run_id,
     COUNT(*) as attribution_count,
     MIN(attributed_at) as first_attribution,
     MAX(attributed_at) as last_attribution
   FROM public.universal_attribution_log
   GROUP BY run_id
   ORDER BY MAX(attributed_at) DESC;
   ```

## Troubleshooting

### Tables Don't Exist
If some tables in scope don't exist yet, the scripts will skip them gracefully with warnings.

### Foreign Key Violations
If adding `owner_id` foreign key fails, there may be existing orphans. Run Step 2 to detect them.

### Connection Issues
Ensure `DATABASE_URL` is correct and the database is accessible from your environment.

### Manual Attribution Not Logged
Always insert into `universal_attribution_log` when manually fixing orphans - this creates an audit trail.

## Future Extensions

- **Audit snapshots:** Store historical summaries for trend analysis
- **Automated notifications:** Alert on orphan detection
- **Dashboard:** Visual compliance monitoring
- **Re-establish auth.users FK:** Once auth system is fully deployed

## Support

For questions or issues with the ownership audit system:
1. Check GitHub Actions logs for detailed error messages
2. Review artifacts for orphan details
3. Consult the main MANDATE.md document
4. Open an issue in the repository
