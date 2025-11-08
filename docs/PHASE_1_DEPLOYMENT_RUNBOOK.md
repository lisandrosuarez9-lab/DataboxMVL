# Phase 1 Deployment Runbook

This runbook provides step-by-step instructions for deploying Phase 1 (JWT token authentication) to production without guesswork.

## Prerequisites

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project created and linked
- [ ] Node.js 18+ installed
- [ ] Access to Supabase secrets management
- [ ] Repository cloned locally

## Quick Start (5 minutes)

```bash
# 1. Generate keys
npm run generate-jwk

# 2. Copy the output and set secrets in Supabase
supabase secrets set SCORE_BROKER_ED25519_JWK='<private-jwk-from-step-1>'
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='<public-jwk-from-step-1>'

# 3. Deploy functions
supabase functions deploy score-broker
supabase functions deploy score-checker

# 4. Test deployment
export SUPABASE_URL="https://your-project.supabase.co"
npm run phase1:smoke-test
```

## Detailed Deployment Steps

### Step 1: Generate Ed25519 Keypair

Generate a new Ed25519 keypair for JWT signing:

```bash
npm run generate-jwk
```

This will output:
- `SCORE_BROKER_ED25519_JWK` - Private key for token signing
- `SCORE_CHECKER_ED25519_PUBLIC_JWK` - Public key for token verification

**⚠️ Important:**
- Keep the private key secret and secure
- Never commit keys to version control
- Store keys in password manager or secrets vault

### Step 2: Set Supabase Secrets

Set the generated keys as Supabase secrets:

```bash
# Replace <private-jwk> and <public-jwk> with actual values from Step 1
supabase secrets set SCORE_BROKER_ED25519_JWK='<private-jwk>'
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='<public-jwk>'
```

**Verify secrets are set:**
```bash
supabase secrets list
```

Expected output:
```
SCORE_BROKER_ED25519_JWK
SCORE_CHECKER_ED25519_PUBLIC_JWK
```

### Step 3: Deploy Edge Functions

Deploy both edge functions to Supabase:

```bash
# Deploy score-broker (token issuer)
supabase functions deploy score-broker

# Deploy score-checker (token verifier)
supabase functions deploy score-checker
```

**Verify deployment:**
```bash
supabase functions list
```

Expected status: `ACTIVE` for both functions

### Step 4: Smoke Test

Test the complete JWT flow:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
npm run phase1:smoke-test
```

Expected output:
```
✅ Phase 1 Smoke Test PASSED

Test Results:
  ✅ Token generation working
  ✅ Token verification working
  ✅ Replay protection working

Phase 1 is operational and ready for production use.
```

### Step 5: Monitor Logs

Check function logs for any issues:

```bash
# Score-broker logs
supabase functions logs score-broker --tail

# Score-checker logs
supabase functions logs score-checker --tail
```

Look for:
- `token_issued` events (score-broker)
- `token_validation_success` events (score-checker)
- No `ERROR` level logs

## Troubleshooting

### Problem: "Failed to load signing key"

**Cause:** Private key not set or invalid format

**Solution:**
1. Verify secret is set: `supabase secrets list`
2. Re-generate key: `npm run generate-jwk`
3. Re-set secret with new key
4. Re-deploy: `supabase functions deploy score-broker`

### Problem: "Token verification failed"

**Cause:** Public key doesn't match private key

**Solution:**
1. Ensure both keys are from the same generation
2. Re-generate keypair: `npm run generate-jwk`
3. Set both secrets with matching keys
4. Re-deploy both functions

### Problem: "Token has already been used"

**Cause:** This is normal - tokens are single-use

**Solution:**
- Request a new token from score-broker
- Each token can only be used once (replay protection)

### Problem: "Connection refused" during smoke test

**Cause:** SUPABASE_URL not set or incorrect

**Solution:**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
npm run phase1:smoke-test
```

### Problem: Smoke test fails with 401

**Cause:** Functions require authentication

**Solution:**
1. Check function settings in Supabase dashboard
2. Ensure functions allow anonymous access (or use anon key)
3. Update function CORS settings if needed

## Key Rotation

Rotate keys every 90 days or when compromised:

```bash
# 1. Generate new keypair with versioned kid
npm run rotate-key -- score-broker-ed25519-v2

# 2. Add new keys (keep old keys temporarily)
supabase secrets set SCORE_BROKER_ED25519_JWK='<new-private-jwk>'
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='<new-public-jwk>'

# 3. Update kid in function code
# Edit: supabase/functions/score-broker/index.ts
# Edit: supabase/functions/score-checker/index.ts

# 4. Deploy updated functions
supabase functions deploy score-broker
supabase functions deploy score-checker

# 5. Test with new keys
npm run phase1:smoke-test

# 6. Remove old keys (after verification)
supabase secrets unset SCORE_BROKER_ED25519_JWK_OLD
```

