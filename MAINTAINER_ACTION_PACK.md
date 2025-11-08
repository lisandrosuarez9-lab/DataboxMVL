# Maintainer Action Pack - Complete Deployment Guide

**COPY-PASTE READY: Forward this entire file to maintainer or run in shell**

---

## 0) Context (One Paragraph)

The site is hosted at https://lisandrosuarez9-lab.github.io/DataboxMVL/. Current client errors: asset 404s because Vite was built with base "/" instead of "/DataboxMVL/", and the score-checker function blocks CORS. We must (A) set Vite base to /DataboxMVL/, (B) deploy a safe CORS-enabled demo stub for QA on Supabase (if the production function cannot be changed), (C) build & deploy the site with the publishable anon key and function URL provided at build time, and (D) run smoke/E2E checks and return artifacts for verification.

---

## 1) Create Two Branches and Open PRs (Exact Commands)

Run these commands from the repository root. They create the Vite config patch and the function demo stub patch, push them and open GitHub PRs (requires gh CLI for automatic PR creation — if gh is not available, push and create PRs in GitHub UI with the given titles and bodies).

### 1A — Frontend Patch: Set Vite Base

```bash
git fetch origin --prune
git checkout -b feat/fix/vite-base

cat > vite.config.js <<'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/DataboxMVL/',
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
});
EOF

git add vite.config.js
git commit -m "fix(build): set Vite base to /DataboxMVL for GitHub Pages"
git push -u origin feat/fix/vite-base

# Create PR (if gh CLI available)
gh pr create --base main --head feat/fix/vite-base --title "fix(build): set Vite base to /DataboxMVL" --body $'Problem: built assets referenced root (/) causing 404s when serving from /DataboxMVL/ on GitHub Pages.\n\nSolution: set Vite base to /DataboxMVL/. After merging, rebuild and deploy. CI must provide VITE_PROFILE_FN_URL and VITE_SUPABASE_ANON_KEY at build time.\n\nVerification commands are provided in PR description.'
```

### 1B — Function Patch: Demo CORS-Enabled Stub

```bash
git checkout -b feat/factora-ui-function-patch

mkdir -p artifacts/function-patch/score-checker
cat > artifacts/function-patch/score-checker/index.js <<'EOF'
const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Factora-Correlation-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
function makeResponse(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return makeResponse(405, { error: 'method_not_allowed' });
  let payload;
  try { payload = await req.json(); } catch (e) { return makeResponse(400, { error: 'invalid_json' }); }
  if (!payload?.full_name || !payload?.email || !payload?.national_id) {
    return makeResponse(400, { error: 'missing_fields' });
  }
  const now = new Date().toISOString();
  const borrower = { borrower_id:`demo-${Math.floor(Math.random()*1e6)}`, full_name: payload.full_name, email: payload.email, phone: payload.phone||null, national_id: payload.national_id, created_at: now };
  const score = { score_id:`score-${Math.floor(Math.random()*1e6)}`, factora_score:650, score_band:'fair' };
  const enrichment = { source:'demo', notes:'synthetic demo enrichment' };
  return makeResponse(200, { borrower, enrichment, score, correlation_id: `demo-${Date.now()}` });
}
EOF

git add artifacts/function-patch
git commit -m "chore(function): add CORS-ready demo intake stub for score-checker (patch)"
git push -u origin feat/factora-ui-function-patch

# Create PR (if gh CLI available)
gh pr create --base main --head feat/factora-ui-function-patch --title "chore(function): add CORS-ready demo score-checker stub for QA" --body $'Adds a safe demo stub that returns borrower+score JSON and strict CORS for https://lisandrosuarez9-lab.github.io. Maintainers should deploy this stub to Supabase for QA if the production function is not CORS-enabled or requires auth.\n\nTest commands included in PR description.'
```

**If gh CLI is unavailable:** Push the branches and open two PRs manually with these exact titles and the PR body texts below (see Section 6).

**Return:** The maintainer must paste both PR URLs (or confirm PRs created) back here.

---

## 2) Merge PRs

**Order:** Merge `feat/fix/vite-base` first, then `feat/factora-ui-function-patch`.

If you cannot merge, paste the PR URLs here and include the maintainer username to request merge approval; include this message: *"Please merge these two PRs in order (vite-base then function-patch) and then run the build+deploy steps below."*

