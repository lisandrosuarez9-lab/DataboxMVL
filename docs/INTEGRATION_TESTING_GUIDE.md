# Integration Testing Guide

## Overview
This guide provides instructions for testing the complete showcase implementation including frontend pages, API endpoints, and database integration.

## Prerequisites
- Supabase project deployed with showcase extensions
- Edge Functions deployed to Supabase
- Demo data generated using `04_demo_data.sql`
- Frontend built and deployed to GitHub Pages

## Testing Phases

### Phase 1: Database Verification

#### 1.1 Verify Tables and Views
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');

-- Should return 4 rows

-- Check all views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'public_%';

-- Should return 6 rows
```

#### 1.2 Verify Demo Data
```sql
-- Check demo personas
SELECT COUNT(*) as demo_personas FROM demo_cohort WHERE active = true;
-- Should return 10-15

-- Check risk events
SELECT COUNT(*) as risk_events FROM risk_events
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true);
-- Should return 50-150

-- Check risk factors
SELECT COUNT(*) as risk_factors FROM risk_factors
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true);
-- Should return 50-150

-- Check alternate score runs
SELECT COUNT(*) as alt_score_runs FROM alt_score_runs
WHERE owner_id IN (SELECT user_id FROM demo_cohort WHERE active = true);
-- Should return 7-10 (thin-file + new borrower personas)
```

#### 1.3 Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort');
-- All should show rowsecurity = true

-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('risk_events', 'risk_factors', 'alt_score_runs', 'demo_cohort')
ORDER BY tablename, policyname;
```

### Phase 2: API Endpoint Testing

#### 2.1 Test Public Endpoints

**Test Integrity Status:**
```bash
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/integrity-status" \
  -H "apikey: YOUR-ANON-KEY" \
  | jq .

# Expected response:
{
  "success": true,
  "data": {
    "orphan_records": 0,
    "latest_run_id": "RUN-YYYYMMDD-XXXXXX",
    "audit_entries_30d": number,
    "rls_status": "ENFORCED",
    "last_verification": "ISO timestamp",
    "tables_checked": 8
  },
  "timestamp": "ISO timestamp"
}
```

**Test Score Models:**
```bash
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/score-models" \
  -H "apikey: YOUR-ANON-KEY" \
  | jq .

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "version": "string",
      "description": "string",
      "factors_count": number,
      "active": true,
      "created_at": "ISO timestamp"
    }
  ],
  "metadata": {
    "count": number
  },
  "timestamp": "ISO timestamp"
}
```

**Test Risk Factors:**
```bash
# Get all risk factors
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/risk-factors?limit=10" \
  -H "apikey: YOUR-ANON-KEY" \
  | jq .

# Get risk factors for specific persona
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/risk-factors?owner_ref=demo-12345678" \
  -H "apikey: YOUR-ANON-KEY" \
  | jq .

# Filter by confidence
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/risk-factors?min_confidence=0.9" \
  -H "apikey: YOUR-ANON-KEY" \
  | jq .

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "owner_ref": "demo-xxxxxxxx",
      "factor_code": "string",
      "factor_value": number,
      "confidence": number,
      "derived_at": "ISO timestamp",
      "signal_source": "string",
      "signal_type": "string"
    }
  ],
  "metadata": {
    "count": number,
    "filters": {
      "owner_ref": "string or null",
      "factor_code": "string or null",
      "min_confidence": number
    }
  },
  "timestamp": "ISO timestamp"
}
```

**Test Audit Summary:**
```bash
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/audit/summary" \
  -H "apikey: YOUR-ANON-KEY" \
  | jq .

# Expected response:
{
  "success": true,
  "data": {
    "total_score_runs": number,
    "runs_last_30d": number,
    "latest_run_timestamp": "ISO timestamp or null",
    "unique_personas": number,
    "rls_status": "ENFORCED"
  },
  "timestamp": "ISO timestamp"
}
```

#### 2.2 Test Error Handling

**Test Invalid Endpoint:**
```bash
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/invalid-endpoint" \
  -H "apikey: YOUR-ANON-KEY"

# Expected: 404 with error message and available endpoints list
```

**Test CORS:**
```bash
curl -X OPTIONS "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/integrity-status" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expected: CORS headers in response
```

### Phase 3: Frontend Integration Testing

