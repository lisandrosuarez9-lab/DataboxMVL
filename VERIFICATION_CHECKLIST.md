# Frontend API Wiring Verification Checklist

This document provides a comprehensive checklist to verify that the frontend is properly consuming backend APIs and displaying live data.

## Prerequisites

1. **Supabase Project Setup**
   - Supabase project is deployed and accessible
   - Edge Functions are deployed with the updated `api-v1` endpoints
   - Database contains personas table with test data
   - JWT authentication is configured

2. **Environment Configuration**
   - `VITE_SUPABASE_URL` environment variable is set (if using real Supabase)
   - Frontend is built and deployed

## Manual Verification Steps

### 1. API Endpoint Testing

Test each endpoint manually with a valid JWT token:

#### A. Personas Endpoint
```bash
# Test personas list
curl -X GET "https://your-project.supabase.co/functions/v1/api-v1/personas?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: 200 OK with persona array
# Should return: id, user_id_review_needed, is_test, nombre, documento_id, created_at
```

#### B. KPIs Endpoint
```bash
# Test KPI metrics
curl -X GET "https://your-project.supabase.co/functions/v1/api-v1/kpis" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: 200 OK with metrics object
# Should return: totalPersonas, flaggedPersonas, auditEntries, lastUpdated
```

#### C. Audit Endpoint
```bash
# Test audit entries
curl -X GET "https://your-project.supabase.co/functions/v1/api-v1/audit?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: 200 OK with audit array
# Should return: audit_id, persona_id, field_name, old_value, new_value, changed_by, changed_at
```

#### D. Persona Explanation Endpoint
```bash
# Test persona explanation (replace PERSONA_ID with actual ID)
curl -X GET "https://your-project.supabase.co/functions/v1/api-v1/personas/explain?persona_id=PERSONA_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: 200 OK with explanation object
# Should return: score, explanation, computed_at
```

### 2. Frontend UI Verification

Open the deployed dashboard and verify the following:

#### A. Authentication and Role Enforcement
- [ ] **Compliance Role**: Shows "Read-only Access for Compliance" banner
- [ ] **Service Role**: No read-only banner, full UI access
- [ ] **Anonymous**: Redirects to login or shows authentication error

#### B. Connectivity Status
- [ ] **Connected State**: Green connectivity banner shows "Connected"
- [ ] **Handshake Timestamp**: Shows recent timestamp in connectivity banner
- [ ] **Auto-refresh**: Data updates every 30 seconds automatically
- [ ] **Manual Refresh**: "Refresh Data" button works correctly

#### C. KPI Cards Display
- [ ] **Total Personas**: Shows count > 0 from database
- [ ] **Flagged Personas**: Shows flagged count with percentage
- [ ] **Audit Entries**: Shows audit count with daily average
- [ ] **Loading States**: Cards show loading spinners during data fetch
- [ ] **Error Handling**: Error states display with retry buttons

#### D. Persona Table Functionality
- [ ] **Data Population**: Table shows real persona data from API
- [ ] **Required Fields**: All fields display correctly (id, nombre, documento_id, etc.)
- [ ] **Pagination**: Pagination controls work and change data
- [ ] **Sorting**: Click column headers to sort by created_at
- [ ] **Filtering**: Filter by flagged status works
- [ ] **Row Click**: Clicking persona opens explanation modal
- [ ] **Empty State**: Shows appropriate message when no data
- [ ] **Error State**: Shows error message with retry button on API failure

#### E. Audit Table Functionality
- [ ] **Data Population**: Table shows real audit data from API
- [ ] **Required Fields**: All audit fields display (persona_id, field_name, etc.)
- [ ] **Timestamps**: UTC timestamps display correctly
- [ ] **Pagination**: Pagination works for audit entries
- [ ] **Filtering**: Date range and actor filters work
- [ ] **Empty State**: Shows appropriate message when no audit data
- [ ] **Error State**: Shows error message with retry button on API failure

#### F. Persona Explanation Modal
- [ ] **Modal Opens**: Clicking persona row opens modal
- [ ] **Loading State**: Shows spinner while fetching explanation
- [ ] **Data Display**: Shows score and computed_at timestamp
- [ ] **JSON Display**: Shows raw explanation JSON in formatted view
- [ ] **Error Handling**: Shows error message if explanation fails
- [ ] **Modal Close**: Close button and outside click work
- [ ] **Retry Function**: Retry button works on errors