**Return:** The maintainer should confirm merges by pasting the merge commit SHAs or PR merge URLs.

---

## 3) Build & Deploy

These commands assume PRs are merged into main. Run from repo root.

### 3A — Provide Build-Time Environment Variables (Do NOT Commit)

Replace the anon key placeholder with the real publishable anon key stored in your secret manager.

```bash
export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
export VITE_SUPABASE_ANON_KEY="sb_publishable_REPLACE_WITH_REAL_ANON"
export VITE_SUPABASE_URL="https://rzashahhkafjicjpupww.supabase.co"
```

### 3B — Build and Deploy (Preferred if `npm run deploy` exists)

```bash
npm ci
# Ensure base present: this build will respect vite.config.js base
npm run build
npm run deploy
```

### 3C — Worktree Deploy Fallback (If deploy script not present)

```bash
npm ci
npm run build
git worktree add /tmp/gh-pages dist || true
pushd /tmp/gh-pages
git init || true
git add -A
git commit -m "chore(deploy): pages $(date -u +%Y%m%dT%H%M%SZ)" || true
git push --force origin HEAD:gh-pages
popd
```

**Return:** Paste the first 120 lines of the site index:

```bash
curl -s 'https://lisandrosuarez9-lab.github.io/DataboxMVL/' -o /tmp/site-index.html
sed -n '1,120p' /tmp/site-index.html
```

---

## 4) Deploy Demo Stub to Supabase

Only if CORS still blocks or production function cannot be changed. This requires the maintainer to have Supabase CLI access for project `rzashahhkafjicjpupww`.

### 4A — Write Stub Locally and Deploy

```bash
# On maintainer machine with supabase CLI logged in
mkdir -p /tmp/score-checker-demo
cat > /tmp/score-checker-demo/index.js <<'EOF'
const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Factora-Correlation-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
function makeResponse(status, payload) { return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS }); }
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return makeResponse(405, { error: 'method_not_allowed' });
  let payload;
  try { payload = await req.json(); } catch (e) { return makeResponse(400, { error: 'invalid_json' }); }
  if (!payload?.full_name || !payload?.email || !payload?.national_id) {
    return makeResponse(400, { error: 'missing_fields' });
  }
  const now = new Date().toISOString();
  const borrower = { borrower_id:`demo-${Math.floor(Math.random()*1e6)}`, full_name: payload.full_name, email: payload.email, phone: payload.phone||null, national_id: payload.national_id, created_at: now };
  const score = { score_id:`score-${Math.floor(Math.random()*1e6)}`, factora_score:650, score_band:'fair' };
  const enrichment = { source:'demo', notes:'synthetic demo enrichment' };
  return makeResponse(200, { borrower, enrichment, score, correlation_id: `demo-${Date.now()}` });
}
EOF

# Deploy
pushd /tmp/score-checker-demo >/dev/null 2>&1 || true
supabase functions deploy score-checker --project-ref rzashahhkafjicjpupww --no-verify-jwt > /tmp/function-deploy-log.txt 2>&1 || true
popd >/dev/null 2>&1 || true

# View deploy log
cat /tmp/function-deploy-log.txt
```

### 4B — Verify Preflight and Smoke POST

```bash
# Test OPTIONS preflight
curl -i -X OPTIONS 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-Factora-Correlation-Id" \
  | tee /tmp/cors-headers.txt

# Test POST smoke
curl -s -D /tmp/score-checker-headers.txt 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Content-Type: application/json" \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "X-Factora-Correlation-Id: smoke-$(date -u +%Y%m%dT%H%M%SZ)" \
  -d '{"full_name":"Lisandro Enrique Suarez Larios","national_id":"0801199723878","email":"lisandrosuarez9@gmail.com","phone":"12105008126","consent":true}' \
  > /tmp/score-checker-response.json

# View response
cat /tmp/score-checker-response.json | head -c 1000
```

**Return:** Paste the full contents of `/tmp/cors-headers.txt` and the first 1000 characters of `/tmp/score-checker-response.json`.

**Expected:**
- `/tmp/cors-headers.txt` contains header: `Access-Control-Allow-Origin: https://lisandrosuarez9-lab.github.io`
- `/tmp/score-checker-response.json` is valid JSON with top-level keys `borrower` and `score`

