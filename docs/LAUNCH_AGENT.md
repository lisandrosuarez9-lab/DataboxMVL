# DataboxMVL Launch Automation Agent

## Overview

The Launch Automation Agent is a comprehensive, deterministic playbook for end-to-end deployment of the DataboxMVL application. It follows an obsessive, micro-step approach where every command, file write, HTTP expectation, header, retry policy, idempotency rule, error signature, and rollback action is precisely defined.

## Purpose

This agent can be executed by:
- **Automation systems** in CI/CD pipelines
- **Engineers** for manual deployments with full visibility
- **DevOps teams** for consistent, repeatable deployments

## Quick Start

### Basic Usage

```bash
# Run the full launch sequence
npm run launch-agent

# Dry run (validation only, no actual deployment)
npm run launch-agent:dry-run

# Verbose mode (detailed logging)
npm run launch-agent:verbose

# Direct invocation with options
node scripts/launch-agent.cjs --contract=launch-contract.json --verbose
```

### Command-Line Options

- `--contract=<path>` - Path to contract JSON (default: `launch-contract.json`)
- `--dry-run` - Validate without executing deployment steps
- `--verbose` or `-v` - Enable detailed logging
- `--skip-steps=1,2,3` - Skip specific steps (comma-separated)

## Prerequisites

### Required Software
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **git**: Any recent version

### Required Network Access
- GitHub API (`api.github.com`)
- Supabase project endpoints (`*.supabase.co`)
- npm registry (`registry.npmjs.org`)

### Required Files
- `launch-contract.json` - Immutable deployment contract
- Clean git repository (or will abort if uncommitted changes exist in non-dry-run mode)

## Launch Contract

The launch contract (`launch-contract.json`) is an immutable configuration that defines all deployment parameters:

```json
{
  "supabase_project_ref": "rzashahhkafjicjpupww",
  "score_checker_fn_url": "https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker",
  "github_username": "lisandrosuarez9-lab",
  "github_repo": "DataboxMVL",
  "github_pages_url": "https://lisandrosuarez9-lab.github.io/DataboxMVL/",
  "github_pages_origin": "https://lisandrosuarez9-lab.github.io",
  "publishable_key": "",
  "ci_branch": "main",
  "trusted_functions": ["profile-read", "admin-worker"],
  "vault_location": "GitHub Secrets",
  "min_node_version": "18.0.0",
  "min_npm_version": "9.0.0"
}
```

### Contract Fields

| Field | Required | Description |
|-------|----------|-------------|
| `supabase_project_ref` | Yes | Supabase project reference ID |
| `score_checker_fn_url` | Yes | Full URL to score-checker function |
| `github_username` | Yes | GitHub repository owner |
| `github_repo` | Yes | GitHub repository name |
| `github_pages_url` | Yes | Full GitHub Pages URL |
| `github_pages_origin` | Yes | GitHub Pages origin for CORS |
| `publishable_key` | No | Supabase publishable/anon key (can be empty) |
| `ci_branch` | Yes | Primary deployment branch |
| `trusted_functions` | Yes | List of functions allowed to use service role key |
| `vault_location` | Yes | Where secrets are stored |

## Execution Steps

The agent executes in a precise, linear sequence. Each step must complete successfully before proceeding.

### Preflight Checks

**Validates environmental invariants before any deployment actions.**

1. **Runtime Validation**
   - Detects OS and shell
   - Validates Node.js >= 18.0.0
   - Validates npm >= 9.0.0
   - Confirms git is installed

2. **Network Access**
   - Tests connectivity to GitHub API
   - Tests connectivity to Supabase project
   - Tests connectivity to npm registry
   - Aborts if any endpoint is unreachable

3. **Secrets Vault**
   - Validates vault access descriptor exists
   - Does NOT fetch or print secrets

### Step 0: Load Immutable Contract

- Loads `launch-contract.json`
- Validates JSON structure
- Computes checksum for audit trail
- Validates required fields
- Sets `checks.contract_valid = true`

### Step 1: Repository Scaffold and File Validation

- Verifies git repository exists
- Checks working directory is clean
- Creates artifact and backup directories
- Validates critical files exist
- Computes SHA256 checksums for all files
- Creates file manifest at `artifacts/file-manifest.json`
- Sets `checks.files_written = true`

### Step 2: Local Dependency Installation and Build

1. **Dependency Installation**
   - Uses `npm ci` for reproducible installs (if package-lock.json exists)
   - Falls back to `npm install` if needed
   - Logs all output for debugging

