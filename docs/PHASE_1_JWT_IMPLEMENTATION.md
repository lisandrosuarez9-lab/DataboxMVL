# Phase 1: MVP Token Implementation

This directory contains the implementation of Phase 1 for issue #34, which adds EdDSA (Ed25519) JWT token signing and verification with replay protection and soft rate limits.

## Overview

Phase 1 implements a secure token-based flow for credit scoring:

1. **score-broker** - Issues signed JWT tokens
2. **score-checker** - Verifies tokens and processes score requests

## Architecture

```
┌─────────────┐                                    ┌──────────────┐
│             │  1. Request token                  │              │
│   Client    │ ---------------------------------> │score-broker  │
│             │  POST /score-broker                │              │
│             │  {full_name, email, national_id}   │   Signs JWT  │
│             │                                    │   with EdDSA │
│             │  2. Receive signed JWT             │              │
│             │ <--------------------------------- │              │
│             │  {token, ttl, correlation_id}      │              │
└─────────────┘                                    └──────────────┘
       │
       │  3. Submit token + PII
       │  POST /score-checker
       │  Authorization: Bearer <jwt>
       │  {full_name, email, national_id}
       │
       v
┌──────────────┐
│              │
│score-checker │
│              │  - Verifies JWT signature
│  Verifies    │  - Checks expiration (45s TTL)
│  JWT token   │  - Prevents replay attacks
│              │  - Returns credit score
└──────────────┘
```

## Features

### score-broker

**Signing & Tokens:**
- EdDSA (Ed25519) JWT signing using `jose` library
- JWT Header: `{ alg: "EdDSA", kid: "score-broker-ed25519-v1", typ: "JWT" }`
- JWT Claims:
  - `iss`: "score-broker"
  - `aud`: "score-checker"
  - `iat`: Issued at timestamp
  - `exp`: Expiration (now + 45 seconds)
  - `nonce`: 128-bit random value (base64url encoded)
  - `correlation_id`: UUID for request tracking
  - `requester_id`: Hashed email domain
  - `scope`: "score:single"
  - `pii_hash`: SHA-256 hash of national_id
  - `jti`: JWT ID (UUID)

**Rate Limiting (Soft - Log Only):**
- Per PII hash: 1 request/minute
- Per requester: 10 requests/hour
- Uses in-memory counters with time windows
- Violations logged but not blocked (soft limits)

**Privacy & Logging:**
- PII hashed with SHA-256 before logging
- Only first 16 hex characters of hashes logged
- Structured JSON logging with correlation tracking

### score-checker

**Token Verification:**
- EdDSA signature verification using `jose` library
- Validates issuer, audience, and expiration
- Checks all required claims are present

**Replay Protection:**
- In-memory nonce tracking
- Each nonce can only be used once
- Expired nonces automatically cleaned up every 60 seconds

**Backward Compatibility:**
- Still accepts "demo." tokens for backward compatibility
- Seamlessly transitions between demo and secure modes

## Configuration

### Environment Variables (Supabase Secrets)

#### Required:

1. **SCORE_BROKER_ED25519_JWK** (Private Key)
   ```json
   {
     "kty": "OKP",
     "crv": "Ed25519",
     "x": "<base64url-encoded-public-key>",
     "d": "<base64url-encoded-private-key>",
     "kid": "score-broker-ed25519-v1"
   }
   ```

#### Optional:

2. **SCORE_CHECKER_ED25519_PUBLIC_JWK** (Public Key Only)
   ```json
   {
     "kty": "OKP",
     "crv": "Ed25519",
     "x": "<base64url-encoded-public-key>",
     "kid": "score-broker-ed25519-v1"
   }
   ```
   
   Note: If not provided, score-checker will use `SCORE_BROKER_ED25519_JWK` (which contains the public key).

### Generating Keys

#### Using Deno:

```typescript
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { crv: 'Ed25519' });

const privateJWK = await jose.exportJWK(privateKey);
privateJWK.kid = 'score-broker-ed25519-v1';

const publicJWK = await jose.exportJWK(publicKey);
publicJWK.kid = 'score-broker-ed25519-v1';

console.log('Private JWK:', JSON.stringify(privateJWK, null, 2));
console.log('Public JWK:', JSON.stringify(publicJWK, null, 2));
```

#### Using the Test Script:

```bash
deno run --allow-env --allow-net tests/test-jwt-flow.ts
```

The test script will generate keys and display them in the output.

### Setting Supabase Secrets

```bash
# Set the private key (required)
supabase secrets set SCORE_BROKER_ED25519_JWK='{"kty":"OKP","crv":"Ed25519",...}'

# Optional: Set public key separately
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='{"kty":"OKP","crv":"Ed25519",...}'
```

## Testing

### Local Testing with Test Script

Run the comprehensive test suite:

```bash
cd tests
deno run --allow-env --allow-net test-jwt-flow.ts
```

