# Public API Design for Compliance Showcase

## Overview

This document specifies the read-only, RLS-enforced API endpoints for the GitHub Pages compliance showcase. All endpoints are designed for public access with appropriate security controls.

---

## 1. API Principles

### Security Requirements

- **Read-Only**: All endpoints are GET only, no mutations allowed
- **RLS Enforced**: Database-level access control on all queries
- **Token Scoped**: JWT tokens limited to demo cohort access
- **Rate Limited**: 100 requests per minute per IP address
- **No PII**: All responses use anonymized references

### Response Format

All successful responses follow this structure:

```typescript
interface APIResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    count?: number;
    page?: number;
    per_page?: number;
    total?: number;
  };
  timestamp: string; // ISO 8601
}
```

Error responses:

```typescript
interface APIError {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
}
```

---

## 2. Endpoints Specification

### 2.1 Integrity Status

**GET /api/v1/public/integrity-status**

Returns current system integrity metrics for display on the homepage.

**Authentication**: Optional (public data)

**Rate Limit**: 100/minute

**Response**:
```typescript
interface IntegrityStatus {
  orphan_records: number;        // Always 0 if system is healthy
  latest_run_id: string;         // e.g., "RUN-20240115-ABCD1234"
  audit_entries_30d: number;     // Count of audit entries in last 30 days
  rls_status: "ENFORCED" | "DISABLED";
  last_verification: string;     // ISO 8601 timestamp
  tables_checked: number;        // Number of tables verified
}
```

**Example**:
```bash
curl https://api.databoxmvl.com/api/v1/public/integrity-status

{
  "success": true,
  "data": {
    "orphan_records": 0,
    "latest_run_id": "RUN-20240115-ABCD1234",
    "audit_entries_30d": 1247,
    "rls_status": "ENFORCED",
    "last_verification": "2024-01-15T10:25:00Z",
    "tables_checked": 5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.2 Score Models

**GET /api/v1/public/score-models**

List available scoring models with metadata (weights redacted).

**Authentication**: Optional

**Rate Limit**: 100/minute

**Query Parameters**: None

**Response**:
```typescript
interface ScoreModel {
  id: string;
  name: string;
  version: string;
  description: string;
  factors_count: number;
  active: boolean;
  created_at: string;
}

type ScoreModelsResponse = ScoreModel[];
```

**Example**:
```bash
curl https://api.databoxmvl.com/api/v1/public/score-models