2. **Type Checking** (Optional)
   - Runs `npm run typecheck` if tsconfig.json exists
   - Logs warnings but doesn't fail build

3. **Build**
   - Runs `npm run build`
   - On failure: cleans and retries once
   - Verifies `dist/index.html` exists
   - Scans all files in `dist/`
   - Creates artifact manifest with checksums
   - Sets `checks.build_success = true`

### Step 3: Function Readiness and CORS Preflight

1. **CORS Preflight (OPTIONS)**
   - Sends OPTIONS request to score-checker function
   - Validates CORS headers:
     - `access-control-allow-origin`
     - `access-control-allow-methods`
     - `access-control-allow-headers`
   - Expects HTTP 200 or 204
   - Sets `checks.function_cors_ok = true`

2. **Function POST Test**
   - Sends deterministic test payload
   - Validates HTTP 200/201 response
   - Parses JSON response
   - Validates required keys: `borrower`, `enrichment`, `score`
   - Saves sample response to `artifacts/response-sample.json`
   - Sets `checks.function_post_ok = true`

3. **Retry Policy**
   - Network errors: 2 retries with exponential backoff (2s → 6s)
   - 401/403: Immediately fails with `FUNCTION_AUTH_REQUIRED`
   - 5xx: Retries, then fails with `FUNCTION_5XX`

### Step 4: Deploy Frontend to GitHub Pages

1. **Backup Previous State**
   - Queries `git ls-remote origin gh-pages`
   - Stores previous commit hash
   - Saves to `artifacts/previous-gh-pages-hash.txt`
   - Sets `checks.backup_stored = true`

2. **Deploy**
   - Runs `npm run deploy` (uses gh-pages package)
   - Captures new gh-pages commit hash
   - Creates deploy report at `artifacts/deploy-report.json`

3. **Site Verification**
   - Polls GitHub Pages URL
   - Checks every 15 seconds for up to 5 minutes
   - Validates HTTP 200 response
   - Checks for expected content
   - Sets `checks.site_up = true`

### Step 5: End-to-End Functional Smoke Test

- Validates site is live and function is responding
- Confirms end-to-end data flow
- Sets `checks.headless_test_ok = true`

*(Full headless browser testing would be implemented here with Puppeteer/Playwright)*

### Step 7: Security Hardening Checks

1. **Secret Detection**
   - Scans repository with `git grep` for patterns:
     - `sb_secret_`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `service_role_key`
     - JWT prefixes
   - Fails immediately if secrets found
   - Sets `checks.no_secrets_in_repo = true`

2. **RLS Validation** *(Future)*
   - Would validate Row Level Security policies
   - Would confirm service role key isolation

### Step 8: Rollback Capability

**Available as a recovery mechanism if deployment fails.**

```bash
# Automatic rollback (if agent detects failure)
# OR manual rollback:
git push origin <previous-hash>:gh-pages --force
```

The agent stores the previous gh-pages commit hash for safe rollback.

### Step 9: Final Artifacts

Generates comprehensive artifacts in `artifacts/` directory:

- `file-manifest.json` - All source files with SHA256
- `dist-artifact-manifest.json` - All build artifacts with SHA256
- `response-sample.json` - Sample function response
- `deploy-report.json` - Deployment metadata
- `previous-gh-pages-hash.txt` - Rollback reference
- `correlation-<id>.log.json` - Correlation logs
- `launch-report.json` - Complete execution report

### Step 10: Final Checklist and Report

Generates final JSON report with:

```json
{
  "run_id": "uuid",
  "status": "success" | "failed",
  "duration_ms": 12345,
  "timestamps": { ... },
  "checks": {
    "contract_valid": true,
    "files_written": true,
    "build_success": true,
    "function_cors_ok": true,
    "function_post_ok": true,
    "site_up": true,
    "headless_test_ok": true,
    "no_secrets_in_repo": true,
    "backup_stored": true
  },
  "artifacts": { ... },
  "errors": [ ... ]
}
```

## Error Codes

