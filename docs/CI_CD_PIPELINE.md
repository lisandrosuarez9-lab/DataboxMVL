# GitHub Actions CI/CD Pipeline Documentation

## Overview

This document describes the comprehensive CI/CD pipeline implemented for GitHub Actions, which automates the complete deployment, testing, and compliance verification process for the DataboxMVL project.

## Workflow File

**Location:** `.github/workflows/ci-cd-pipeline.yml`

## Triggers

The pipeline is triggered by:
- **Push to main branch** - Automatic deployment on every commit
- **Daily schedule** - At 2 AM UTC for continuous compliance monitoring
- **Manual dispatch** - Via GitHub Actions UI

## Architecture

The pipeline consists of 8 jobs that execute in sequence with proper dependency management:

```
Initialize → Database Deploy → Demo Seed → Edge Functions Deploy
                    ↓              ↓              ↓
                Frontend Build → Integration Tests → E2E + Deploy
                                        ↓
                                Compliance Summary
```

## Jobs Description

### Job 1: Initialize RUN_ID

**Purpose:** Generate a unique identifier for the pipeline run

**Actions:**
- Generates UTC-tagged RUN_ID in format: `GHA_{run_id}_{run_number}_{timestamp}`
- Stores RUN_ID in `artifacts/run_id.txt`
- Makes RUN_ID available to all downstream jobs

**Outputs:**
- `run_id` - Used by all subsequent jobs

**Artifacts:**
- `run-id/run_id.txt`

---

### Job 2: Database Deployment

**Purpose:** Deploy database schema and verify ownership integrity

**Dependencies:** `initialize`

**Prerequisites:**
- `DATABASE_URL` secret must be configured

**Actions:**
1. Installs PostgreSQL client tools
2. Tests database connectivity
3. Deploys schema scripts in order:
   - `01_tables.sql` - Core tables
   - `02_public_views.sql` - Read-only public views
   - `03_functions.sql` - Database functions
4. Runs ownership audit via `scripts/ownership_audit.sh`

**Failure Conditions:**
- Database connection failure
- SQL syntax errors
- Orphaned records detected (orphan count > 0)

**Artifacts:**
- `database-deployment-{RUN_ID}/`
  - `run_id.txt`
  - `ownership_audit_summary.csv`
  - `ownership_audit_summary.json`
  - `ownership_audit.log`

---

### Job 3: Demo Seed

**Purpose:** Populate database with demo data and verify integrity

**Dependencies:** `initialize`, `database-deployment`

**Prerequisites:**
- `DATABASE_URL` secret must be configured
- Database schema already deployed

**Actions:**
1. Applies demo seed data: `04_demo_data.sql`
2. Verifies data integrity:
   - Persona count: 10-15 expected
   - Financial events per persona: ≥3 expected
   - Risk factors per persona: ≥1 expected
3. Re-runs ownership audit to ensure no orphans

**Failure Conditions:**
- SQL execution errors
- Data verification failures (warnings only)
- Orphaned records detected

**Artifacts:**
- `demo-seed-{RUN_ID}/`
  - Same artifacts as database-deployment

---

### Job 4: Edge Functions Deployment

**Purpose:** Validate and deploy Supabase Edge Functions

**Dependencies:** `initialize`, `database-deployment`

**Prerequisites:**
- `SUPABASE_URL` secret must be configured
- `SUPABASE_ANON_KEY` secret must be configured

**Actions:**
1. Sets up Deno runtime
2. Validates Edge Function syntax with `deno check`
3. Runs smoke tests via `scripts/api_contract_check.sh`
4. Validates endpoints are responding

**Failure Conditions:**
- Syntax errors in Edge Functions
- Endpoint not responding
- API contract violations

**Artifacts:**
- `edge-functions-{RUN_ID}/`
  - `api_contract_check.json`

**Note:** Full deployment to Supabase is manual via Supabase CLI. This job only validates the functions.

---

### Job 5: Frontend Build

**Purpose:** Build the frontend application

**Dependencies:** `initialize`

**Actions:**
1. Sets up Node.js 18
2. Installs dependencies: `npm ci`
3. Runs type checking: `npm run typecheck`
4. Builds production bundle: `npm run build`
5. Verifies build output in `dist/` directory

**Failure Conditions:**
- Dependency installation failure
- Type checking errors
- Build failures
- Missing build output

**Artifacts:**
- `frontend-build-{RUN_ID}/dist/` - Complete production bundle

---

### Job 6: Integration Tests

**Purpose:** Run integration tests on built artifacts

**Dependencies:** `initialize`, `frontend-build`, `edge-functions-deployment`

**Actions:**
1. Downloads frontend build artifact
2. Runs API contract check: `scripts/api_contract_check.sh`
3. Runs UI audit snapshot: `scripts/ui_audit_snapshot.sh`
   - Verifies `index.html` exists
   - Verifies JavaScript bundle exists (with hash)
   - Verifies CSS bundle exists (with hash)
   - Counts total files in build

**Failure Conditions:**
- API endpoints not responding
- Missing critical UI files
- Build output verification failure

**Artifacts:**
- `integration-tests-{RUN_ID}/`
  - `api_contract_check.json`
  - `ui_audit_snapshot.json`
  - `ui_file_listing.txt`

---

### Job 7: E2E Tests + Pages Deploy

**Purpose:** Run E2E tests and deploy to GitHub Pages

**Dependencies:** `initialize`, `integration-tests`

