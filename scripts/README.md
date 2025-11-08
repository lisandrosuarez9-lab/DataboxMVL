# Scripts Directory

This directory contains automation scripts for the CI/CD pipeline and development workflow.

## CI/CD Helper Scripts

### `ownership_audit.sh`

Runs the complete ownership audit process and generates compliance artifacts.

**Usage:**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
export RUN_ID="manual_$(date +%Y%m%d_%H%M%S)_$(uuidgen | cut -c1-8)"
bash scripts/ownership_audit.sh
```

**Outputs:**
- `artifacts/run_id.txt` - Unique run identifier
- `artifacts/ownership_audit_summary.csv` - Orphan counts by table
- `artifacts/ownership_audit_summary.json` - Orphan counts in JSON
- `artifacts/ownership_audit.log` - Complete execution log

**Exit Codes:**
- `0` - Success (no orphans)
- `1` - Failure (orphans detected or execution error)

---

### `api_contract_check.sh`

Validates Supabase Edge Function endpoints are responding correctly.

**Usage:**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
bash scripts/api_contract_check.sh
```

**Outputs:**
- `artifacts/api_contract_check.json` - Test results

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

---

### `ui_audit_snapshot.sh`

Verifies the frontend build output is complete and valid.

**Usage:**
```bash
# Must have dist/ directory from build
npm run build
bash scripts/ui_audit_snapshot.sh
```

**Outputs:**
- `artifacts/ui_audit_snapshot.json` - Validation results
- `artifacts/ui_file_listing.txt` - Complete file listing

**Checks:**
- `index.html` exists
- JavaScript bundle exists (with hash)
- CSS bundle exists (with hash)
- Total file count

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more files missing

---

### `build_pages_report.sh`

Generates comprehensive compliance report from all pipeline artifacts.

**Usage:**
```bash
export RUN_ID="your-run-id"
export GITHUB_ACTOR="username"
export GITHUB_REF_NAME="main"
export GITHUB_SHA="commit-sha"
bash scripts/build_pages_report.sh
```

**Outputs:**
- `artifacts/compliance_report.md` - Comprehensive report

**Report Includes:**
- Pipeline execution summary
- Job status for all 8 jobs
- Ownership audit results
- API contract check results
- UI audit results
- Artifact listing
- Acceptance criteria checklist

**Exit Codes:**
- `0` - Report generated successfully

---

## Development Scripts

### `test-ownership-audit.sh`

Tests the ownership audit implementation without requiring database connection.

**Usage:**
```bash
bash scripts/test-ownership-audit.sh
```

**Tests:**
1. File existence
2. SQL file structure
3. GitHub Actions workflow
4. Documentation completeness

---

### `frontend-smoke-test.cjs`

Performs smoke test on the frontend build.

**Usage:**
```bash
npm run smoke-test
```

---

### `launch-agent.cjs`

**Comprehensive deployment automation agent with deterministic execution.**

The Launch Automation Agent is an obsessive, micro-step playbook that executes end-to-end deployment without improvisation. It validates every step, generates complete audit trails, and provides rollback capability.

**Features:**
- ✅ Deterministic execution with precise validation
- 🔄 Automatic retry with exponential backoff
- 🔐 Smart secret detection (excludes docs/comments)
- 📊 SHA256 checksums for all files
- 🔙 Automatic rollback preparation
- 🤖 CI/CD ready with GitHub Actions workflow
- 📝 Comprehensive logging and telemetry

**Basic Usage:**
```bash
# Dry run (validation only, no deployment)
npm run launch-agent:dry-run

# Full deployment
npm run launch-agent

# Verbose logging
npm run launch-agent:verbose

# Skip specific steps
node scripts/launch-agent.cjs --skip-steps=3,4

# Custom contract
node scripts/launch-agent.cjs --contract=staging.json
```

**Command-Line Options:**
- `--contract=<path>` - Path to contract JSON (default: `launch-contract.json`)
- `--dry-run` - Validate without executing deployment
- `--verbose` or `-v` - Enable detailed logging
- `--skip-steps=<list>` - Skip specific steps (comma-separated)

**Outputs:**
- `artifacts/launch-report.json` - Complete execution report
- `artifacts/file-manifest.json` - Source files with SHA256
- `artifacts/dist-artifact-manifest.json` - Build outputs with SHA256
- `artifacts/response-sample.json` - Function test response
- `artifacts/deploy-report.json` - Deployment metadata
- `artifacts/previous-gh-pages-hash.txt` - Rollback reference
- `artifacts/correlation-<uuid>.log.json` - Detailed logs

**Execution Steps:**
1. **Preflight** - Validate runtime, network, secrets
2. **Step 0** - Load immutable contract
3. **Step 1** - File validation with checksums
4. **Step 2** - Install dependencies and build
5. **Step 3** - Function CORS and POST tests
6. **Step 4** - Deploy to GitHub Pages
7. **Step 5** - End-to-end smoke test
8. **Step 7** - Security hardening checks
9. **Step 8** - Rollback preparation
10. **Step 9** - Generate artifacts
11. **Step 10** - Final report

