# Observability: Logging and Metrics

## Overview

This document defines the observability strategy for DataboxMVL's secure credit scoring system, including structured logging schemas, metrics definitions, and correlation ID propagation rules.

## Logging Strategy

### Structured JSON Logs

All Edge Functions emit logs as structured JSON for machine parsing and analysis.

**Format**:
```json
{
  "timestamp": "ISO-8601 string",
  "level": "INFO|WARN|ERROR",
  "event": "event_name",
  "correlation_id": "uuid-v4",
  "duration_ms": 123,
  "metadata": {
    "key": "value"
  }
}
```

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| `INFO` | Normal operation events | Token issued, score calculated |
| `WARN` | Unexpected but handled | Invalid input, token near expiry |
| `ERROR` | Errors requiring attention | Token validation failed, database error |

### Log Emission

```typescript
// Deno Edge Function logging
const log = (level: string, event: string, metadata: Record<string, any> = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    correlation_id: metadata.correlation_id || 'unknown',
    duration_ms: metadata.duration_ms,
    ...metadata
  }));
};

// Example usage
log('INFO', 'token_issued', {
  correlation_id: 'abc-123',
  email_domain: 'example.com',
  ttl_seconds: 45
});
```

## Log Schema Fields

### Standard Fields (All Logs)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO-8601 | Yes | Event occurrence time (UTC) |
| `level` | Enum | Yes | INFO, WARN, ERROR |
| `event` | String | Yes | Event type identifier (snake_case) |
| `correlation_id` | UUID v4 | Yes | Request tracing identifier |
| `duration_ms` | Number | No | Operation duration in milliseconds |

### Event-Specific Fields

#### Event: `token_issued` (score-broker)

```json
{
  "timestamp": "2025-11-08T17:30:00.000Z",
  "level": "INFO",
  "event": "token_issued",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "national_id_hash": "sha256:1a2b3c...",
  "email_domain": "example.com",
  "ttl_seconds": 45,
  "token_format": "demo|hmac|jwt",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "203.0.113.42",
  "duration_ms": 12
}
```

**PII Handling**:
- `national_id`: Hash with SHA-256, prefix with "sha256:"
- `email`: Extract domain only (e.g., "example.com")
- `full_name`: Do NOT log

#### Event: `token_validation_success` (score-checker)

```json
{
  "timestamp": "2025-11-08T17:30:15.000Z",
  "level": "INFO",
  "event": "token_validation_success",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "authorization_mode": "demo|secure",
  "token_age_seconds": 10,
  "nonce": "9876-fedc-ba09-8765",
  "duration_ms": 8
}
```

#### Event: `token_validation_failed` (score-checker)

```json
{
  "timestamp": "2025-11-08T17:30:15.000Z",
  "level": "WARN",
  "event": "token_validation_failed",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "reason": "expired|invalid_signature|missing_token",
  "token_age_seconds": 60,
  "duration_ms": 5
}
```

#### Event: `score_calculated` (score-checker)

```json
{
  "timestamp": "2025-11-08T17:30:16.000Z",
  "level": "INFO",
  "event": "score_calculated",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "score_band": "poor|fair|good|very_good|excellent",
  "enrichment_source": "demo|api|database",
  "processing_time_ms": 45,
  "duration_ms": 45
}
```

#### Event: `input_validation_error` (All Functions)

```json
{
  "timestamp": "2025-11-08T17:30:05.000Z",
  "level": "WARN",
  "event": "input_validation_error",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "missing_fields": ["email", "national_id"],
  "invalid_fields": ["email"],
  "error_code": "missing_fields|invalid_email",
  "duration_ms": 2
}
```

#### Event: `internal_error` (All Functions)

```json
{
  "timestamp": "2025-11-08T17:30:20.000Z",
  "level": "ERROR",
  "event": "internal_error",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "error_message": "Database connection timeout",
  "error_stack": "Error: timeout\n  at ...",
  "function_name": "score-checker",
  "duration_ms": 5000
}
```

## Correlation ID Propagation

### Purpose

Correlation IDs enable end-to-end request tracing across frontend and multiple Edge Functions.

### Generation Rules

1. **Frontend**: Generate UUID v4 if not provided by score-broker
2. **score-broker**: Generate UUID v4, return in response
3. **score-checker**: Accept from header, echo in response

### Propagation Flow