### 3. Role-based Behavior Verification

#### A. Compliance Role Testing
1. Log in as compliance user
2. Verify read-only banner appears
3. Confirm no edit controls are visible
4. Test that all data loads correctly
5. Verify persona explanations work

#### B. Service Role Testing
1. Log in as service_role user
2. Verify no read-only restrictions
3. Confirm edit controls are visible (if implemented)
4. Test data modification capabilities
5. Verify audit entries are created for actions

### 4. Performance and Reliability Testing

#### A. Error Scenarios
- [ ] **Network Failure**: Disconnect network, verify error states
- [ ] **Invalid Token**: Use expired JWT, verify 401 handling
- [ ] **Missing Permissions**: Test with limited role, verify 403 handling
- [ ] **Server Error**: Test with malformed requests, verify error messages

#### B. Loading Performance
- [ ] **Initial Load**: Page loads within reasonable time
- [ ] **Data Refresh**: Refresh operations complete quickly
- [ ] **Modal Load**: Explanation modal loads explanations fast
- [ ] **Auto-refresh**: Background refreshes don't interfere with UI

### 5. Browser Console Verification

Open browser developer tools and check console for:

#### A. Immutable UI Events
Look for logged events like:
```javascript
🔒 IMMUTABLE UI EVENT: {"event":"api_success","timestamp":"...","data":{"endpoint":"/personas","responseChecksum":"..."}}
```

#### B. Error Logging
- [ ] No JavaScript errors in console
- [ ] API errors are properly logged with timestamps
- [ ] Network errors are caught and handled gracefully

### 6. Data Consistency Verification

#### A. KPI Accuracy Testing
1. Count personas manually in database
2. Compare with UI KPI display
3. Verify numbers match within tolerance
4. Check audit entry counts

#### B. Real-time Updates
1. Make changes in database (if possible)
2. Wait for auto-refresh (30 seconds)
3. Verify UI reflects changes
4. Test manual refresh button

## Expected Results Summary

### Pass Criteria
All checklist items must pass for successful verification:

1. **API Connectivity**: All 4 endpoints return 200 OK with expected data shapes
2. **Role Enforcement**: Compliance shows read-only, service_role shows full access
3. **Live Data**: Tables populate with real database data
4. **Error Handling**: All error states work with proper retry mechanisms
5. **Connectivity**: Real-time status monitoring works correctly
6. **Explanations**: Persona explanation modal works with real credit score data
7. **Console Logging**: Immutable UI events are logged for verification

### Common Issues and Solutions

**Problem**: "Authentication required" error
**Solution**: Ensure JWT token is valid and not expired

**Problem**: Empty tables or "No data" messages
**Solution**: Verify database has test data and RLS policies allow access

**Problem**: Network errors on API calls
**Solution**: Check Supabase Edge Function deployment and CORS settings

**Problem**: Role enforcement not working
**Solution**: Verify JWT contains correct role claims

## Test Environment Setup

For comprehensive testing, ensure:

1. **Test Data**: Database contains at least 3 personas with different states
2. **Audit Records**: Some audit entries exist for testing
3. **Role Tokens**: Valid JWTs for both compliance and service_role users
4. **Network Access**: Frontend can reach Supabase Edge Functions

## Verification Report Template

After completing verification, document results:

```markdown
## Verification Results - [DATE]

### API Endpoints: ✅ PASS / ❌ FAIL
- Personas: [STATUS]
- KPIs: [STATUS] 
- Audit: [STATUS]
- Explanations: [STATUS]

### UI Functionality: ✅ PASS / ❌ FAIL
- Role enforcement: [STATUS]
- Live data rendering: [STATUS]
- Error handling: [STATUS]
- Connectivity monitoring: [STATUS]

### Performance: ✅ PASS / ❌ FAIL
- Load times: [STATUS]
- Auto-refresh: [STATUS]
- Error recovery: [STATUS]

### Issues Found:
[List any issues discovered during testing]

### Recommendations:
[Any recommendations for improvements]
```

## Next Steps

After successful verification:
1. Deploy to production environment
2. Set up monitoring and alerting
3. Create user documentation
4. Plan for real-time subscriptions implementation