**Actions:**
1. Downloads frontend build artifact
2. Installs dependencies
3. Serves `dist/` locally on port 3000
4. Runs E2E tests (currently placeholder smoke test)
5. Configures GitHub Pages
6. Uploads pages artifact
7. Deploys to GitHub Pages

**Failure Conditions:**
- E2E test failures
- Deployment failures

**Artifacts:**
- `e2e-tests-{RUN_ID}/`
  - `e2e_test_results.json`
  - `deployment_url.txt`

**Environment:**
- `github-pages` environment with deployment URL

---

### Job 8: Compliance Summary

**Purpose:** Generate comprehensive compliance report

**Dependencies:** All previous jobs

**Execution:** Always runs, even if previous jobs fail

**Actions:**
1. Downloads all artifacts from previous jobs
2. Consolidates artifacts into single directory
3. Generates compliance report: `scripts/build_pages_report.sh`
4. Displays summary in workflow logs

**Artifacts:**
- `compliance-summary-{RUN_ID}/`
  - `compliance_report.md` - Comprehensive report
  - All consolidated artifacts from previous jobs

---

## Configuration

### Required Secrets

Configure these in: **GitHub → Repository → Settings → Secrets → Actions**

1. **`DATABASE_URL`** (Optional)
   - PostgreSQL connection string
   - Format: `postgresql://user:password@host:port/database`
   - Required for: Database deployment, Demo seed

2. **`SUPABASE_URL`** (Optional)
   - Supabase project URL
   - Format: `https://{project_id}.supabase.co`
   - Required for: Edge Functions deployment, API contract checks

3. **`SUPABASE_ANON_KEY`** (Optional)
   - Supabase anonymous API key
   - Required for: Edge Functions deployment, API contract checks

**Note:** Jobs will gracefully skip if their required secrets are not configured.

---

## Artifacts

### Retention

All artifacts are retained for **90 days** and can be downloaded from the GitHub Actions UI.

### Naming Convention

Artifacts are named: `{job-name}-{RUN_ID}`

Example: `database-deployment-GHA_123456789_42_20240105_020000`

### Contents

Each job produces specific artifacts documented in the job descriptions above.

---

## Failure Handling

### Fail-Fast Behavior

The pipeline implements fail-fast behavior:
- Any orphaned records → Immediate failure
- Build errors → Immediate failure
- Type check errors → Immediate failure
- API contract mismatches → Immediate failure
- E2E test failures → Immediate failure

### Artifact Upload

Artifacts are **always uploaded**, even on failure, to aid in debugging.

### Job Dependencies

Jobs respect dependencies:
- If a parent job fails, dependent jobs are skipped
- The compliance summary job always runs to collect available artifacts

---

## Monitoring

### Workflow Status

Monitor workflow execution:
1. Go to **GitHub → Repository → Actions**
2. Select the **CI/CD Pipeline - GitHub Actions** workflow
3. View run history and details

### Viewing Artifacts

1. Click on a workflow run
2. Scroll to the **Artifacts** section
3. Download artifacts for review

### Log Analysis

Each job provides detailed logs:
- Step-by-step execution
- Error messages with context
- Summary statistics

---

## Troubleshooting

### Database Connection Failures

**Symptoms:** Database deployment job fails with connection timeout

**Solutions:**
1. Verify `DATABASE_URL` secret is correctly formatted
2. Check database firewall rules allow GitHub Actions IPs
3. Verify database is accessible from internet

### Orphaned Records Detected

**Symptoms:** Ownership audit fails with orphan count > 0

**Solutions:**
1. Download `ownership_audit_summary.csv` artifact
2. Identify tables with orphans
3. Run manual attribution process (see MANDATE.md)
4. Re-run workflow

### Build Failures

**Symptoms:** Frontend build job fails

**Solutions:**
1. Review build logs for error messages
2. Check for TypeScript errors
3. Verify all dependencies are declared in `package.json`
4. Test build locally: `npm run build`

### E2E Test Failures

**Symptoms:** E2E tests fail

**Solutions:**
1. Download `e2e_test_results.json` artifact
2. Review test logs for specific failures
3. Test locally: Serve `dist/` and run tests
4. Update tests or fix application code

---

## Extending the Pipeline

### Adding New Jobs

1. Add job definition to `.github/workflows/ci-cd-pipeline.yml`
2. Set appropriate `needs:` dependencies
3. Define `steps:` for the job
4. Upload artifacts if needed

### Adding New Tests

1. Create test script in `scripts/` directory
2. Make script executable: `chmod +x scripts/your_script.sh`
3. Call script from appropriate job
4. Update compliance report to include results

### Modifying Existing Jobs

1. Update job definition in workflow file
2. Test changes on a feature branch first
3. Verify artifacts are still generated correctly
4. Update this documentation

---

## Best Practices

### Development Workflow

1. Create feature branch
2. Make changes
3. Push to feature branch
4. Review workflow execution on feature branch
5. Merge to main when all checks pass

### Artifact Management

- Download critical artifacts before they expire (90 days)
- Review compliance reports regularly
- Keep ownership audit summaries for audit trail

### Secret Management

- Rotate secrets regularly
- Use separate secrets for dev/staging/prod
- Never commit secrets to repository

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Ownership Audit Mandate](../MANDATE.md)
- [Database Deployment Guide](../docs/DATABASE_DEPLOYMENT_GUIDE.md)
- [Ownership Audit Infrastructure](../db/ownership/README.md)

---

## Support

For issues or questions:
1. Review workflow logs in GitHub Actions
2. Download and review artifacts
3. Check this documentation
4. Open an issue in the repository

---

*Last updated: 2025-10-05*
