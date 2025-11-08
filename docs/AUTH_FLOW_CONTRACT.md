# Authentication Flow API Contract

## Overview

This document defines the API contract for the secure authentication flow between the DataboxMVL frontend and Edge Functions (score-broker and score-checker).

## Endpoints

### 1. POST /functions/v1/score-broker

**Purpose**: Issue short-lived bearer token for score-checker access.

**URL**: `https://<project-id>.supabase.co/functions/v1/score-broker`

**Method**: `POST`, `OPTIONS` (CORS preflight)

**Headers** (Request):
```
Content-Type: application/json
Origin: https://lisandrosuarez9-lab.github.io
x-factora-client: web-app/1.0
x-correlation-id: <optional-uuid>
```

**Request Body**:
```json
{
  "full_name": "string (required, min 3 chars)",
  "email": "string (required, valid email format)",
  "national_id": "string (required, min 5 chars)"
}
```

**Response** (200 OK):
```json
{
  "token": "demo.<base64-encoded-payload>",
  "ttl_seconds": 45,
  "correlation_id": "uuid-v4",
  "issued_at": "ISO-8601 timestamp"
}
```

**Demo Token Payload** (decoded from base64):
```json
{
  "nonce": "uuid-v4",
  "correlation_id": "uuid-v4",
  "exp": 1699464123
}
```

**Error Responses**:

| Status | Error Code | Description |
|--------|-----------|-------------|
| 400 | `missing_fields` | Required field(s) missing in request |
| 400 | `invalid_json` | Request body is not valid JSON |
| 400 | `invalid_email` | Email format is invalid |
| 405 | `method_not_allowed` | Only POST and OPTIONS allowed |
| 429 | `rate_limit_exceeded` | Too many requests (future) |
| 500 | `internal_error` | Server error, includes correlation_id |

**CORS Headers** (Response):
```
Access-Control-Allow-Origin: https://lisandrosuarez9-lab.github.io
Access-Control-Allow-Headers: content-type, authorization, x-factora-client, x-correlation-id
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Max-Age: 86400
```

---

### 2. POST /functions/v1/score-checker

**Purpose**: Process credit score request with bearer token authorization.

**URL**: `https://<project-id>.supabase.co/functions/v1/score-checker`

**Method**: `POST`, `OPTIONS` (CORS preflight)

**Headers** (Request):
```
Content-Type: application/json
Origin: https://lisandrosuarez9-lab.github.io
x-factora-client: web-app/1.0
x-correlation-id: <optional-uuid>
Authorization: Bearer <token-from-score-broker>
```

**Header Compatibility**:
- **x-correlation-id**: New standard header (Phase 0+)
- **x-factora-correlation-id**: Legacy header (backward compatible)
- Precedence: If both present, `x-correlation-id` takes priority

**Request Body**:
```json
{
  "full_name": "string (required)",
  "email": "string (required)",
  "national_id": "string (required)",
  "phone": "string (optional)",
  "consent": true,
  "consent_text": "string (optional)",
  "intake_source": "string (optional)",
  "intake_form_version": "string (optional)",
  "intent_financing": "boolean (optional)",
  "prior_borrowing": "boolean (optional)"
}
```

**Response** (200 OK):
```json
{
  "borrower": {
    "borrower_id": "string",
    "full_name": "string",
    "email": "string",
    "phone": "string|null",
    "national_id": "string",
    "created_at": "ISO-8601 timestamp"
  },
  "score": {
    "score_id": "string",
    "factora_score": 300-850,
    "score_band": "poor|fair|good|very_good|excellent"
  },
  "enrichment": {
    "source": "string",
    "notes": "string"
  },
  "correlation_id": "uuid-v4"
}
```

**Authorization Modes**:

| Authorization Header | Mode | Behavior |
|---------------------|------|----------|
| Missing | Demo | Process request without validation |
| `Bearer demo.*` | Demo | Process request without validation |
| `Bearer <signed-token>` | Secure | Validate signature, nonce, expiration (Phase 1+) |

**Error Responses**:

| Status | Error Code | Description |
|--------|-----------|-------------|
| 400 | `missing_fields` | Required field(s) missing |
| 400 | `invalid_json` | Request body is not valid JSON |
| 401 | `invalid_token` | Token signature invalid (secure mode) |
| 401 | `token_expired` | Token TTL exceeded |
| 401 | `token_reused` | Nonce already seen (future) |
| 405 | `method_not_allowed` | Only POST and OPTIONS allowed |
| 500 | `internal_error` | Server error, includes correlation_id |

**CORS Headers** (Response):
```
Access-Control-Allow-Origin: https://lisandrosuarez9-lab.github.io
Access-Control-Allow-Headers: content-type, authorization, x-factora-client, x-correlation-id
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Max-Age: 86400
```

