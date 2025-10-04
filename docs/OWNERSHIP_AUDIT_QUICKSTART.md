# Ownership Audit Quick Start Guide

This guide provides a quick overview of the ownership audit system and how to use it.

## What Is This?

The **FactorA Universal Ownership & Attribution Mandate** ensures every record in your operational tables is anchored to a valid user in the `profiles` table. This provides:

- **Data sovereignty** - Every record has a known owner
- **Audit compliance** - Complete trail of all ownership changes
- **Automated enforcement** - CI/CD pipeline fails if orphans exist
- **Regulatory evidence** - Automated artifact generation

## Quick Start

### 1. Configure Database Access

Add the `DATABASE_URL` secret to your GitHub repository:

1. Go to: **GitHub → Your Repository → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Name: `DATABASE_URL`
4. Value: Your PostgreSQL connection string
   ```
   postgresql://username:password@host:port/database
   ```
5. Click **"Add secret"**

### 2. Run the Audit

The audit runs automatically:
- ✅ On every push to `main` branch
- ✅ Daily at 2 AM UTC (scheduled)
- ✅ Manual trigger via GitHub Actions

**To run manually:**
1. Go to: **GitHub → Actions → Ownership Audit**
2. Click **"Run workflow"**
3. Select branch and click **"Run workflow"**

### 3. Review Results

Check the workflow status:
- **✅ Green check** = All tables compliant, no orphans
- **❌ Red X** = Orphans detected, action required

Download artifacts:
1. Click on the failed workflow run
2. Scroll down to **"Artifacts"**
3. Download `ownership-audit-*` artifact
4. Review:
   - `ownership_audit_summary.csv` - Orphan counts per table
   - `ownership_audit_summary.json` - Same data in JSON
   - `audit_log.txt` - Complete execution log
   - `summary.md` - Human-readable summary

## What Happens If Orphans Are Found?

### Step 1: Identify Orphaned Records

The CSV/JSON artifacts show which tables have orphans:

```csv
table_name,remaining_orphans
persona,5
transaccion,12
remesa,0
...
```

### Step 2: Investigate

Connect to your database and examine the orphans:

```sql
-- For persona table
SELECT * FROM public.persona 
WHERE owner_id IS NULL 
   OR owner_id NOT IN (SELECT user_id FROM public.profiles);
```

### Step 3: Attribute Ownership

Manually assign valid owners (requires business logic):

```sql
-- Update the record
UPDATE public.persona 
SET owner_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'  -- Valid user_id from profiles
WHERE id = 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy';      -- Orphaned record id

-- Log the attribution
INSERT INTO public.universal_attribution_log 
  (run_id, table_name, record_id, attributed_owner, notes)
VALUES 
  ('manual_20240104', 'persona', 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy', 
   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Manual attribution: migrated legacy data');
```

### Step 4: Re-run the Audit

After fixing orphans, re-run the workflow to verify compliance.

## Manual Execution

To run the audit locally (requires `psql`):

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:port/db"
export RUN_ID="manual_$(date +%Y%m%d_%H%M%S)"

# Run the complete audit
psql "$DATABASE_URL" -f db/ownership/run_ownership_audit.sql

# Check artifacts
ls -lh /tmp/ownership_audit_summary.*
```

## Troubleshooting

### "DATABASE_URL secret not found"

➡️ **Solution:** Configure the secret in GitHub repository settings (see Step 1 above)

### "Failed to connect to database"

➡️ **Possible causes:**
- Database is not accessible from GitHub Actions
- Firewall blocking connections
- Incorrect connection string format
- Database credentials expired

➡️ **Solution:** Verify database allows connections from GitHub Actions IPs or use a different access method

### "Foreign key constraint violation"

➡️ **Cause:** Trying to add `owner_id` foreign key when orphans already exist

➡️ **Solution:** 
1. Run Step 2 (orphan detection) to identify orphans
2. Fix orphans manually
3. Re-run Step 1 to add constraints

### "Table does not exist"

➡️ **Cause:** Some tables in scope haven't been created yet

➡️ **Solution:** This is normal. Scripts gracefully skip non-existent tables.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ profiles Table (Central Authority)                  │
│  - user_id (UUID, PRIMARY KEY)                      │
│  - email, created_at, etc.                          │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ Foreign Key (ON UPDATE CASCADE, ON DELETE RESTRICT)
                    │
        ┌───────────┴───────────┬─────────────┬──────────────┐
        │                       │             │              │
┌───────▼────────┐    ┌────────▼────────┐   │    ┌────────▼────────┐
│ persona        │    │ transaccion     │   │    │ remesa          │
│  - owner_id    │    │  - owner_id     │  ...   │  - owner_id     │
└────────────────┘    └─────────────────┘        └─────────────────┘
```

All operational tables → `profiles.user_id` via `owner_id` foreign key

## Key Files

| File | Purpose |
|------|---------|
| `MANDATE.md` | Complete specification |
| `db/ownership/README.md` | Detailed technical documentation |
| `db/ownership/run_ownership_audit.sql` | Master script (runs all steps) |
| `.github/workflows/ownership-audit.yml` | CI/CD automation |
| `scripts/test-ownership-audit.sh` | Test suite |

## Support

- **Documentation:** See `db/ownership/README.md` for detailed technical info
- **Testing:** Run `bash scripts/test-ownership-audit.sh` to validate setup
- **Logs:** Check GitHub Actions logs for detailed error messages
- **Artifacts:** Download from failed workflow runs for detailed analysis

## Important Rules

1. **No Placeholders** - Never use fake/dummy owner IDs
2. **No Auto-Attribution** - All ownership must be manually assigned
3. **Fail-Fast** - Pipeline fails immediately if orphans exist
4. **Immutable Log** - All attributions logged permanently
5. **Manual Investigation** - Business logic required to determine correct owners

## Success Criteria

✅ **All tests passing** = No orphaned records in any table  
❌ **Tests failing** = Orphans detected, manual remediation required

The goal is to maintain 100% ownership compliance at all times.