---

## 5) Post-Deploy Smoke + E2E Runner

If the maintainer wants to run the automated validation we provided, do this:

### 5A — Install the Runner into Repo (If Not Present)

```bash
# From repo root
mkdir -p scripts

# Create scripts/postdeploy-runner.sh (or use the one already in repo)
# The file should already exist if the branch copilot/fix-vite-base-build-deploy was merged
# Ensure it's executable:
chmod +x scripts/postdeploy-runner.sh
```

### 5B — Export Environment and Run the Runner

```bash
export SUPABASE_PROJECT_REF=rzashahhkafjicjpupww
export SCORE_CHECKER_FN_URL=https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
export GITHUB_PAGES_DOMAIN=https://lisandrosuarez9-lab.github.io/DataboxMVL/
export GITHUB_PAGES_ORIGIN=https://lisandrosuarez9-lab.github.io
export AGENT_HAS_FUNCTION_DEPLOY=true    # set true if you deployed stub with supabase CLI above
export ALLOW_FALLBACK_DEMO=true

./scripts/postdeploy-runner.sh
```

**Return:** Paste the entire file `artifacts/run-report.json` created by the runner.

**Expected keys:** `run_id`, `timestamp`, `status` (success|degraded|paused|failed), `checks.*` booleans, `artifacts.*` paths, `errors` array, `notes`.

---

## 6) PR Body Texts

Use these exact bodies if you need to create PRs via web UI.

### Frontend PR Body (Vite Base):

```
fix(build): set Vite base to /DataboxMVL/ for GitHub Pages

Problem:
Built assets were referenced from root (/) causing 404s when the site is served from /DataboxMVL/ (observed 404s for /src/main.tsx and /assets/index.css).

Solution:
Set Vite base to '/DataboxMVL/' so built HTML and asset references include the repository path.

Post-merge steps:
1. Ensure CI build provides the following secrets (do NOT commit):
   - VITE_PROFILE_FN_URL (https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker)
   - VITE_SUPABASE_ANON_KEY (publishable anon key)
2. Trigger CI build or run locally:
   npm ci && npm run build && npm run deploy
3. Verify site at https://lisandrosuarez9-lab.github.io/DataboxMVL/ loads without 404s and that the intake form submit either reaches a CORS-enabled function or the demo fallback shows.

Verification checklist:
- dist/index.html contains /DataboxMVL/ asset paths
- Deployed site loads with no asset 404s
- Intake form can submit (or demo fallback displays)
```

### Function PR Body (Demo Stub):

```
chore(function): add CORS-ready demo score-checker stub for QA

Purpose:
Adds a safe demo stub that returns predictable borrower + score JSON and sets strict CORS headers for https://lisandrosuarez9-lab.github.io. This enables frontend E2E testing while the production function is fixed or when production function requires auth.

Deploy instructions:
1. Deploy using supabase CLI:
   supabase functions deploy score-checker --project-ref rzashahhkafjicjpupww --no-verify-jwt

2. Verify:
   # OPTIONS preflight
   curl -i -X OPTIONS 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
     -H "Origin: https://lisandrosuarez9-lab.github.io" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type, Authorization, X-Factora-Correlation-Id"

   # POST smoke
   curl -s -D /tmp/score-checker-headers.txt 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
     -H "Content-Type: application/json" \
     -H "Origin: https://lisandrosuarez9-lab.github.io" \
     -H "X-Factora-Correlation-Id: smoke-$(date -u +%Y%m%dT%H%M%SZ)" \
     -d '{"full_name":"Smoke Test","national_id":"000000000","email":"smoke@example.com","phone":"+1-000-000-0000","consent":true}' \
     | jq .

Acceptance:
- OPTIONS returns Access-Control-Allow-Origin header for the pages origin
- POST returns borrower + score JSON
- Frontend E2E shows ProfileCard on submit
```

---

## 7) What the Maintainer Must Paste Back Here

**Minimal set, in order:**

1. **PR URLs** for both PRs (or confirmation they were merged and merge SHAs)

2. **Site index output:**
   ```bash
   sed -n '1,120p' /tmp/site-index.html
   ```