---

## Token Format Specifications

### Demo Mode (Phase 0)

**Format**: `demo.<base64url(JSON)>`

**Example**:
```
demo.eyJub25jZSI6ImFiY2RlZi0xMjM0LTU2NzgiLCJjb3JyZWxhdGlvbl9pZCI6Ijc4OTAtcXdlcnR5IiwiZXhwIjoxNjk5NDY0MTIzfQ
```

**Decoded**:
```json
{
  "nonce": "abcdef-1234-5678",
  "correlation_id": "7890-qwerty",
  "exp": 1699464123
}
```

**Security**: No cryptographic signature. Relies on HTTPS and CORS.

### Secure Mode (Phase 1+)

**Format**: `JWT` (RFC 7519) with HMAC-SHA256 or RS256

**Example**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImFiY2RlZi0xMjM0LTU2NzgiLCJjb3JyZWxhdGlvbl9pZCI6Ijc4OTAtcXdlcnR5IiwiZXhwIjoxNjk5NDY0MTIzLCJpYXQiOjE2OTk0NjQwNzgsImF1ZCI6InNjb3JlLWNoZWNrZXIifQ.signature
```

**Payload**:
```json
{
  "nonce": "uuid-v4",
  "correlation_id": "uuid-v4",
  "exp": 1699464123,
  "iat": 1699464078,
  "aud": "score-checker"
}
```

**Security**: HMAC-SHA256 signature verified by score-checker.

---

## Header Specifications

### Standard Headers (All Requests)

| Header | Required | Format | Purpose |
|--------|----------|--------|---------|
| `Content-Type` | Yes | `application/json` | Request body format |
| `Origin` | Yes (browser) | `https://lisandrosuarez9-lab.github.io` | CORS validation |

### Custom Headers

| Header | Required | Format | Purpose |
|--------|----------|--------|---------|
| `x-factora-client` | Recommended | `web-app/1.0` | Client identification for telemetry |
| `x-correlation-id` | Optional | UUID v4 | Request tracing (auto-generated if missing) |
| `x-factora-correlation-id` | Legacy | UUID v4 | Backward compatibility (deprecated) |
| `Authorization` | Conditional | `Bearer <token>` | Required in secure mode |

---

## Error Response Schema

All error responses follow this structure:

```json
{
  "error": "error_code",
  "message": "Human-readable error description (optional)",
  "correlation_id": "uuid-v4",
  "timestamp": "ISO-8601 timestamp (optional)"
}
```

### Error Codes

| Code | HTTP Status | Retry? | Description |
|------|-------------|--------|-------------|
| `missing_fields` | 400 | No | Client error, fix request |
| `invalid_json` | 400 | No | Malformed JSON body |
| `invalid_email` | 400 | No | Email format validation failed |
| `invalid_token` | 401 | No | Token signature invalid |
| `token_expired` | 401 | Yes | Get new token and retry |
| `token_reused` | 401 | No | Nonce already consumed |
| `method_not_allowed` | 405 | No | Use POST or OPTIONS |
| `rate_limit_exceeded` | 429 | Yes (backoff) | Wait and retry |
| `internal_error` | 500 | Yes | Server error, retry with backoff |

---

## Request Flow Diagrams

### Demo Mode Flow

```
Frontend                score-checker
   |                          |
   |---POST (PII + data)----->|
   |                          |
   |<--200 OK (score data)----|
   |    (correlation_id)      |
```

### Secure Mode Flow

```
Frontend            score-broker         score-checker
   |                     |                      |
   |--POST (PII)-------->|                      |
   |                     |                      |
   |<-200 OK (token)-----|                      |
   |  (correlation_id)   |                      |
   |                                            |
   |--POST (PII + Authorization: Bearer token)->|
   |                                            |
   |<--------200 OK (score data)----------------|
   |            (correlation_id)                |
```

---

## Observability Integration

### Correlation ID Propagation

1. Frontend generates or receives `correlation_id` from score-broker
2. Frontend includes `x-correlation-id` header in score-checker request
3. score-checker echoes `correlation_id` in response body
4. All logs include `correlation_id` for tracing

### Log Fields

See `docs/OBSERVABILITY.md` for complete log schema.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-08 | Initial Phase 0 contract (demo mode) |
| 1.1.0 | TBD | Phase 1 secure mode with HMAC tokens |
| 1.2.0 | TBD | Phase 2 JWT with RS256 signatures |

---

## References

- docs/SECURITY_DECISION.md: Security architecture rationale
- docs/FEATURE_FLAG.md: SCORE_MODE environment variable
- docs/OBSERVABILITY.md: Logging and metrics
- Issue #33: Phase 0 implementation tracking
