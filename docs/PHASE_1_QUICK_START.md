# Phase 1 Quick Start Guide

## For Developers

### Key Generation (One-Time Setup)

```typescript
// Generate Ed25519 key pair using Deno
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { crv: 'Ed25519' });

const privateJWK = await jose.exportJWK(privateKey);
privateJWK.kid = 'score-broker-ed25519-v1';

const publicJWK = await jose.exportJWK(publicKey);
publicJWK.kid = 'score-broker-ed25519-v1';

console.log('Private JWK:', JSON.stringify(privateJWK, null, 2));
console.log('Public JWK:', JSON.stringify(publicJWK, null, 2));
```

Or run the test script:
```bash
deno run --allow-env --allow-net tests/test-jwt-flow.ts
```

### Configure Supabase Secrets

```bash
# Set private key (required)
supabase secrets set SCORE_BROKER_ED25519_JWK='{"kty":"OKP","crv":"Ed25519",...}'

# Set public key (optional - can reuse private key)
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='{"kty":"OKP","crv":"Ed25519",...}'
```

### Deploy Functions

```bash
# Deploy score-broker
supabase functions deploy score-broker

# Deploy score-checker  
supabase functions deploy score-checker

# Or deploy both
supabase functions deploy
```

### Test the Implementation

```bash
# Run validation checks
node tests/validate-phase1.cjs

# Expected output: 42/42 checks passed ✅
```

## For API Consumers

### Step 1: Request a Token

```bash
curl -X POST https://<project>.supabase.co/functions/v1/score-broker \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: test-123" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "national_id": "12345678"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJFZERTQSIsImtpZCI6InNjb3JlLWJyb2tlci1lZDI1NTE5LXYxIiwidHlwIjoiSldUIn0...",
  "ttl_seconds": 45,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "issued_at": "2024-01-15T10:30:00.000Z"
}
```

### Step 2: Use Token to Get Score

```bash
curl -X POST https://<project>.supabase.co/functions/v1/score-checker \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-from-step-1>" \
  -H "x-correlation-id: test-123" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "national_id": "12345678"
  }'
```

**Response:**
```json
{
  "borrower": {
    "borrower_id": "demo-123456",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": null,
    "national_id": "12345678",
    "created_at": "2024-01-15T10:30:05.000Z"
  },
  "score": {
    "score_id": "score-789012",
    "factora_score": 650,
    "score_band": "fair"
  },
  "enrichment": {
    "source": "demo",
    "notes": "synthetic demo enrichment"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Step 3: Test Replay Protection (Optional)

Resubmit the same token from Step 2:

```bash
# Use the same curl command from Step 2
```

**Expected Response:**
```json
{
  "error": "token_replay",
  "message": "Token has already been used",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Common Issues

### "Failed to load signing key"
**Cause:** Missing or invalid `SCORE_BROKER_ED25519_JWK` secret

**Solution:**
1. Generate a new key pair
2. Verify the JSON is valid
3. Set the secret: `supabase secrets set SCORE_BROKER_ED25519_JWK='...'`

### "Token verification failed"
**Causes:**
- Token expired (45s TTL)
- Wrong public key
- Token tampered with

**Solutions:**
1. Request a new token
2. Verify public key matches private key
3. Check for clock skew between systems

### "Token has already been used"
**Cause:** Normal - tokens are single-use only

**Solution:** Request a new token from score-broker

## Token Structure

**JWT Header:**
```json
{
  "alg": "EdDSA",
  "kid": "score-broker-ed25519-v1",
  "typ": "JWT"
}
```

**JWT Claims:**
```json
{
  "iss": "score-broker",
  "aud": "score-checker",
  "iat": 1705318200,
  "exp": 1705318245,
  "nonce": "dGVzdG5vbmNlMTIzNDU2",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "requester_id": "a1b2c3d4e5f6...",
  "scope": "score:single",
  "pii_hash": "1234567890ab...",
  "jti": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

## Rate Limits (Soft - Log Only)

Current limits are **log-only** (violations logged but not blocked):

- **Per PII:** 1 request per minute
- **Per Requester:** 10 requests per hour

Check logs for warnings:
```json
{
  "level": "WARN",
  "event": "rate_limit_exceeded",
  "limit_type": "pii_per_minute",
  "count": 2,
  "limit": 1
}
```

## Monitoring

### Key Log Events

**Token Issued:**
```json
{
  "event": "token_issued",
  "correlation_id": "...",
  "jti": "...",
  "ttl_seconds": 45,
  "token_format": "EdDSA-Ed25519"
}
```

**Token Validated:**
```json
{
  "event": "token_validation_success",
  "correlation_id": "...",
  "jti": "...",
  "ttl_remaining_seconds": 40
}
```

**Replay Detected:**
```json
{
  "event": "token_replay_detected",
  "correlation_id": "...",
  "jti": "..."
}
```

## Best Practices

1. **Token Lifecycle:**
   - Request token immediately before use
   - Use within 45 seconds
   - Don't cache or reuse tokens

2. **Correlation Tracking:**
   - Always include `x-correlation-id` header
   - Use same correlation ID for related requests
   - Track correlation IDs in your logs

3. **Error Handling:**
   - Check for `error` field in responses
   - Handle replay errors by requesting new token
   - Implement retry logic for transient failures

4. **Security:**
   - Never log full tokens
   - Transmit tokens only over HTTPS
   - Store keys securely (Supabase secrets)

## More Information

- **Full Documentation:** [docs/PHASE_1_JWT_IMPLEMENTATION.md](./PHASE_1_JWT_IMPLEMENTATION.md)
- **Implementation Summary:** [docs/PHASE_1_IMPLEMENTATION_SUMMARY.md](./PHASE_1_IMPLEMENTATION_SUMMARY.md)
- **Issue:** #34
- **RFC 8037:** CFRG Elliptic Curve Signatures
- **RFC 7519:** JSON Web Token (JWT)
