# PR Text and Deploy Commands for Maintainers

## Overview
This document contains exact PR text and deployment commands for maintainers to complete the Vite base fix, function stub deployment, and end-to-end validation.

---

## PR #1: Vite Base Configuration Fix

### Title
```
fix(build): set Vite base to /DataboxMVL/ for GitHub Pages
```

### Body
```markdown
## Problem
Built assets referenced root path (`/`) causing 404 errors on GitHub Pages at `/DataboxMVL/` subdirectory.

Examples of broken paths:
- `/src/main.tsx` → 404
- `/assets/index.css` → 404
- `/assets/index.js` → 404

## Solution
Set Vite base configuration to `/DataboxMVL/` so all asset URLs include the repository path prefix.

**Changes:**
- ✅ `vite.config.ts` - Set `base: '/DataboxMVL/'`
- ✅ Build artifacts verified - all paths include `/DataboxMVL/` prefix
- ✅ Environment variables properly embedded in bundle

## Post-Merge Required Actions

### 1. Configure Secrets (if using CI/CD)
Add these secrets to GitHub repository settings (Settings → Secrets and variables → Actions):
- `VITE_PROFILE_FN_URL` = `https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker`
- `VITE_SUPABASE_ANON_KEY` = `[your publishable anon key]`
- `VITE_SUPABASE_URL` = `https://rzashahhkafjicjpupww.supabase.co`

**⚠️ IMPORTANT:** Never commit `SUPABASE_SERVICE_ROLE_KEY` - only use anon key in frontend!

### 2. Build and Deploy

#### Option A: Local deployment
```bash
# Set environment variables (do NOT commit these)
export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
export VITE_SUPABASE_ANON_KEY="your-anon-key-here"
export VITE_SUPABASE_URL="https://rzashahhkafjicjpupww.supabase.co"

# Build and deploy
npm ci
npm run build
npm run deploy
```

#### Option B: Using post-deploy script
```bash
export SUPABASE_PROJECT_REF=rzashahhkafjicjpupww
export SCORE_CHECKER_FN_URL=https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
export GITHUB_PAGES_DOMAIN=https://lisandrosuarez9-lab.github.io/DataboxMVL/
export GITHUB_PAGES_ORIGIN=https://lisandrosuarez9-lab.github.io
export AGENT_HAS_FUNCTION_DEPLOY=false

chmod +x scripts/postdeploy-runner.sh
./scripts/postdeploy-runner.sh
```

### 3. Verify Deployment
After deployment completes:

**A. Check site loads**
```bash
curl -I https://lisandrosuarez9-lab.github.io/DataboxMVL/
# Expected: HTTP 200
```

**B. Verify asset paths**
```bash
curl -s https://lisandrosuarez9-lab.github.io/DataboxMVL/ | grep -o '/DataboxMVL/assets/[^"]*' | head -5
# Expected: All paths include /DataboxMVL/ prefix
```

**C. Manual browser test**
1. Open https://lisandrosuarez9-lab.github.io/DataboxMVL/
2. Open DevTools (F12) → Network tab
3. Refresh page
4. Verify: No 404 errors for assets
5. Verify: All asset URLs contain `/DataboxMVL/`

## Expected Results
- ✅ Site loads without errors
- ✅ All assets load from `/DataboxMVL/assets/`
- ✅ No 404 errors in browser console
- ✅ Hero section visible with CTA button
- ✅ Form submission reaches function endpoint (may show CORS error until function deployed)

## Related
- Function stub PR: #[PR_NUMBER]
- Deployment documentation: `DEPLOYMENT_INSTRUCTIONS.md`
- Verification summary: `artifacts/VERIFICATION_SUMMARY.md`
```

---

## PR #2: Function Stub for QA

### Title
```
chore(function): add demo CORS-ready score-checker stub for QA
```

### Body
```markdown
## Purpose
Provides a safe, deterministic demo function stub that:
- Returns synthetic borrower + score data
- Includes proper CORS headers for `https://lisandrosuarez9-lab.github.io`
- Enables frontend E2E testing without production function access
- Contains no secrets or sensitive data

## Location
`artifacts/function-patch/score-checker/index.js`

## Features
- ✅ OPTIONS preflight handler (HTTP 204)
- ✅ POST with input validation
- ✅ CORS headers: `Access-Control-Allow-Origin: https://lisandrosuarez9-lab.github.io`
- ✅ Correlation ID support via `X-Factora-Correlation-Id` header
- ✅ Deterministic demo responses (borrower, score, enrichment)
- ✅ Error handling (400 for invalid JSON, 405 for wrong method, 500 for errors)
- ✅ Safe for public deployment (no secrets)