The test suite validates:
1. ✓ Token generation with proper structure
2. ✓ Token signature verification
3. ✓ Replay protection (nonce tracking)
4. ✓ Expired token rejection
5. ✓ Tampered token rejection

### Manual Testing

#### 1. Generate Token (score-broker):

```bash
curl -X POST https://<project>.supabase.co/functions/v1/score-broker \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: test-123" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "national_id": "12345678"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJFZERTQSIsImtpZCI6InNjb3JlLWJyb2tlci1lZDI1NTE5LXYxIiwidHlwIjoiSldUIn0...",
  "ttl_seconds": 45,
  "correlation_id": "uuid-here",
  "issued_at": "2024-01-15T10:30:00.000Z"
}
```

#### 2. Use Token (score-checker):

```bash
curl -X POST https://<project>.supabase.co/functions/v1/score-checker \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-from-step-1>" \
  -H "x-correlation-id: test-123" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "national_id": "12345678"
  }'
```

#### 3. Test Replay Protection:

Resubmit the same token from step 2. Should return:
```json
{
  "error": "token_replay",
  "message": "Token has already been used",
  "correlation_id": "uuid-here"
}
```

## Deployment

```bash
# Deploy both functions
supabase functions deploy score-broker
supabase functions deploy score-checker
```

## Monitoring

### Structured Logs

All operations emit structured JSON logs for monitoring:

**score-broker logs:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "event": "token_issued",
  "correlation_id": "uuid",
  "pii_hash_truncated": "a1b2c3d4e5f6g7h8",
  "email_domain": "example.com",
  "requester_id_truncated": "1234567890abcdef",
  "jti": "uuid",
  "ttl_seconds": 45,
  "token_format": "EdDSA-Ed25519",
  "scope": "score:single",
  "duration_ms": 123
}
```

**score-checker logs:**
```json
{
  "timestamp": "2024-01-15T10:30:05.000Z",
  "level": "INFO",
  "event": "token_validation_success",
  "correlation_id": "uuid",
  "jti": "uuid",
  "scope": "score:single",
  "ttl_remaining_seconds": 40,
  "authorization_mode": "secure",
  "duration_ms": 45
}
```

### Rate Limit Warnings

```json
{
  "timestamp": "2024-01-15T10:30:10.000Z",
  "level": "WARN",
  "event": "rate_limit_exceeded",
  "correlation_id": "uuid",
  "limit_type": "pii_per_minute",
  "pii_hash_truncated": "a1b2c3d4e5f6g7h8",
  "count": 2,
  "limit": 1,
  "action": "log_only"
}
```

## Security Considerations

### What's Protected:

✅ Token authenticity (EdDSA signature)
✅ Token expiration (45-second TTL)
✅ Replay attacks (nonce tracking)
✅ PII privacy in logs (hashed and truncated)
✅ Issuer/audience validation
✅ Required claims validation

### What's Not Yet Implemented:

⚠️ Hard rate limits (current limits are log-only)
⚠️ Distributed nonce tracking (in-memory only)
⚠️ Key rotation mechanism
⚠️ Token revocation lists
⚠️ Client authentication (anyone can request tokens)

### Future Phases:

- **Phase 2**: Add client authentication for token requests
- **Phase 3**: Distributed rate limiting and nonce tracking (Redis/database)
- **Phase 4**: Key rotation and token revocation

## Troubleshooting

### "Failed to load signing key"

- Check that `SCORE_BROKER_ED25519_JWK` is set in Supabase secrets
- Verify the JWK is valid JSON
- Ensure the JWK has the correct structure (kty: "OKP", crv: "Ed25519")

### "Token verification failed"

- Check that public key matches private key
- Ensure token hasn't expired (45-second TTL)
- Verify no clock skew between systems
- Check logs for specific error details

### "Token has already been used"

- This is normal - tokens are single-use
- Request a new token from score-broker
- For testing, wait for nonce to expire (45 seconds)

## Implementation Notes

### Why EdDSA (Ed25519)?

- Fast signature generation and verification
- Small signature size (64 bytes)
- High security (128-bit security level)
- Simpler than RSA or ECDSA
- Native support in modern crypto libraries

### Why 45-second TTL?

- Short enough to limit replay window
- Long enough for network latency
- Balances security and usability
- Can be adjusted based on needs

### Why In-Memory Nonce Tracking?

- Fast lookup performance
- Simple implementation for Phase 1
- Automatic cleanup on expiration
- Will be migrated to Redis/database in Phase 3 for multi-instance deployments

## References

- [Issue #34](https://github.com/lisandrosuarez9-lab/DataboxMVL/issues/34) - Original requirement
- [RFC 8037](https://datatracker.ietf.org/doc/html/rfc8037) - CFRG Elliptic Curve Signatures
- [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) - JSON Web Token (JWT)
- [jose Documentation](https://github.com/panva/jose) - JavaScript/TypeScript JWT library