```
┌──────────┐           ┌─────────────┐           ┌──────────────┐
│ Frontend │           │score-broker │           │score-checker │
└────┬─────┘           └──────┬──────┘           └──────┬───────┘
     │                        │                         │
     │  Generate UUID         │                         │
     │  correlation_id_1      │                         │
     │                        │                         │
     │  POST /score-broker    │                         │
     │  x-correlation-id: 1   │                         │
     ├───────────────────────>│                         │
     │                        │                         │
     │                        │  Log: correlation_id_1  │
     │                        │  Generate correlation_id_2│
     │                        │                         │
     │  Response              │                         │
     │  correlation_id: 2     │                         │
     │<───────────────────────┤                         │
     │                        │                         │
     │  POST /score-checker                             │
     │  x-correlation-id: 2                             │
     │  Authorization: Bearer token                     │
     ├──────────────────────────────────────────────────>│
     │                                                   │
     │                                    Log: correlation_id_2
     │                                    Process request
     │                                                   │
     │  Response                                         │
     │  correlation_id: 2                                │
     │<──────────────────────────────────────────────────┤
```

### Header Naming

**New Standard** (Phase 0+):
- Header: `x-correlation-id`
- Response field: `correlation_id`

**Legacy** (Backward Compatible):
- Header: `x-factora-correlation-id`
- Response field: `correlation_id`

**Precedence**:
```typescript
// score-checker header parsing
const correlationId = 
  req.headers.get('x-correlation-id') ||
  req.headers.get('x-factora-correlation-id') ||
  crypto.randomUUID();
```

### Auto-Generation

If no correlation ID is provided by the client:
1. Edge Function generates UUID v4
2. Logs include generated correlation_id
3. Response includes correlation_id

## Metrics Definitions

### Token Metrics (score-broker)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `tokens_issued_total` | Counter | count | Total tokens issued |
| `tokens_issued_by_mode` | Counter | count | Tokens by mode (demo/secure) |
| `token_issuance_duration` | Histogram | ms | Token generation latency |
| `token_issuance_errors` | Counter | count | Failed token issuance attempts |

### Validation Metrics (score-checker)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `token_validations_total` | Counter | count | Total validation attempts |
| `token_validations_by_result` | Counter | count | Validations by result (success/fail) |
| `token_validation_duration` | Histogram | ms | Token validation latency |
| `token_expired_count` | Counter | count | Tokens rejected due to expiration |
| `token_signature_invalid_count` | Counter | count | Tokens with invalid signatures |

### Score Calculation Metrics (score-checker)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `scores_calculated_total` | Counter | count | Total credit scores calculated |
| `scores_by_band` | Counter | count | Scores by band (poor/fair/good/...) |
| `score_calculation_duration` | Histogram | ms | Score computation latency |
| `score_calculation_errors` | Counter | count | Failed score calculations |

### Request Metrics (All Functions)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `requests_total` | Counter | count | Total requests received |
| `requests_by_status` | Counter | count | Requests by HTTP status code |
| `request_duration` | Histogram | ms | Request processing latency |
| `cors_preflight_total` | Counter | count | OPTIONS requests (CORS preflight) |

### Error Metrics (All Functions)

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `errors_total` | Counter | count | Total errors |
| `errors_by_code` | Counter | count | Errors by error_code |
| `validation_errors_total` | Counter | count | Input validation failures |

## Metric Collection Strategy

### Phase 0: Log-Based Metrics

- Metrics derived from structured logs
- Parse logs to extract metric values
- Tools: Supabase log viewer, custom scripts

**Example**:
```bash
# Count token issuances
cat logs.json | jq 'select(.event == "token_issued") | .correlation_id' | wc -l
```

### Phase 1+: Native Metrics (Future)

- Integrate with metrics backend (Prometheus, Datadog)
- Real-time metrics dashboards
- Alerting on thresholds

**Pseudocode**:
```typescript
import { metrics } from './metrics';

// Increment counter
metrics.counter('tokens_issued_total').inc();

// Record histogram
metrics.histogram('token_issuance_duration').observe(durationMs);
```

## Alerting Rules

### Critical Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High error rate | `errors_total > 100 / 5min` | Page on-call engineer |
| Token validation failures | `token_validation_failed > 50% / 5min` | Investigate signature key |
| Service unavailable | `requests_total == 0 / 5min` | Check Edge Function health |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Elevated latency | `p95(request_duration) > 1000ms` | Review performance |
| Expired tokens | `token_expired_count > 10 / 5min` | Check client clock skew |

## Log Retention

### Supabase Default
- Logs retained for 7 days (free tier)
- Logs retained for 90 days (pro tier)

### Export Strategy
- Archive critical logs to external storage (S3, GCS)
- Compliance: Retain audit logs for regulatory requirements (e.g., 1 year)

**Export Script** (pseudocode):
```bash
# Daily cron job
supabase functions logs score-broker --since 24h > logs-$(date +%Y%m%d).json
aws s3 cp logs-$(date +%Y%m%d).json s3://my-bucket/logs/
```