## Rollback Procedure

If deployment fails:

```bash
# 1. Check previous deployment
supabase functions list --include-build-id

# 2. Rollback to previous version
supabase functions deploy score-broker --previous-version
supabase functions deploy score-checker --previous-version

# 3. Restore old secrets (if keys were rotated)
supabase secrets set SCORE_BROKER_ED25519_JWK='<old-private-jwk>'
supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='<old-public-jwk>'

# 4. Verify rollback
npm run phase1:smoke-test
```

## Security Checklist

Before going to production:

- [ ] Private keys stored securely (not in code)
- [ ] Secrets set in Supabase (not in .env files)
- [ ] Functions deployed and tested
- [ ] Smoke test passes
- [ ] Logs showing successful token operations
- [ ] No secrets in git history
- [ ] Key rotation schedule documented
- [ ] Incident response plan in place
- [ ] Monitoring alerts configured
- [ ] Backup of keys stored securely

## Monitoring

### Key Metrics

Monitor these in Supabase logs:

1. **Token Issuance Rate**
   - Event: `token_issued`
   - Alert if: Sudden spike or drop

2. **Token Validation Failures**
   - Event: `token_validation_error`
   - Alert if: >5% failure rate

3. **Replay Attempts**
   - Event: `token_replay`
   - Alert if: Sudden spike (potential attack)

4. **Rate Limit Violations**
   - Event: `rate_limit_exceeded`
   - Log level: `WARN`
   - Track for capacity planning

### Log Queries

```bash
# Count token issuances (last hour)
supabase functions logs score-broker | grep token_issued | wc -l

# Find validation errors
supabase functions logs score-checker | grep token_validation_error

# Check replay protection
supabase functions logs score-checker | grep token_replay
```

## Production Readiness

### Before Launch
- [ ] All tests passing
- [ ] Keys generated and secured
- [ ] Functions deployed
- [ ] Smoke test successful
- [ ] Monitoring configured
- [ ] Documentation reviewed
- [ ] Team trained on procedures

### After Launch
- [ ] Monitor logs for 24 hours
- [ ] Verify expected traffic patterns
- [ ] Check for errors or warnings
- [ ] Document any issues
- [ ] Schedule first key rotation

## Support

### Common Commands

```bash
# Generate keys
npm run generate-jwk

# Rotate keys
npm run rotate-key

# Smoke test
npm run phase1:smoke-test

# Deploy functions
supabase functions deploy score-broker
supabase functions deploy score-checker

# Check logs
supabase functions logs score-broker
supabase functions logs score-checker

# List secrets
supabase secrets list

# Set secret
supabase secrets set KEY_NAME='value'
```

### Documentation

- [Phase 1 Implementation Guide](../docs/PHASE_1_JWT_IMPLEMENTATION.md)
- [Phase 1 Summary](../docs/PHASE_1_IMPLEMENTATION_SUMMARY.md)
- [Architecture Documentation](../docs/ARCHITECTURE.md)
- [Supabase Functions Docs](https://supabase.com/docs/guides/functions)

### Getting Help

1. Check function logs: `supabase functions logs <function-name>`
2. Review documentation in `docs/` directory
3. Run smoke test: `npm run phase1:smoke-test`
4. Check GitHub issues for similar problems
5. Contact DevOps team if issue persists

## Appendix

### JWK Structure

**Private Key (SCORE_BROKER_ED25519_JWK):**
```json
{
  "kty": "OKP",
  "crv": "Ed25519",
  "x": "<base64url-encoded-public-key>",
  "d": "<base64url-encoded-private-key>",
  "kid": "score-broker-ed25519-v1"
}
```

**Public Key (SCORE_CHECKER_ED25519_PUBLIC_JWK):**
```json
{
  "kty": "OKP",
  "crv": "Ed25519",
  "x": "<base64url-encoded-public-key>",
  "kid": "score-broker-ed25519-v1"
}
```

### Token Structure

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
  "iat": 1234567890,
  "exp": 1234567935,
  "nonce": "base64url-random-128bit",
  "correlation_id": "uuid",
  "requester_id": "hashed-email-domain",
  "scope": "score:single",
  "pii_hash": "sha256-of-national-id",
  "jti": "uuid"
}
```

### Rate Limits (Phase 1 - Log Only)

- Per PII: 1 request/minute
- Per requester: 10 requests/hour
- Action: Log only (not blocked)
- Phase 2: Will add hard limits

### Timeline

- Token TTL: 45 seconds
- Nonce cleanup: Every 60 seconds
- Key rotation: Every 90 days (recommended)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-08  
**Maintainer:** DevOps Team
