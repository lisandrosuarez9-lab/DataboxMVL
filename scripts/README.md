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