#### 3.1 Test ShowcaseHome Page
- [ ] Navigate to `/showcase`
- [ ] Verify hero section displays
- [ ] Verify 4 integrity status tiles load with data or loading state
- [ ] Verify navigation cards are clickable
- [ ] Click on each navigation card and verify routing works
- [ ] Check responsive design on mobile/tablet/desktop

#### 3.2 Test CreditStructure Page
- [ ] Navigate to `/showcase/credit-structure`
- [ ] Verify scoring flow diagram displays
- [ ] Verify factor weights table loads
- [ ] Click on a factor to see detail modal
- [ ] Verify modal displays factor information
- [ ] Close modal and verify it dismisses
- [ ] Verify risk band definitions display with correct colors
- [ ] Check responsive design

#### 3.3 Test RiskSealIntegration Page
- [ ] Navigate to `/showcase/riskseal`
- [ ] Verify signal taxonomy cards display
- [ ] Verify live event feed populates
- [ ] Click on a risk event to see detail modal
- [ ] Verify modal shows signal payload
- [ ] Adjust confidence filter slider
- [ ] Verify risk factors update based on filter
- [ ] Verify impact simulation section displays
- [ ] Check responsive design

#### 3.4 Test AlternateScoring Page
- [ ] Navigate to `/showcase/alternate-scoring`
- [ ] Select different demo personas from dropdown
- [ ] Verify report loads with correct data
- [ ] Verify score display shows alternate score
- [ ] Verify factor contributions table displays
- [ ] Verify comparative view (traditional vs alternate)
- [ ] Click JSON download button
- [ ] Verify JSON file downloads
- [ ] Click PDF download button (shows alert for now)
- [ ] Check responsive design

#### 3.5 Test Sandbox Page
- [ ] Navigate to `/showcase/sandbox`
- [ ] Verify privacy guarantee notice displays prominently
- [ ] Adjust monthly income slider
- [ ] Adjust transaction count
- [ ] Change remittance frequency
- [ ] Adjust repayment rate slider
- [ ] Adjust risk signal sliders
- [ ] Click "Calculate Score"
- [ ] Verify score result displays with band color
- [ ] Verify explanation section populates
- [ ] Toggle lineage visibility
- [ ] Verify lineage details display
- [ ] Click "Reset" button
- [ ] Verify form resets to defaults
- [ ] Check responsive design

#### 3.6 Test ComplianceAudits Page
- [ ] Navigate to `/showcase/compliance`
- [ ] Verify latest run status displays
- [ ] Verify "Zero Orphan Records" assertion shows 0
- [ ] Verify orphan checks by table all show 0
- [ ] Verify audit statistics display
- [ ] Verify run history timeline loads
- [ ] Verify RLS policy catalog displays
- [ ] Click CSV download button
- [ ] Verify CSV file downloads
- [ ] Click JSON download button
- [ ] Verify JSON file downloads
- [ ] Verify compliance attestation displays
- [ ] Check responsive design

### Phase 4: E2E User Journeys

#### Journey 1: Regulator Reviewing Compliance
1. Start at `/showcase`
2. Review integrity status tiles
3. Navigate to `/showcase/compliance`
4. Review zero-orphan assertions
5. Download audit artifacts (CSV + JSON)
6. Review RLS policy catalog
7. Navigate to `/showcase/credit-structure`
8. Review scoring methodology
9. Check factor weights

**Expected outcome:** All pages load, all data displays, downloads work

#### Journey 2: Partner Exploring Alternate Scoring
1. Start at `/showcase`
2. Navigate to `/showcase/alternate-scoring`
3. Select different demo personas
4. Review factor contributions
5. Compare traditional vs alternate
6. Download report as JSON
7. Navigate to `/showcase/sandbox`
8. Adjust parameters
9. Calculate custom score

**Expected outcome:** All calculations work client-side, reports generate correctly

#### Journey 3: Developer Testing RiskSeal Integration
1. Start at `/showcase`
2. Navigate to `/showcase/riskseal`
3. Review signal taxonomy
4. Explore live event feed
5. Click on events to see details
6. Adjust confidence filter
7. Review derived risk factors
8. Navigate to `/showcase/credit-structure`
9. See how risk factors map to scoring

**Expected outcome:** All risk data displays, filtering works, navigation is smooth

### Phase 5: Performance Testing

#### 5.1 Page Load Times
```bash
# Test with Lighthouse or similar
lighthouse https://your-github-pages-url/showcase --view
```

**Target metrics:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Total Blocking Time: < 300ms
- Cumulative Layout Shift: < 0.1