3. **CORS and function response:**
   - Full content of `/tmp/cors-headers.txt`
   - First 1000 chars of `/tmp/score-checker-response.json`

4. **Run report** (if postdeploy-runner was executed):
   ```bash
   cat artifacts/run-report.json
   ```

5. **E2E artifacts** (if Playwright used):
   - First 1000 chars of `artifacts/headless-dom.html`
   - First 200 lines of `artifacts/headless-run.log`

**I will parse each returned artifact and respond with the single next action** (a one-line fix, a single command, or a PR comment) until the intake form submission renders a ProfileCard successfully.

---

## 8) Emergency Fallback

If none of the above can be run immediately, ask the maintainer to at least do this one thing now (fastest manual intervention):

### Quick One-Time Deploy

```bash
# Merge the branches (feat/fix/vite-base and feat/factora-ui-function-patch)
# Then run:

# Set environment variables
export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
export VITE_SUPABASE_ANON_KEY="sb_publishable_PLACEHOLDER"
export VITE_SUPABASE_URL="https://rzashahhkafjicjpupww.supabase.co"

# Build and deploy with correct base
npm ci
npm run build
npm run deploy

# OR if deploy script doesn't work:
npm ci
npm run build
git worktree add /tmp/gh-pages dist
cd /tmp/gh-pages
git init
git add -A
git commit -m "deploy: $(date)"
git push --force origin HEAD:gh-pages
```

After that, open the site at https://lisandrosuarez9-lab.github.io/DataboxMVL/ and:
- Check browser DevTools Console for any errors
- Try to submit the intake form
- Paste back the first console error if any, OR confirm ProfileCard appears

---

## 9) Manual Browser Verification

After deployment, manually verify in browser:

1. **Open:** https://lisandrosuarez9-lab.github.io/DataboxMVL/
2. **Open DevTools:** Press F12
3. **Check Network Tab:**
   - Refresh page
   - Verify no 404 errors for assets
   - All asset URLs should include `/DataboxMVL/` prefix
4. **Test Form Submission:**
   - Click the main CTA button
   - Fill intake form:
     - Full Name: `Test User`
     - National ID: `000000000`
     - Email: `test@example.com`
     - Phone: `+1-000-000-0000`
   - Submit form
   - Watch Network tab for POST request to score-checker
5. **Verify Results:**
   - POST should return HTTP 200 (not 404, 401, 403, or CORS error)
   - ProfileCard should appear with borrower information
   - Note any console errors

**Paste back:**
- Any console errors
- Network request status for score-checker
- Whether ProfileCard appeared
- If ProfileCard appeared, paste the DOM snippet showing the name and score

---

## 10) Troubleshooting Quick Reference

### Issue: Assets Return 404

**Symptoms:** Site loads but CSS/JS return 404
**Fix:**
```bash
# Verify vite config has base
grep "base:" vite.config.js  # Should show: base: '/DataboxMVL/',

# Rebuild
npm run build

# Verify dist has correct paths
grep "/DataboxMVL/" dist/index.html

# Redeploy
npm run deploy
```

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS policy errors
**Fix:** Deploy demo stub (see Section 4)

### Issue: Function Returns 401/403

**Symptoms:** POST returns authentication error
**Fix:** 
- Do NOT use service role key
- Deploy demo stub (doesn't require auth)
- Or implement backend proxy

### Issue: Environment Variables Missing

**Symptoms:** Function URL not in build
**Fix:**
```bash
# Ensure env vars set before build
export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
export VITE_SUPABASE_ANON_KEY="your-anon-key"

# Rebuild
npm run build

# Verify
grep -r "score-checker" dist/assets/
```

---

## Summary

**This action pack provides:**
- ✅ Exact git commands to create branches and PRs
- ✅ Complete file contents for Vite config and function stub
- ✅ Build and deployment commands with environment variables
- ✅ Function deployment commands for Supabase
- ✅ Verification commands with expected outputs
- ✅ PR body templates for manual PR creation
- ✅ Post-deploy runner invocation
- ✅ Emergency fallback procedure
- ✅ Manual browser verification steps
- ✅ Troubleshooting quick reference

**Maintainer should follow sections 1-7 in order and return the requested artifacts for analysis.**

---

*Generated: 2025-11-08*
*Status: READY FOR MAINTAINER EXECUTION*
