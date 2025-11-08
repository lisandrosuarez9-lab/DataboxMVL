# AI Mandate — Single‑CTA Frontend Launch Agent

## Purpose & Scope

**Purpose**: Deterministically create, build, test, and deploy the single‑button GitHub Pages frontend that posts intake to the Supabase score‑checker and renders borrower/enrichment/score. This mandate is written for an automation agent (or engineer‑acting‑as‑agent) and contains every micro‑step, exact command, checks, idempotency rules, outputs, and rollback actions the agent must perform without improvisation.

**Scope**: Write files, install deps, build artifact, validate score‑checker OPTIONS+POST, deploy to gh-pages, run headless or network smoke tests, produce signed artifacts and a single JSON run report. The agent must not fetch or expose SUPABASE_SECRET_KEY.

---

## Immutable Inputs

**Must be provided before any writes**

Provide these exact values as environment variables or contract fields. The agent must refuse to proceed until all are present and verified.

### Required Values

- **SUPABASE_PROJECT_REF** = `rzashahhkafjicjpupww`
- **SCORE_CHECKER_FN_URL** = `https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker`
- **GITHUB_USERNAME** = `lisandrosuarez9-lab`
- **GITHUB_REPO** = `DataboxMVL`
- **GITHUB_PAGES_DOMAIN** = `https://lisandrosuarez9-lab.github.io/DataboxMVL/`
- **GITHUB_PAGES_ORIGIN** = `https://lisandrosuarez9-lab.github.io`
- **SUPABASE_PUBLISHABLE_KEY** = (anon key; agent must request or read from CI secret; do not accept plaintext in logs)
- **CI_BRANCH** = `main`
- **TRUSTED_FUNCTION_NAMES** = `profile-read,admin-worker` (comma list)
- **VAULT_LOCATION** = GitHub Secrets (or operator-provided vault pointer)
- **CONTACT_EMAIL** = `ops@factora.example` (optional)

### Precondition Checks

Agent must assert pass/fail before any file write:

1. **Node >= 18, npm >= 9, git installed** - Log versions
2. **Network reachability** - `api.github.com` and `SCORE_CHECKER_FN_URL` reachable (HTTP HEAD/OPTIONS)
3. **Vault pointer present** for SUPABASE_SECRET_KEY (agent WILL NOT retrieve secret without explicit operator token/permission)

**Success conditions for preflight**: 
- Node & npm versions recorded
- SCORE_CHECKER_FN_URL responds to an OPTIONS check (200/204) or is reachable
- Agent proceeds to Step 1 only on pass

---

## Step‑by‑step Tasks

Execute in order; each step returns explicit pass/fail.

### 1) Repository Readiness

**If repo not cloned:**
```bash
git clone https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO}.git
cd ${GITHUB_REPO}
```

**If repo exists:**
```bash
git fetch origin
git checkout ${CI_BRANCH}
git pull origin ${CI_BRANCH}
```

**Ensure working tree clean:**
```bash
git status --porcelain  # must be empty
```
- If not empty, stash and record stash id

### 2) Create Feature Branch (Idempotent)

```bash
BRANCH=feat/factora-ui
git checkout -b ${BRANCH} || git checkout ${BRANCH}
```

**Success**: `git rev-parse --abbrev-ref HEAD == ${BRANCH}`

### 3) Write Files (Atomic, Idempotent)