## Deployment Instructions

### Prerequisites
- Supabase CLI installed and authenticated
- Project access to `rzashahhkafjicjpupww`

### Deploy Command
```bash
cd artifacts/function-patch
supabase functions deploy score-checker \
  --project-ref rzashahhkafjicjpupww \
  --no-verify-jwt
```

Expected output:
```
Deploying function score-checker...
Function score-checker deployed successfully.
```

## Post-Deployment Verification

### Test 1: OPTIONS Preflight (CORS)
```bash
curl -i -X OPTIONS 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-Factora-Correlation-Id"
```

**Expected Headers:**
```
HTTP/2 204
access-control-allow-origin: https://lisandrosuarez9-lab.github.io
access-control-allow-methods: GET, POST, OPTIONS
access-control-allow-headers: Content-Type, Authorization, X-Factora-Correlation-Id
access-control-max-age: 86400
```

### Test 2: POST Smoke Test
```bash
curl -s -D /tmp/score-checker-headers.txt \
  'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Content-Type: application/json" \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "X-Factora-Correlation-Id: smoke-$(date -u +%Y%m%dT%H%M%SZ)" \
  -d '{
    "full_name": "Lisandro Enrique Suarez Larios",
    "national_id": "0801199723878",
    "email": "lisandrosuarez9@gmail.com",
    "phone": "12105008126",
    "consent": true
  }' | jq .
```

**Expected Response (HTTP 200):**
```json
{
  "borrower": {
    "borrower_id": "demo-123456",
    "full_name": "Lisandro Enrique Suarez Larios",
    "email": "lisandrosuarez9@gmail.com",
    "phone": "12105008126",
    "national_id": "0801199723878",
    "created_at": "2025-11-08T05:00:00.000Z"
  },
  "enrichment": {
    "source": "demo",
    "notes": "synthetic demo enrichment"
  },
  "score": {
    "score_id": "score-123456",
    "factora_score": 650,
    "score_band": "fair"
  },
  "correlation_id": "demo"
}
```

### Test 3: Error Handling
```bash
# Test missing fields (should return 400)
curl -s 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Content-Type: application/json" \
  -d '{}' | jq .

# Expected: {"error":"missing_fields"}

# Test wrong method (should return 405)
curl -s -X GET 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' | jq .

# Expected: {"error":"method_not_allowed"}
```

## Integration with Frontend
Once deployed, the frontend at https://lisandrosuarez9-lab.github.io/DataboxMVL/ can:
1. Submit intake form
2. Receive proper CORS headers
3. Display ProfileCard with demo data
4. Complete E2E flow without production function access

## Security
- ✅ No secrets or credentials in code
- ✅ Only accepts POST from allowed origin
- ✅ Input validation prevents injection
- ✅ Safe synthetic data only
- ✅ Suitable for public deployment

## Related
- Vite base PR: #[PR_NUMBER]
- E2E workflow: `.github/workflows/e2e-on-deploy.yml`
```

---

## Exact Deploy Commands Reference

### 1. Deploy Static Site (GitHub Pages)

#### Using npm script
```bash
# Ensure environment variables are set
export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
export VITE_SUPABASE_ANON_KEY="your-publishable-anon-key"
export VITE_SUPABASE_URL="https://rzashahhkafjicjpupww.supabase.co"

# Build and deploy
npm ci
npm run build
npm run deploy
```

#### Using git worktree (atomic deploy)
```bash
# Build
npm ci
npm run build

# Create worktree and push
git worktree add /tmp/gh-pages dist
cd /tmp/gh-pages
git init
git add -A
git commit -m "chore(deploy): pages $(date -u +%Y%m%dT%H%M%SZ)"
git remote add origin git@github.com:lisandrosuarez9-lab/DataboxMVL.git
git push --force origin HEAD:gh-pages
```

### 2. Deploy Function Stub (Supabase)

```bash
# From repository root
cd artifacts/function-patch

# Deploy
supabase functions deploy score-checker \
  --project-ref rzashahhkafjicjpupww \
  --no-verify-jwt \
  > ../../artifacts/function-deploy-log.txt 2>&1

# Verify deployment
cat ../../artifacts/function-deploy-log.txt
```

### 3. Run Post-Deploy Orchestration Script

```bash
# Set all required environment variables
export SUPABASE_PROJECT_REF=rzashahhkafjicjpupww
export SCORE_CHECKER_FN_URL=https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
export GITHUB_PAGES_DOMAIN=https://lisandrosuarez9-lab.github.io/DataboxMVL/
export GITHUB_PAGES_ORIGIN=https://lisandrosuarez9-lab.github.io
export AGENT_HAS_FUNCTION_DEPLOY=false  # Set to true if you have supabase CLI
export ALLOW_FALLBACK_DEMO=true