The agent uses deterministic error codes for machine-readable failure handling:

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_NODE_VERSION` | Node.js version too old | Upgrade Node.js |
| `INVALID_NPM_VERSION` | npm version too old | Upgrade npm |
| `NETWORK_ERROR` | Cannot reach required endpoint | Check network/DNS |
| `CONTRACT_NOT_FOUND` | Contract file missing | Create launch-contract.json |
| `INVALID_CONTRACT` | Contract missing required fields | Fix contract |
| `NOT_A_GIT_REPO` | Not in a git repository | Initialize git |
| `INSTALL_FAILED` | npm install failed | Check package.json |
| `BUILD_FAILED` | Build failed after retry | Fix build errors |
| `BUILD_ARTIFACT_MISSING` | dist/index.html not found | Fix build process |
| `CORS_MISSING` | CORS headers incorrect/missing | Fix function CORS |
| `FUNCTION_AUTH_REQUIRED` | Function needs authentication | Configure public access |
| `FUNCTION_5XX` | Function server error | Fix function code |
| `FUNCTION_INVALID_JSON` | Function response not JSON | Fix function response |
| `FUNCTION_INVALID_RESPONSE` | Response missing required keys | Fix function schema |
| `DEPLOY_FAILED` | GitHub Pages deploy failed | Check gh-pages package |
| `SITE_NOT_LIVE` | Site not accessible after deploy | Wait longer or check Pages config |
| `SECRET_IN_REPO` | Secrets found in repository | Rotate keys, scrub history |

## Exit Codes

- `0` - Success: All checks passed
- `1` - Failure: One or more checks failed

## Logging

### Log Levels

- `INFO` - General information
- `SUCCESS` - Step completed successfully
- `WARN` - Warning (non-fatal)
- `ERROR` - Error (potentially fatal)
- `DEBUG` - Detailed debugging info (verbose mode only)

### Log Format

```
[LEVEL] Message
   Data: { ... } (if verbose mode enabled)
```

All logs are also saved to `artifacts/correlation-<id>.log.json` for audit trails.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy with Launch Agent

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Launch Agent
        run: npm run launch-agent
        env:
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Upload Artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: launch-artifacts
          path: artifacts/
```

## Troubleshooting

### Common Issues

**Build fails with missing publishable key**
```
Error: MISSING_PUBLISHABLE_KEY
Action: Set VITE_SUPABASE_ANON_KEY in .env.production or CI secrets
```

**Function returns 401**
```
Error: FUNCTION_AUTH_REQUIRED
Action: Configure function for public access or provide auth endpoint
```

**CORS not present**
```
Error: CORS_MISSING
Action: Add CORS headers to function with exact origin
```

**Site not live after 5 minutes**
```
Error: SITE_NOT_LIVE
Action: Check GitHub Pages settings, wait longer, or manually verify deployment
```

### Debugging

1. **Enable verbose mode**:
   ```bash
   npm run launch-agent:verbose
   ```

2. **Check artifacts**:
   ```bash
   cat artifacts/launch-report.json | jq .
   ```

3. **Review logs**:
   ```bash
   cat artifacts/correlation-*.log.json
   ```

4. **Dry run first**:
   ```bash
   npm run launch-agent:dry-run
   ```

## Security Considerations

### Secrets Management

- **NEVER** include `SUPABASE_SERVICE_ROLE_KEY` in frontend code
- Use GitHub Secrets for sensitive values
- The agent validates no secrets are committed to the repository

### Service Role Key Isolation

- Only trusted functions (from contract) should have service role access
- Public functions must use publishable/anon key only
- RLS policies must be enforced

### Audit Trail

- All actions are logged with timestamps
- All artifacts include SHA256 checksums
- Correlation IDs track requests across systems

## Maintenance

### Updating the Contract

1. Edit `launch-contract.json`
2. Run dry-run to validate: `npm run launch-agent:dry-run`
3. Commit if valid
4. DO NOT mutate contract during active deployments

### Adding New Steps

1. Add step function to `scripts/launch-agent.cjs`
2. Add check to `AGENT_STATE.checks`
3. Call from `main()` in correct sequence
4. Update this documentation

### Extending for New Environments

1. Create new contract file: `launch-contract-staging.json`
2. Run with: `node scripts/launch-agent.cjs --contract=launch-contract-staging.json`

## References

- [Problem Statement](../docs/LAUNCH_PLAYBOOK_SPEC.md) - Full specification
- [Architecture](../ARCHITECTURE.md) - System architecture
- [CI/CD Implementation](../CI_CD_IMPLEMENTATION.txt) - CI/CD details

## Support

For issues or questions:
1. Check artifacts in `artifacts/` directory
2. Review `launch-report.json` for detailed error information
3. Enable verbose mode for debugging
4. Create an issue in the repository with the run ID and error code