## Privacy and Compliance

### PII Handling in Logs

| Field | Raw Value | Logged Value | Method |
|-------|-----------|--------------|--------|
| `national_id` | "12345678" | "sha256:abc...def" | SHA-256 hash |
| `email` | "user@example.com" | "example.com" | Extract domain |
| `full_name` | "John Doe" | (not logged) | Omit entirely |
| `phone` | "+1234567890" | (not logged) | Omit entirely |
| `ip_address` | "203.0.113.42" | "203.0.113.42" | Log (pseudonymous) |

### Hashing Implementation

```typescript
async function hashNationalId(nationalId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(nationalId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
}

// Usage
log('INFO', 'token_issued', {
  national_id_hash: await hashNationalId(nationalId),
  email_domain: email.split('@')[1]
});
```

### GDPR Compliance

- **Right to erasure**: Hashed national_id prevents direct lookup
- **Data minimization**: Only log necessary fields
- **Purpose limitation**: Logs used for security/debugging only
- **Retention limits**: Delete logs after retention period

## Query Examples

### Find all events for a correlation_id

```bash
# Using jq
cat logs.json | jq 'select(.correlation_id == "abc-123")'
```

### Count tokens issued in last hour

```bash
# Using jq
cat logs.json | jq 'select(.event == "token_issued" and .timestamp > "2025-11-08T16:00:00Z") | .correlation_id' | wc -l
```

### Calculate average token validation duration

```bash
# Using jq
cat logs.json | jq 'select(.event == "token_validation_success") | .duration_ms' | jq -s 'add / length'
```

### Find failed validations with reason

```bash
# Using jq
cat logs.json | jq 'select(.event == "token_validation_failed") | {correlation_id, reason, timestamp}'
```

## Monitoring Dashboard (Future)

### Key Panels

1. **Request Rate**: Line graph of requests/second over time
2. **Error Rate**: Percentage of requests with errors
3. **Latency Percentiles**: P50, P90, P99 request duration
4. **Token Lifecycle**: Tokens issued vs. validated
5. **Validation Failures**: Breakdown by reason (expired, invalid, missing)
6. **Top Errors**: Bar chart of error codes by frequency

### Example Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Request Rate (req/s)              Error Rate (%)           │
│  ▁▂▃▅▆▇█▇▆▅▃▂▁                     ▁▁▁▂▁▁▁▁▁▁               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Latency Percentiles (ms)          Token Lifecycle          │
│  P50: 45ms  P90: 120ms  P99: 380ms Issued: 1234 Valid: 1200│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Validation Failures (by reason)                            │
│  expired: █████████ 45%                                     │
│  invalid: ████ 20%                                          │
│  missing: ███ 15%                                           │
└─────────────────────────────────────────────────────────────┘
```

## Integration with External Tools

### Datadog

```typescript
// Send metrics to Datadog
import { datadogLogs } from '@datadog/browser-logs';

datadogLogs.init({
  clientToken: '<DD_CLIENT_TOKEN>',
  site: 'datadoghq.com',
  service: 'databox-mvl',
  env: 'production'
});

datadogLogs.logger.info('token_issued', {
  correlation_id: 'abc-123',
  ttl_seconds: 45
});
```

### Splunk

```bash
# Forward logs to Splunk HEC (HTTP Event Collector)
cat logs.json | curl -X POST https://splunk.example.com:8088/services/collector \
  -H "Authorization: Splunk <token>" \
  -d @-
```

### Prometheus

```typescript
// Expose metrics endpoint (future)
import { register, Counter, Histogram } from 'prom-client';

const tokensIssued = new Counter({
  name: 'tokens_issued_total',
  help: 'Total tokens issued'
});

serve(async (req) => {
  if (req.url.pathname === '/metrics') {
    return new Response(await register.metrics(), {
      headers: { 'Content-Type': register.contentType }
    });
  }
  // ... handle other requests
});
```

## Best Practices

### DO

✅ Always include `correlation_id` in logs
✅ Hash PII before logging (national_id)
✅ Use structured JSON format for machine parsing
✅ Log both success and failure events
✅ Include `duration_ms` for performance tracking
✅ Set appropriate log retention policies

### DON'T

❌ Log raw PII (national_id, full_name, phone)
❌ Log secrets or signing keys
❌ Use unstructured string logs (e.g., "User 123 logged in")
❌ Ignore error events (always log errors)
❌ Over-log (avoid logging every variable in debug mode)

## References

- docs/SECURITY_DECISION.md: Security architecture
- docs/AUTH_FLOW_CONTRACT.md: API specifications
- docs/ARCHITECTURE.md: System design
- Issue #33: Phase 0 implementation

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-08 | Initial observability documentation |