# Make executable and run
chmod +x scripts/postdeploy-runner.sh
./scripts/postdeploy-runner.sh

# Check results
cat artifacts/run-report.json
```

### 4. Manual E2E Test (Browser)

1. Navigate to: https://lisandrosuarez9-lab.github.io/DataboxMVL/
2. Open DevTools (F12) → Network tab
3. Click the main CTA button
4. Fill form:
   - Full Name: `Test User`
   - National ID: `000000000`
   - Email: `test@example.com`
   - Phone: `+1-000-000-0000`
5. Submit form
6. Verify:
   - No 404 errors in Network tab
   - POST to score-checker endpoint
   - Response status 200
   - ProfileCard displays with borrower info

### 5. Automated E2E Test (Playwright)

```bash
# Install Playwright if not already installed
npm install playwright --no-audit --no-fund
npx playwright install chromium

# Run E2E test
node scripts/e2e-runner.js \
  https://lisandrosuarez9-lab.github.io/DataboxMVL/ \
  artifacts/headless-dom.html \
  artifacts/headless-run.log

# Check results
cat artifacts/headless-run.log
grep -i "E2E_OK" artifacts/headless-run.log && echo "✅ Test passed" || echo "❌ Test failed"
```

---

## Troubleshooting Commands

### Assets 404 (base path issue)
```bash
# Check if Vite base is set
grep "base:" vite.config.ts

# Verify built index.html has correct paths
grep "/DataboxMVL/" dist/index.html

# If missing, rebuild
npm run build
```

### CORS errors
```bash
# Test OPTIONS preflight
curl -i -X OPTIONS 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "Access-Control-Request-Method: POST"

# If missing CORS headers, deploy function stub
cd artifacts/function-patch
supabase functions deploy score-checker --project-ref rzashahhkafjicjpupww --no-verify-jwt
```

### Environment variables not in build
```bash
# Check .env.production
cat .env.production

# Verify variables in dist
grep -r "score-checker" dist/assets/

# If missing, ensure env vars set during build
export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
npm run build
```

### E2E test fails
```bash
# Check detailed logs
cat artifacts/headless-run.log

# Common issues:
# 1. Selectors don't match - update scripts/e2e-runner.js selectors
# 2. Timeout too short - increase timeout values
# 3. CORS not configured - deploy function stub
# 4. Page not deployed - check GitHub Pages settings
```

---

## Complete Workflow for Maintainers

### Step-by-Step Deployment Process

1. **Merge Vite base PR**
   - Review and approve PR #1
   - Merge to main branch

2. **Deploy function stub**
   ```bash
   cd artifacts/function-patch
   supabase functions deploy score-checker --project-ref rzashahhkafjicjpupww --no-verify-jwt
   ```

3. **Build and deploy site**
   ```bash
   export VITE_PROFILE_FN_URL="https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker"
   export VITE_SUPABASE_ANON_KEY="your-anon-key"
   npm ci && npm run build && npm run deploy
   ```

4. **Verify deployment**
   ```bash
   # Run post-deploy script
   export SUPABASE_PROJECT_REF=rzashahhkafjicjpupww
   export SCORE_CHECKER_FN_URL=https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
   export GITHUB_PAGES_DOMAIN=https://lisandrosuarez9-lab.github.io/DataboxMVL/
   export GITHUB_PAGES_ORIGIN=https://lisandrosuarez9-lab.github.io
   ./scripts/postdeploy-runner.sh
   ```

5. **Review results**
   ```bash
   cat artifacts/run-report.json
   # Share run-report.json for analysis
   ```

6. **Optional: Run E2E test**
   ```bash
   node scripts/e2e-runner.js https://lisandrosuarez9-lab.github.io/DataboxMVL/
   ```

---

## Files Created/Modified

### New Files
- `scripts/postdeploy-runner.sh` - Orchestration script for build/deploy/verify
- `scripts/e2e-runner.js` - Playwright headless E2E test
- `.github/workflows/e2e-on-deploy.yml` - GitHub Actions workflow for automated E2E
- `docs/PR_TEXT_AND_DEPLOY_COMMANDS.md` - This file

### Modified Files
- `vite.config.ts` - Added `base: '/DataboxMVL/'`
- Various artifacts in `artifacts/` directory

---

## Support

If you encounter issues:
1. Run the post-deploy script and share `artifacts/run-report.json`
2. Check artifact logs in `artifacts/` directory
3. Review `DEPLOYMENT_INSTRUCTIONS.md` for detailed troubleshooting
4. Check `artifacts/VERIFICATION_SUMMARY.md` for validation status