**Exit Codes:**
- `0` - Success (all checks passed)
- `1` - Failure (one or more checks failed)

**Error Codes:**
- `INVALID_NODE_VERSION` - Node < 18
- `BUILD_FAILED` - npm build failed
- `FUNCTION_AUTH_REQUIRED` - Function needs auth
- `CORS_MISSING` - CORS not configured
- `SECRET_IN_REPO` - Secrets committed to repo
- `SITE_NOT_LIVE` - GitHub Pages not accessible

**Rollback:**
```bash
# Manual rollback to previous deployment
PREV_HASH=$(cat artifacts/previous-gh-pages-hash.txt)
git push origin $PREV_HASH:gh-pages --force
```

**Programmatic Usage:**
```javascript
const { main, AGENT_CONFIG, AGENT_STATE } = require('./launch-agent.cjs');

AGENT_CONFIG.dryRun = true;
await main();

if (AGENT_STATE.errors.length === 0) {
  console.log('Success!');
}
```

**Documentation:**
- **Complete Guide**: `docs/LAUNCH_AGENT.md`
- **Quick Reference**: `docs/LAUNCH_AGENT_QUICK_REF.md`
- **Examples**: `scripts/example-programmatic-usage.cjs`
- **This README**: `scripts/README.md` (Launch Agent section)

**CI/CD Integration:**
See `.github/workflows/launch-agent.yml` for complete GitHub Actions workflow with:
- Automatic deployment on push to main
- Manual trigger with dry-run option
- Artifact uploads and status summaries
- Deployment verification

---

### `example-programmatic-usage.cjs`

Shows 5 complete examples of using the launch agent programmatically:

1. **Custom configuration** - Override defaults
2. **Environment validation** - Pre-flight checks only
3. **Pre-flight then deploy** - Two-stage deployment
4. **Custom error handling** - Handle specific error codes
5. **Monitoring integration** - Send metrics to monitoring system

**Usage:**
```bash
# Run example 1 (custom config)
node scripts/example-programmatic-usage.cjs 1

# Run example 2 (validation only)
node scripts/example-programmatic-usage.cjs 2

# etc.


---

## Integration with CI/CD

All scripts are designed to be called from the GitHub Actions workflow (`.github/workflows/ci-cd-pipeline.yml`) but can also be run manually for local testing.

### Workflow Integration

```yaml
- name: Run ownership audit
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    RUN_ID: ${{ needs.initialize.outputs.run_id }}
  run: bash scripts/ownership_audit.sh
```

---

## Best Practices

### Exit Codes

All scripts follow standard Unix exit code conventions:
- `0` = Success
- `1` = Failure
- Non-zero = Error

### Artifact Generation

Scripts create artifacts in the `artifacts/` directory, which should be:
- Created if it doesn't exist
- Cleaned between runs in CI/CD
- Gitignored (not committed)

### Environment Variables

Scripts use environment variables for configuration:
- Always check if required variables are set
- Provide clear error messages if missing
- Use sensible defaults where appropriate

### Error Handling

Scripts use:
- `set -e` to exit on error
- Clear error messages
- Proper exit codes

---

## Adding New Scripts

When creating new scripts:

1. **Location:** Place in `scripts/` directory
2. **Permissions:** Make executable: `chmod +x scripts/your_script.sh`
3. **Documentation:** Add to this README
4. **Testing:** Test locally before using in CI/CD
5. **Integration:** Update workflow if needed

### Template

```bash
#!/bin/bash
# Description of what this script does

set -e  # Exit on error

# Check required environment variables
if [ -z "${REQUIRED_VAR}" ]; then
  echo "❌ ERROR: REQUIRED_VAR is not set"
  exit 1
fi

echo "=================================================="
echo "Script Name"
echo "=================================================="
echo ""

# Create artifacts directory
mkdir -p artifacts

# Main logic here
echo "Doing something..."

# Generate artifacts
cat > artifacts/output.json << EOF
{
  "status": "success"
}
EOF

echo "✅ Script completed successfully"
exit 0
```

---

## Troubleshooting

### Script Not Executable

```bash
chmod +x scripts/your_script.sh
```

### Missing Dependencies

Some scripts require:
- `postgresql-client` for database scripts
- `curl` for API checks
- `jq` for JSON processing

Install on Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y postgresql-client curl jq
```

### Environment Variables Not Set

Export required variables before running:
```bash
export DATABASE_URL="..."
export SUPABASE_URL="..."
export SUPABASE_ANON_KEY="..."
```

---

## References

- [CI/CD Pipeline Documentation](../docs/CI_CD_PIPELINE.md)
- [Ownership Audit Mandate](../MANDATE.md)
- [GitHub Actions Workflow](../.github/workflows/ci-cd-pipeline.yml)