#### 5.2 API Response Times
```bash
# Use curl with timing
for i in {1..10}; do
  curl -w "@curl-format.txt" -o /dev/null -s \
    "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/integrity-status" \
    -H "apikey: YOUR-ANON-KEY"
done

# curl-format.txt:
#     time_namelookup:  %{time_namelookup}
#        time_connect:  %{time_connect}
#     time_appconnect:  %{time_appconnect}
#    time_pretransfer:  %{time_pretransfer}
#       time_redirect:  %{time_redirect}
#  time_starttransfer:  %{time_starttransfer}
#                     ----------
#          time_total:  %{time_total}
```

**Target:** API responses < 500ms (with caching < 100ms)

### Phase 6: Accessibility Testing

#### 6.1 Automated Testing
```bash
# Install axe-cli
npm install -g axe-cli

# Test each page
axe https://your-github-pages-url/showcase
axe https://your-github-pages-url/showcase/credit-structure
axe https://your-github-pages-url/showcase/riskseal
axe https://your-github-pages-url/showcase/alternate-scoring
axe https://your-github-pages-url/showcase/sandbox
axe https://your-github-pages-url/showcase/compliance
```

**Target:** WCAG 2.1 AA compliance, zero critical issues

#### 6.2 Manual Testing
- [ ] Keyboard navigation works on all pages
- [ ] All interactive elements are focusable
- [ ] Focus indicators are visible
- [ ] Screen reader announcements are appropriate
- [ ] Color contrast meets AA standards
- [ ] All images have alt text
- [ ] Forms have proper labels

### Phase 7: Security Testing

#### 7.1 RLS Verification
```bash
# Try to access data without proper auth
curl -X GET "https://YOUR-PROJECT-REF.supabase.co/functions/v1/api-v1/public/risk-factors" \
  -H "apikey: INVALID-KEY"

# Expected: 401 or proper error response
```

#### 7.2 PII Check
- [ ] Verify no real email addresses in demo data
- [ ] Verify no real phone numbers in demo data
- [ ] Verify all owner_id values are anonymized (demo-xxxxxxxx)
- [ ] Verify no sensitive data in public views
- [ ] Verify signal payloads are anonymized

### Test Results Checklist

- [ ] All database tables created successfully
- [ ] All views created successfully
- [ ] All functions created successfully
- [ ] Demo data generated (10-15 personas)
- [ ] All API endpoints respond correctly
- [ ] All frontend pages render without errors
- [ ] Navigation between pages works
- [ ] All interactive elements function correctly
- [ ] Downloads work (JSON, CSV)
- [ ] Sandbox calculations work client-side
- [ ] Mobile responsive design verified
- [ ] Accessibility standards met
- [ ] Performance targets met
- [ ] Security verification passed
- [ ] E2E journeys complete successfully

## Troubleshooting

### Common Issues

**Issue: API returns 404**
- Verify Edge Function is deployed
- Check API endpoint path in code
- Verify Supabase URL and anon key in environment

**Issue: Empty data in frontend**
- Check browser console for errors
- Verify API calls are succeeding
- Check demo data was generated
- Verify RLS policies allow public read access to views

**Issue: Database queries fail**
- Verify tables and views exist
- Check RLS policies are configured correctly
- Verify service role has full access
- Check function implementations

**Issue: Downloads don't work**
- Check browser console for errors
- Verify blob creation logic
- Test in different browsers
- Check file permissions

## Success Criteria

### Must Have
- ✅ All 5 showcase pages render correctly
- ✅ All API endpoints return valid data
- ✅ Demo data is populated
- ✅ Zero orphan records in database
- ✅ RLS policies enforced
- ✅ Downloads work

### Should Have
- Page load times < 3s
- API responses < 500ms
- Mobile responsive design
- WCAG AA compliance
- Error handling works

### Nice to Have
- Page load times < 2s
- API responses < 200ms
- PWA functionality
- Advanced animations
- Real-time updates

## Deployment Checklist

- [ ] Database schema deployed to Supabase
- [ ] RLS policies configured and tested
- [ ] Demo data generated
- [ ] Edge Functions deployed
- [ ] Environment variables configured
- [ ] Frontend built successfully
- [ ] GitHub Pages deployed
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled
- [ ] Cache headers configured
- [ ] Error tracking enabled
- [ ] Analytics configured (optional)

## Support

For issues or questions:
- Check browser console for errors
- Review Supabase logs
- Check GitHub Actions build logs
- Review deployment guide
- Contact development team
