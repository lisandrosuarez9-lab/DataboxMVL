# feat(ui): dominant CTA, resilient fetch, demo fallback, profile render

This PR makes the Factora UI resilient and testable end-to-end while the score service is being fixed.

## Changes

- **Prominent CTA button (Hero)** that is the first focusable element on the page.
- **Fetch wrapper with retries** and correlation id (src/utils/fetchWithRetries.js).
- **IntakeForm** uses fetchWithRetries, shows accessible loading state, defensive parsing, retry behavior, and an explicit "View demo score" fallback.
- **ProfileCard** renders borrower/enrichment/score with safe accessors and shows correlation id for debugging.
- **Styles adjusted** so the CTA is visually dominant.
- **.env.production.example** added to show required build-time env variables.

## Why

- Handles CORS/preflight, transient network issues, function auth or 5xx failures, and gives a deterministic demo fallback so users see a result while ops fix server-side issues.

## Testing instructions (exact commands to run)

### 1) Function CORS preflight (run from any machine with network access)

Replace SCORE_CHECKER_FN_URL with the function URL (or use the function stub URL once deployed).

```bash
curl -i -X OPTIONS 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization, X-Factora-Correlation-Id"
```

**Expect:** HTTP 204 or 200 and header `Access-Control-Allow-Origin: https://lisandrosuarez9-lab.github.io`

### 2) Function POST smoke

```bash
curl -i -X POST 'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker' \
  -H "Content-Type: application/json" \
  -H "Origin: https://lisandrosuarez9-lab.github.io" \
  -H "X-Factora-Correlation-Id: test-$(date -u +%Y%m%dT%H%M%SZ)" \
  -d '{"full_name":"Demo User","national_id":"000000000","email":"demo@example.com","phone":"+1-000-000-0000","consent":true,"consent_text":"I agree","intake_source":"github_pages_debug","intake_form_version":"v1","intent_financing":false,"prior_borrowing":false}'
```

**Expect:** HTTP 200 and JSON body containing top-level keys `borrower`, `enrichment`, `score`.

### 3) Local dev environment check

- Create `.env.production` locally (do NOT commit) from `.env.production.example` and set `VITE_PROFILE_FN_URL` to the deployed function URL or the stub URL and `VITE_SUPABASE_ANON_KEY` to your anon key.
- Run:
  ```bash
  npm ci
  npm run dev
  ```
- Visit http://localhost:5173 (or your vite port); the hero CTA should be the primary element.
- Click the CTA, fill fields, submit. If live function is healthy you should see a profile card rendering `borrower.full_name` and `score.factora_score`.
- If the function is unreachable, click "View demo score" to see the deterministic demo profile.

### 4) Pages deploy smoke (after PR merged & site built)

After deploy, poll the Pages URL:

```bash
curl -s 'https://lisandrosuarez9-lab.github.io/DataboxMVL/' -o /tmp/site-index.html && \
  grep -q "Get your free Factora Credit Score!" /tmp/site-index.html && \
  echo "Hero present"
```

### 5) Headless E2E (optional)

Playwright script (example):
- Navigate to `https://lisandrosuarez9-lab.github.io/DataboxMVL/?_factora_test=<runid>`
- Wait for `.cta`, click, wait for `#intake-form-dialog`, fill aria-label inputs, submit, assert `.profile-card` renders name and numeric score.
- Save HAR/DOM for artifacts.

## Notes for maintainers

- Do not expose service role keys to the frontend.
- If the production scoring function requires auth, prefer deploying the provided safe intake stub (`artifacts/function-patch/score-checker/index.js`) as a temporary public intake or update the frontend env to point to the stub URL for QA.
- **Merge order recommendation:** merge function stub PR (maintainer deploy) → merge this frontend PR → run smoke tests → promote to pages.

## PR checklist for reviewers / maintainers

- [ ] Confirm no secrets are committed (.env.production is not in repo).
- [ ] If AGENT_HAS_FUNCTION_DEPLOY=false, review and deploy `artifacts/function-patch/score-checker/index.js` as a temporary safe stub to the function host (Supabase) and return the deployed stub URL.
- [ ] After deploying stub (or ensuring production function has CORS and returns expected schema), set CI/build secret `VITE_PROFILE_FN_URL` to the function URL, and set `VITE_SUPABASE_ANON_KEY` in secrets.
- [ ] Run the exact test commands above (OPTIONS + POST) and paste outputs in PR comments for traceability.
- [ ] After successful smoke tests, merge PR and let CI build and deploy. Run the site smoke checks after GH-Pages deploy.

## Artifacts

All execution artifacts are available in the `artifacts/` directory:
- `artifacts/preflight.json` - Preflight checks
- `artifacts/function-patch/score-checker/index.js` - Function stub for deployment
- `artifacts/build-log.txt` - Build output
- `artifacts/run-report.json` - Complete execution report

## Build Status

✅ Build succeeded  
✅ All files written successfully  
✅ No secrets committed  
✅ Demo fallback available  
⏳ Function deployment pending maintainer action  
⏳ GitHub Pages deployment pending CI/CD
