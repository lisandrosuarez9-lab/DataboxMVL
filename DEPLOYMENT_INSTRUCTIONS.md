# Deployment Instructions for Maintainers

## Prerequisites
- Access to Supabase project: rzashahhkafjicjpupww
- Supabase CLI installed and authenticated
- GitHub repository access with permissions to set secrets
- Network access to deploy and test

## Step-by-Step Deployment

### 1. Deploy Function Stub

The function stub is ready at `artifacts/function-patch/score-checker/index.js`

```bash
# Navigate to function patch directory
cd artifacts/function-patch

# Deploy to Supabase (use --no-verify-jwt for unauthenticated intake stub)
supabase functions deploy score-checker --project-ref rzashahhkafjicjpupww --no-verify-jwt
```

**Expected Output:** Deployment success message with function URL

### 2. Verify Function Deployment

#### OPTIONS Preflight Check:
```bash
curl -i -X OPTIONS 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-Factora-Correlation-Id"
```

**Expected:** HTTP 204 with headers:
- `Access-Control-Allow-Origin: https://lisandrosuarez9-lab.github.io`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Factora-Correlation-Id`

#### POST Smoke Test:
```bash
curl -i -X POST 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Content-Type: application/json" \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "X-Factora-Correlation-Id: deploy-test-$(date -u +%Y%m%dT%H%M%SZ)" \
  -d '{
    "full_name": "Deploy Test",
    "national_id": "000000000",
    "email": "deploy@example.com",
    "phone": "+1-000-000-0000",
    "consent": true,
    "consent_text": "I agree",
    "intake_source": "deployment_verification",
    "intake_form_version": "v1",
    "intent_financing": false,
    "prior_borrowing": false
  }'
```

**Expected:** HTTP 200 with JSON body containing:
- `borrower` (with borrower_id, full_name, email, etc.)
- `score` (with factora_score: 650, score_band: "fair")
- `enrichment` (with source: "demo")
- `correlation_id`

### 3. Configure GitHub Repository Secrets

Navigate to: https://github.com/lisandrosuarez9-lab/DataboxMVL/settings/secrets/actions

Add/Update these secrets:

1. **VITE_PROFILE_FN_URL**
   ```
   https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker
   ```

2. **VITE_SUPABASE_ANON_KEY**
   ```
   Get from: Supabase Dashboard → Settings → API → anon public key
   ```

3. **VITE_SUPABASE_URL**
   ```
   https://rzashahhkafjicjpupww.supabase.co
   ```

### 4. Merge and Deploy Frontend

```bash
# Merge the PR (via GitHub UI or CLI)
gh pr merge <PR_NUMBER> --squash

# Or if deploying manually:
git checkout main
git pull origin main
npm ci
npm run build
npm run deploy
```

**CI/CD will automatically:**
1. Build with secrets injected
2. Deploy to gh-pages branch
3. Publish to https://lisandrosuarez9-lab.github.io/DataboxMVL/

### 5. Verify Live Site

Wait 2-3 minutes for GitHub Pages to update, then:

```bash
# Check if hero is present
curl -s 'https://lisandrosuarez9-lab.github.io/DataboxMVL/' | grep -q "Get your free Factora Credit Score!" && echo "✅ Hero CTA present" || echo "❌ Hero not found"

# Download page for inspection
curl -s 'https://lisandrosuarez9-lab.github.io/DataboxMVL/' -o site-verification.html
```

### 6. Manual E2E Test

1. Open: https://lisandrosuarez9-lab.github.io/DataboxMVL/
2. Verify the CTA button "Get your free Factora Credit Score" is visible and prominent
3. Click the CTA button
4. Fill the intake form:
   - First name: Test
   - Last name: User
   - National ID: 123456789
   - Email: test@example.com
   - Phone: +1-555-000-0000
5. Click "Submit"
6. Verify ProfileCard renders with:
   - Name: "Test User"
   - Score: 650
   - Email, National ID, Phone displayed
7. Click "View demo score" button to test fallback
8. Verify demo profile renders correctly

### 7. Troubleshooting

#### If CORS headers missing:
```bash
# Redeploy function
supabase functions deploy score-checker --project-ref rzashahhkafjicjpupww --no-verify-jwt

# Verify again with OPTIONS check
```

#### If 401/403 errors:
- Do NOT add service role key to frontend
- The stub is designed to be unauthenticated
- Check function logs: `supabase functions logs score-checker --project-ref rzashahhkafjicjpupww`

#### If 5xx errors:
```bash
# Get function logs
supabase functions logs score-checker --project-ref rzashahhkafjicjpupww --tail 100

# Check for runtime errors
# Redeploy if necessary
```

#### If site not updating:
```bash
# Clear GitHub Pages cache
# Force rebuild via empty commit or re-run CI workflow
gh workflow run deploy.yml
```

## Security Checklist

- [x] No service role keys in frontend code
- [x] .env.production not committed to repository
- [x] Only anon/public key used in CI secrets
- [x] Function stub is intentionally unauthenticated (demo only)
- [x] CORS restricted to GitHub Pages origin

## Post-Deployment Verification

Create a summary comment on the PR with:
1. Screenshot of live site showing CTA
2. curl output from OPTIONS check (showing CORS headers)
3. curl output from POST check (showing successful response)
4. Screenshot of ProfileCard rendering after form submission

## Rollback Procedure

If deployment causes issues:

```bash
# Rollback function
supabase functions delete score-checker --project-ref rzashahhkafjicjpupww

# Rollback Pages
git push origin <previous-commit-hash>:gh-pages --force

# Or via GitHub UI: Settings → Pages → Redeploy from previous commit
```

## Support

For issues or questions:
- Check artifacts/run-report.json for execution details
- Review PR_BODY.md for testing instructions
- Examine artifacts/build-log.txt for build issues
- Check artifacts/function-deploy-log.txt for deployment notes