{
  "success": true,
  "data": [
    {
      "id": "model-v2.1",
      "name": "Primary Credit Model",
      "version": "2.1.0",
      "description": "Standard credit scoring for traditional borrowers",
      "factors_count": 12,
      "active": true,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "model-alt-v2.1",
      "name": "Alternate Credit Model",
      "version": "2.1.0",
      "description": "Thin-file scoring with behavioral factors",
      "factors_count": 15,
      "active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "metadata": {
    "count": 2
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.3 Risk Factors

**GET /api/v1/public/risk-factors**

Get risk factors for demo personas with optional filtering.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Query Parameters**:
- `owner_ref` (optional): Filter by demo persona reference (e.g., "demo-12345678")
- `factor_code` (optional): Filter by factor code
- `min_confidence` (optional): Minimum confidence threshold (0-1)
- `limit` (optional): Number of results (default: 20, max: 100)

**Response**:
```typescript
interface RiskFactor {
  id: string;
  owner_ref: string;           // Anonymized: "demo-12345678"
  factor_code: string;          // e.g., "device_consistency"
  factor_value: number | null;
  confidence: number;           // 0-1
  derived_at: string;           // ISO 8601
  signal_source: string;        // e.g., "RiskSeal"
  signal_type: string;          // e.g., "device_consistency_check"
}

type RiskFactorsResponse = RiskFactor[];
```

**Example**:
```bash
curl "https://api.databoxmvl.com/api/v1/public/risk-factors?owner_ref=demo-12345678&limit=5"

{
  "success": true,
  "data": [
    {
      "id": "rf_001",
      "owner_ref": "demo-12345678",
      "factor_code": "device_consistency",
      "factor_value": 0.92,
      "confidence": 0.95,
      "derived_at": "2024-01-15T09:15:00Z",
      "signal_source": "RiskSeal",
      "signal_type": "device_consistency_check"
    },
    {
      "id": "rf_002",
      "owner_ref": "demo-12345678",
      "factor_code": "identity_match_score",
      "factor_value": 0.88,
      "confidence": 0.91,
      "derived_at": "2024-01-15T09:15:00Z",
      "signal_source": "RiskSeal",
      "signal_type": "identity_verification"
    }
  ],
  "metadata": {
    "count": 2,
    "limit": 5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.4 Score Runs

**GET /api/v1/public/score-runs/:id**

Get details of a specific credit score run.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Path Parameters**:
- `id`: Score run UUID

**Response**:
```typescript
interface ScoreRun {
  id: string;
  persona_ref: string;          // Anonymized
  model_id: string;
  score: number;
  risk_band: {
    band: string;
    min_score: number;
    max_score: number;
    recommendation: string;
  };
  features: {
    [key: string]: number;
  };
  normalized_score: number;
  computed_at: string;
  audit_log_id: string | null;
}
```

**Example**:
```bash
curl https://api.databoxmvl.com/api/v1/public/score-runs/run_abc123

{
  "success": true,
  "data": {
    "id": "run_abc123",
    "persona_ref": "demo-12345678",
    "model_id": "model-v2.1",
    "score": 712,
    "risk_band": {
      "band": "GOOD",
      "min_score": 650,
      "max_score": 750,
      "recommendation": "Standard terms, moderate monitoring"
    },
    "features": {
      "payment_regularity": 0.87,
      "transaction_volume": 0.65,
      "remittance_frequency": 0.92
    },
    "normalized_score": 0.712,
    "computed_at": "2024-01-15T10:30:00Z",
    "audit_log_id": "audit_xyz789"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.5 Score Runs List

**GET /api/v1/public/score-runs**

List recent score runs with pagination.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Query Parameters**:
- `persona_ref` (optional): Filter by persona
- `model_id` (optional): Filter by model
- `limit` (optional): Results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```typescript
type ScoreRunsList = ScoreRun[];
```

**Example**:
```bash
curl "https://api.databoxmvl.com/api/v1/public/score-runs?limit=10"

{
  "success": true,
  "data": [
    {
      "id": "run_abc123",
      "persona_ref": "demo-12345678",
      "model_id": "model-v2.1",
      "score": 712,
      "risk_band": { "band": "GOOD", ... },
      "computed_at": "2024-01-15T10:30:00Z"
    }
    // ... more runs
  ],
  "metadata": {
    "count": 10,
    "limit": 10,
    "offset": 0,
    "total": 127
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.6 Risk Events

**GET /api/v1/public/risk-events**

Get anonymized risk events for demo personas.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Query Parameters**:
- `owner_ref` (optional): Filter by persona
- `source` (optional): Filter by source (e.g., "RiskSeal")
- `event_type` (optional): Filter by event type
- `limit` (optional): Results per page (default: 20, max: 100)

**Response**:
```typescript
interface RiskEvent {
  id: string;
  owner_ref: string;
  source: string;
  event_type: string;
  confidence: number;
  observed_at: string;
  signal_summary: {
    signal_type: string;
    confidence: number;
    timestamp: string;
  };
}

type RiskEventsResponse = RiskEvent[];
```

**Example**:
```bash
curl "https://api.databoxmvl.com/api/v1/public/risk-events?source=RiskSeal&limit=5"

{
  "success": true,
  "data": [
    {
      "id": "evt_001",
      "owner_ref": "demo-12345678",
      "source": "RiskSeal",
      "event_type": "device_consistency_check",
      "confidence": 0.92,
      "observed_at": "2024-01-15T09:15:00Z",
      "signal_summary": {
        "signal_type": "device_consistency_check",
        "confidence": 0.92,
        "timestamp": "2024-01-15T09:15:00Z"
      }
    }
    // ... more events
  ],
  "metadata": {
    "count": 5,
    "limit": 5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.7 Alternate Score Runs

**GET /api/v1/public/alt-score-runs/:id**

Get details of a specific alternate scoring run.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Path Parameters**:
- `id`: Alternate score run UUID

**Response**:
```typescript
interface AltScoreRun {
  id: string;
  owner_ref: string;
  model_version: string;
  run_id: string;              // Human-readable ID
  started_at: string;
  finished_at: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  score_result: number | null;
  risk_band: string | null;
  explanation: {
    factors: Array<{
      factor: string;
      weight: number;
      value: number;
      contribution: number;
      confidence: number;
    }>;
    methodology: string;
  };
}
```

**Example**:
```bash
curl https://api.databoxmvl.com/api/v1/public/alt-score-runs/alt_run_123

{
  "success": true,
  "data": {
    "id": "alt_run_123",
    "owner_ref": "demo-12345678",
    "model_version": "alt-credit-v2.1",
    "run_id": "ALT-RUN-20240115-XYZ789",
    "started_at": "2024-01-15T10:00:00Z",
    "finished_at": "2024-01-15T10:00:05Z",
    "status": "completed",
    "score_result": 687,
    "risk_band": "MODERATE",
    "explanation": {
      "factors": [
        {
          "factor": "remittance_regularity",
          "weight": 0.30,
          "value": 0.91,
          "contribution": 0.273,
          "confidence": 0.94
        },
        {
          "factor": "mobile_topup_pattern",
          "weight": 0.15,
          "value": 0.85,
          "contribution": 0.1275,
          "confidence": 0.88
        }
      ],
      "methodology": "Thin-file scoring using behavioral and local data"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.8 Audit Summary

**GET /api/v1/public/audit/summary**

Get high-level audit metrics for transparency.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Response**:
```typescript
interface AuditSummary {
  total_score_runs: number;
  runs_last_30d: number;
  latest_run_timestamp: string | null;
  unique_personas: number;
  rls_status: "ENFORCED" | "DISABLED";
}
```

**Example**:
```bash
curl https://api.databoxmvl.com/api/v1/public/audit/summary

{
  "success": true,
  "data": {
    "total_score_runs": 1523,
    "runs_last_30d": 89,
    "latest_run_timestamp": "2024-01-15T10:30:00Z",
    "unique_personas": 15,
    "rls_status": "ENFORCED"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2.9 Demo Cohort

**GET /api/v1/public/demo-cohort**

List available demo personas with their scenarios.

**Authentication**: Optional

**Rate Limit**: 100/minute

**Query Parameters**:
- `persona_type` (optional): Filter by type (thin_file, traditional, mixed, new_borrower)
- `active` (optional): Filter by active status (default: true)

**Response**:
```typescript
interface DemoPersona {
  owner_ref: string;
  persona_type: string;
  display_name: string;
  scenario_description: string;
  created_at: string;
}

type DemoCohortResponse = DemoPersona[];
```

**Example**:
```bash
curl https://api.databoxmvl.com/api/v1/public/demo-cohort

{
  "success": true,
  "data": [
    {
      "owner_ref": "demo-12345678",
      "persona_type": "thin_file",
      "display_name": "Maria Rodriguez",
      "scenario_description": "New to credit, relies on remittances and microcredit",
      "created_at": "2024-01-10T00:00:00Z"
    },
    {
      "owner_ref": "demo-87654321",
      "persona_type": "traditional",
      "display_name": "Carlos Mendez",
      "scenario_description": "Established credit history with regular income",
      "created_at": "2024-01-10T00:00:00Z"
    }
  ],
  "metadata": {
    "count": 2
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 3. Error Handling

### Standard Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid query parameters or request format |
| 401 | Unauthorized | Invalid or missing authentication token |
| 403 | Forbidden | Access denied (RLS policy violation) |
| 404 | Not Found | Resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;          // Human-readable error message
  error_code: string;     // Machine-readable code
  details?: string;       // Additional context
  timestamp: string;
}
```

**Example**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": "Maximum 100 requests per minute. Try again in 45 seconds.",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 4. Rate Limiting

### Limits

- **Anonymous**: 100 requests/minute per IP
- **Authenticated**: 200 requests/minute per token
- **Burst**: Allow brief bursts up to 150% of limit

### Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642251000
```

### Exceeded Limit Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 45,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 5. Authentication (Optional)

### Anonymous Access

All endpoints support anonymous access for demo data. No authentication required.

### Token-Based Access

For enhanced limits or future features, use JWT tokens:

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  https://api.databoxmvl.com/api/v1/public/score-runs
```

Token scoping:
- `read:demo` - Access to demo cohort data
- `read:public` - Access to public views

---

## 6. CORS Configuration

All endpoints support CORS for browser-based access:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

## 7. Implementation Notes

### Supabase Edge Function

All endpoints implemented as a single Supabase Edge Function with routing:

```typescript
// Main handler
serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  
  if (path === '/api/v1/public/integrity-status') {
    return handleIntegrityStatus(req);
  }
  // ... more routes
});
```

### RLS Enforcement

All queries use the Supabase client with RLS automatically enforced:

```typescript
const { data, error } = await supabase
  .from('public_score_runs')
  .select('*')
  .eq('persona_ref', personaRef);
```

### Caching

Implement caching for frequently accessed data:
- Cache-Control headers for browser caching
- Edge caching for CDN
- Redis for backend caching (optional)

```
Cache-Control: public, max-age=300, s-maxage=600
```

---

## 8. Testing

### Manual Testing

```bash
# Test integrity status
curl https://api.databoxmvl.com/api/v1/public/integrity-status

# Test with query params
curl "https://api.databoxmvl.com/api/v1/public/risk-factors?owner_ref=demo-12345678"

# Test rate limiting (send 101 requests quickly)
for i in {1..101}; do
  curl https://api.databoxmvl.com/api/v1/public/score-models
done
```

### Automated Testing

```typescript
describe('Public API', () => {
  it('should return integrity status', async () => {
    const res = await fetch('/api/v1/public/integrity-status');
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.orphan_records).toBe(0);
  });

  it('should respect rate limits', async () => {
    // Test rate limit enforcement
  });
});
```

---

## 9. Monitoring

### Metrics to Track

- Requests per minute by endpoint
- Error rate by status code
- P50, P95, P99 response times
- Rate limit hits
- RLS policy violations

### Logging

Log all requests with:
- Timestamp
- Endpoint
- Response time
- Status code
- Rate limit status
- Error details (if any)

---

## 10. Security Checklist

- [ ] All endpoints enforce RLS
- [ ] No PII exposed in responses
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Error messages don't leak sensitive info
- [ ] All queries use parameterized statements
- [ ] Token validation implemented
- [ ] Audit logging enabled
- [ ] No direct database credentials in code
- [ ] HTTPS enforced

---

## Summary

This API design provides:

1. **Complete Read-Only Access**: All showcase data accessible via clean REST API
2. **Security by Default**: RLS, rate limiting, anonymization built-in
3. **Developer Friendly**: Clear documentation, consistent patterns, helpful errors
4. **Performance**: Optimized queries, caching, efficient pagination
5. **Transparency**: Audit endpoints show system integrity

All endpoints are designed to work seamlessly with the GitHub Pages frontend while maintaining strict security and compliance requirements.