For each file in the supplied manifest (package.json, vite.config.js, .gitignore, .env.production stub, src/*, .github/workflows/deploy.yml, README.md):

- Write to tmp path, compute sha256, move into place (`mv tmp -> target`)
- If target exists and sha256 matches expected, skip
- If differs, move existing to `backups/<path>.<ts>` then write
- Permissions: directories 0755, files 0644

**Output**: Produce `files/manifest.json` listing file paths + sha256

Immediately `git add` those files (do not add .env.production if it contains real keys; instead add .env.production.example)

### 4) Commit and Push Feature Branch

```bash
git add <files listed>  # exclude .env.production if contains real keys
git commit -m "feat(ui): single CTA Factora intake + profile card"
git push -u origin ${BRANCH}
```

If push fails due to protection, abort and record error code.

### 5) Local Build (Deterministic)

```bash
# If package-lock.json present
npm ci

# Else
npm install && commit package-lock.json
```

Ensure .env.production present in local FS for build. If publishable key missing, halt and prompt operator.

```bash
npm run build
```

**If build fails**: cleanup caches and retry once:
```bash
rm -rf node_modules .vite dist
npm ci
npm run build
```

**On success**: Produce `dist/artifact-manifest.json` (list files, sizes, sha256). Record build exit code.

### 6) Score‑checker Readiness Checks (Network Tests)

**OPTIONS preflight:**
```bash
curl -s -D - -o /dev/null -X OPTIONS "${SCORE_CHECKER_FN_URL}" \
  -H "Origin: ${GITHUB_PAGES_ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

Verify:
- Status 204 or 200
- Header `access-control-allow-origin` equals `${GITHUB_PAGES_ORIGIN}` or `*`
- `access-control-allow-methods` includes POST

**On failure**: Return `CORS_MISSING` with header dump and stop.

**Deterministic POST smoke:**

Payload exactly:
```json
{
  "full_name": "AI Test User",
  "national_id": "000000000",
  "email": "ai.test@example.com",
  "phone": "+1-000-000-0000",
  "consent": true,
  "consent_text": "I agree",
  "intake_source": "github_pages_demo",
  "intake_form_version": "v1",
  "intent_financing": false,
  "prior_borrowing": false
}
```

```bash
curl -s -D - "${SCORE_CHECKER_FN_URL}" \
  -H "Content-Type: application/json" \
  -d '<payload>'
```

Validate:
- HTTP 200
- JSON with keys: `borrower`, `enrichment`, `score`
- `borrower` must include `borrower_id`, `created_at`
- `score` must include `factora_score`

If 401/403 => `FUNCTION_AUTH_REQUIRED`; stop and surface message to operator.

### 7) Deploy to GitHub Pages (Deterministic)

**Use gh-pages script:**
```bash
npm run deploy
```

Capture created gh-pages commit SHA:
```bash
git ls-remote origin gh-pages
```

**Alternative atomic push:**
```bash
git worktree add /tmp/gh-pages dist
cd /tmp/gh-pages
git add -A
git commit -m "chore(deploy): artifact ${TIMESTAMP}"
git push origin HEAD:gh-pages --force
```

**Record previous gh-pages hash before push:**
```bash
git ls-remote origin gh-pages > artifacts/previous-gh-pages-hash.txt
```

**After push, poll the Pages URL:**

Loop every 15s up to 5 minutes:
```bash
curl -s "${GITHUB_PAGES_DOMAIN}" | grep -q "Get your free Factora Credit Score!"
```

If match => `SITE_UP = true`. If timeout => `deploy_failed`.

### 8) End‑to‑end Smoke Test (Headless Preferred)

**If headless library available**: Run Playwright/Puppeteer script
- Steps: open `${GITHUB_PAGES_DOMAIN}`, click `.cta`, fill fields by aria-label, submit, wait network response
- Assert presence of borrower name and score in DOM

**If headless not available**: Re-run deterministic POST to `SCORE_CHECKER_FN_URL` with Origin header and validate response.

**On success**: Produce `test/response-sample.json` (truncate to 2 levels) and upload to artifacts.

### 9) Observability Insertion (If Permitted)

- Generate `correlation_id` (uuidv4)
- Include header `X-Factora-Correlation-Id` in tests
- Assert the function echoes it or that admin_ops contains that correlation_id
- If agent has DB privileges and operator permission, create `admin_ops` table IF NOT EXISTS and record an invocation row

### 10) Artifacts, Manifests, and Final Report

Produce and sign (HMAC with agent run secret) these artifacts:
- `files/manifest.json` (all source file paths + sha256)
- `dist/artifact-manifest.json` (build outputs)
- `artifacts/response-sample.json` (post sample)
- `artifacts/deploy-report.json` (gh-pages pre/post hashes, timestamps)
- `artifacts/run-report.json` (structured run summary described below)

Upload artifacts to operator-designated artifact store or keep under `repo/artifacts/` (with restricted access).

### 11) Cleanup and Commit Final PR Changes

If .env.production.example was added and package-lock.json was created:
```bash
git add <files>
git commit -m "chore: add deployment artifacts"
git push
```

**Open Pull Request via GitHub CLI:**
```bash
gh pr create --base ${CI_BRANCH} --head ${BRANCH} \
  --title "feat: add Factora UI" \
  --body "Automated PR from launch agent. See docs/LAUNCH_AGENT.md"
```

Attach artifacts to PR or link artifact storage.

---

## Idempotency & Checks

### Idempotency Rules

- **File writes**: Compare SHA256 before overwrite; if identical do nothing
- **Branch creation**: Uses `checkout -b` or `checkout`
- **Build retries**: Happen once after cache clean
- **Deploy**: Stores previous gh-pages hash and will roll back if smoke fails

### Explicit Success Criteria

Agent must assert all true for final success:

- ✅ **files_written**: All target source files exist and have expected sha256
- ✅ **build_success**: `npm run build` exit code 0 and `dist/index.html` present
- ✅ **function_cors_ok**: OPTIONS returned 204/200 and Access-Control headers include origin and POST
- ✅ **function_post_ok**: POST returned 200 and JSON included borrower and score
- ✅ **artifact_manifests_created**: Build and file manifests generated
- ✅ **site_up**: Pages URL returns 200 and contains headline
- ✅ **headless_test_ok** or **network_test_ok**: Profile card rendered or POST validated
- ✅ **no_secrets_in_repo**: `git grep` found no `sb_secret_`, `SUPABASE_SERVICE_ROLE_KEY`, or other secret patterns

---

## Artifacts & Outputs

### Final Run JSON

Agent must output exactly in this shape:

```json
{
  "run_id": "<uuid>",
  "status": "success" | "failed",
  "checks": {
    "files_written": true,
    "build_success": true,
    "function_cors_ok": true,
    "function_post_ok": true,
    "site_up": true,
    "headless_test_ok": true,
    "no_secrets_in_repo": true
  },
  "artifacts": {
    "files_manifest": "path-or-url",
    "dist_manifest": "path-or-url",
    "response_sample": "path-or-url",
    "deploy_report": "path-or-url"
  },
  "errors": []
}
```

### Artifact Files

All artifacts are stored in `artifacts/` directory:

| Artifact | Description |
|----------|-------------|
| `file-manifest.json` | All source file paths with SHA256 checksums |
| `dist-artifact-manifest.json` | Build output files with sizes and checksums |
| `response-sample.json` | Sample API response from smoke test |
| `deploy-report.json` | Deployment timestamps and commit hashes |
| `previous-gh-pages-hash.txt` | Rollback reference |
| `launch-report.json` | Comprehensive run report |

---

## Failure Modes & Rollback

### Error Codes

Agent must map failures to these error codes:

| Error Code | Description | Action |
|------------|-------------|--------|
| **MISSING_PUBLISHABLE_KEY** | Abort, require operator to supply `VITE_SUPABASE_ANON_KEY` | No retry |
| **CORS_MISSING** | Report headers, stop | Suggested patch: add CORS snippet to function and re-run Step 6 |
| **FUNCTION_AUTH_REQUIRED** | Function requires auth | Notify operator to make public intake or provide alternate endpoint |
| **BUILD_FAILED** | Build failed after retry | Attach npm build logs and abort |
| **DEPLOY_FAILED** | Deployment to gh-pages failed | Execute rollback procedure |
| **SECRET_IN_REPO** | Secret detected in repository | Abort and instruct operator to rotate keys and scrub history |
| **HEADLESS_FAIL** | Headless test failed | Mark as degraded if network POST succeeded; attach DOM snapshot |

### Rollback Procedure (Atomic)

**1. If deploy fails or post-deploy smoke fails:**

```bash
git push origin <previous-gh-pages-hash>:gh-pages --force
```

Wait 30s, poll site. If restored, set run status to `failed` and include rollback details.

**2. If secret detected in repo:**

- Immediately stop
- Do NOT attempt to scrub history without operator consent
- Recommend key rotation and incident response

### Security and Operator Approvals

**Agent must pause and request human confirmation before:**

- Writing real .env.production with SUPABASE_PUBLISHABLE_KEY to repo (should be injected in CI instead)
- Creating/updating DB schema (admin_ops) if it lacks explicit permission
- Rotating keys or running git-history destructive scrubs
- Any operation that would publish SUPABASE_SECRET_KEY or modify trusted function secrets

**Operator must respond with these four single-word confirmations before a full run:**
- `vaulted` / `no-secret-on-public` / `fn-url-set` / `post-test-ok`

---

## Execution Example

### Commands Agent Will Run

**Clone/update and branch:**
```bash
git clone https://github.com/lisandrosuarez9-lab/DataboxMVL.git || \
  (cd DataboxMVL && git fetch origin && git checkout main && git pull origin main)
git checkout -b feat/factora-ui
```

**Commit & push:**
```bash
git add <files>
git commit -m "feat(ui): single CTA Factora intake + profile card"
git push -u origin feat/factora-ui
```

**Build:**
```bash
npm ci
npm run build
```

**OPTIONS check:**
```bash
curl -s -D - -o /dev/null -X OPTIONS \
  "https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker" \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "Access-Control-Request-Method: POST"
```

**POST smoke:**
```bash
curl -s -D - "https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"AI Test User", ...}'
```

**Deploy:**
```bash
npm run deploy
# or atomic push
git worktree add /tmp/gh-pages dist
cd /tmp/gh-pages
git add -A
git commit -m "chore(deploy): artifact ${TIMESTAMP}"
git push origin HEAD:gh-pages --force
```

**Poll site:**
```bash
curl -s "https://lisandrosuarez9-lab.github.io/DataboxMVL/" | \
  grep -q "Get your free Factora Credit Score!"
```

---

## Quick Reference

### Launch Agent Commands

```bash
# Standard deployment
npm run launch-agent

# Dry run (validation only)
npm run launch-agent:dry-run

# Verbose logging
npm run launch-agent:verbose

# Direct invocation
node scripts/launch-agent.cjs --contract=launch-contract.json --verbose
```

### Contract Location

The immutable deployment contract is located at: `launch-contract.json`

### Documentation

- Full mandate: `docs/LAUNCH_AGENT_MANDATE.md` (this file)
- Implementation details: `docs/LAUNCH_AGENT.md`
- Quick reference: `docs/LAUNCH_AGENT_QUICK_REF.md`

---

## Summary

This mandate enforces **deterministic, observable, and reversible deployment** for the DataboxMVL single-CTA frontend. Every step is explicit, every check is recorded, every artifact is signed, and every failure mode has a defined remediation path. The agent operates without improvisation, producing immutable evidence of compliance at each stage.
