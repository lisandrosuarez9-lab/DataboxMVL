# Key Management Strategy

## Overview

This document outlines the key management strategy for DataboxMVL's secure credit scoring system, including key generation, storage, rotation, and overlap windows for zero-downtime transitions.

> **Note**: This is a **placeholder document** for Phase 0. Full key management implementation is planned for Phase 1 and Phase 2. See issue tracking for Phase 1 (#TBD) and Phase 2 (#TBD).

## Phase Roadmap

### Phase 0: Demo Mode (Current)

**Status**: No key management required

- Tokens are **unsigned** (format: `demo.<base64>`)
- No cryptographic operations
- Security relies on HTTPS and CORS only
- Purpose: Establish API contract and data flow patterns

**Key Requirements**: None

### Phase 1: HMAC-SHA256 Tokens (Future)

**Status**: Planned

- Tokens signed with **HMAC-SHA256**
- Shared secret key between score-broker (sign) and score-checker (verify)
- Key stored in Supabase Edge Function environment
- Manual key generation and rotation

**Key Requirements**:
- `TOKEN_SIGNING_KEY`: 32-byte (256-bit) random secret, base64-encoded
- Single active key (no overlap initially)

**Issues**: TBD (Phase 1 tracking issue)

### Phase 2: Key Rotation with Overlap (Future)

**Status**: Planned

- Automated key rotation with overlap windows
- Multiple active keys: `primary` (signing), `secondary` (verification only)
- Zero-downtime rotation strategy
- Metrics and alerting for key lifecycle

**Key Requirements**:
- `TOKEN_SIGNING_KEY_PRIMARY`: Current signing key
- `TOKEN_SIGNING_KEY_SECONDARY`: Previous key (still valid for verification)
- Key metadata: creation timestamp, rotation schedule

**Issues**: TBD (Phase 2 tracking issue)

---

## Key Generation (Phase 1+)

### HMAC-SHA256 Secret Generation

**Recommended Method**: OpenSSL

```bash
# Generate 32-byte random secret, base64-encoded
openssl rand -base64 32

# Example output:
# 7J2K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7=
```

**Alternative Methods**:

```python
# Python
import secrets
import base64
key = base64.b64encode(secrets.token_bytes(32)).decode('utf-8')
print(key)
```

```javascript
// Node.js
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('base64');
console.log(key);
```

**Key Properties**:
- **Length**: 32 bytes (256 bits) for HMAC-SHA256
- **Encoding**: Base64 for safe storage in environment variables
- **Entropy**: Cryptographically secure random number generator (CSPRNG)

### Key Storage

**Location**: Supabase Edge Function Secrets

**Set Secret**:
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Set secret
supabase secrets set TOKEN_SIGNING_KEY=<base64-encoded-key> --project-ref <project-id>
```

**List Secrets** (names only, values hidden):
```bash
supabase secrets list --project-ref <project-id>
```

**Unset Secret**:
```bash
supabase secrets unset TOKEN_SIGNING_KEY --project-ref <project-id>
```

**Access in Edge Function**:
```typescript
// score-broker (sign)
const signingKey = Deno.env.get('TOKEN_SIGNING_KEY');
if (!signingKey) {
  throw new Error('TOKEN_SIGNING_KEY not configured');
}

// score-checker (verify)
const signingKey = Deno.env.get('TOKEN_SIGNING_KEY');
if (!signingKey) {
  throw new Error('TOKEN_SIGNING_KEY not configured');
}
```

---

## Key Rotation Strategy (Phase 2+)

### Rotation Goals

1. **Zero Downtime**: No service interruption during key rotation
2. **Overlap Window**: Old tokens remain valid during transition
3. **Automated Process**: Minimal manual intervention
4. **Auditability**: Log all key lifecycle events

### Rotation Overlap Window

**Timeline**:

```
Day 0             Day 30            Day 35            Day 60
│                 │                 │                 │
├─────────────────┼─────────────────┼─────────────────┤
│   Key A (sign)  │ Key A (verify)  │ Key A (expired) │
│                 │   Key B (sign)  │   Key B (sign)  │
│                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
       30 days          5 days           25 days
     (active only)  (overlap window)   (active only)
```

**Phases**:

1. **Day 0**: Key A is primary (signing + verification)
2. **Day 30**: Generate Key B, promote to primary (signing), keep Key A as secondary (verification only)
3. **Day 35**: Revoke Key A (all tokens signed with Key A have expired)
4. **Day 60**: Repeat rotation process (Key B → Key C)

### Rotation Frequency

**Recommended**: 30 days

**Rationale**:
- Balance security (limit key exposure) and operational overhead
- Aligns with common compliance requirements (PCI-DSS, SOC 2)
- Short token TTL (45 seconds) allows quick overlap window (5 days is overkill, but safe)

**Adjustments**:
- **Increase frequency** (e.g., 7 days) if:
  - Higher security requirements
  - Key compromise suspected
  - Compliance mandates shorter rotation
- **Decrease frequency** (e.g., 90 days) if:
  - Low-risk environment
  - Operational overhead is a concern

### Rotation Procedure (Manual - Phase 1)

**Step 1: Generate New Key**
```bash
# Generate Key B
NEW_KEY=$(openssl rand -base64 32)
echo "New key: $NEW_KEY"
```

**Step 2: Add New Key as Secondary**
```bash
# Set secondary key (verification only)
supabase secrets set TOKEN_SIGNING_KEY_SECONDARY=$NEW_KEY --project-ref <project-id>
```

**Step 3: Update score-checker to Accept Both Keys**
```typescript
// score-checker
const primaryKey = Deno.env.get('TOKEN_SIGNING_KEY');
const secondaryKey = Deno.env.get('TOKEN_SIGNING_KEY_SECONDARY');

function verifyToken(token: string): boolean {
  // Try primary key first
  if (verifyHMAC(token, primaryKey)) {
    return true;
  }
  // Fallback to secondary key
  if (secondaryKey && verifyHMAC(token, secondaryKey)) {
    return true;
  }
  return false;
}
```

**Step 4: Wait for Overlap Window**
- Duration: Token TTL × 2 (e.g., 45 seconds × 2 = 90 seconds)
- Purpose: Ensure all tokens signed with old key have expired

**Step 5: Promote New Key to Primary**
```bash
# Swap keys
OLD_KEY=$(supabase secrets get TOKEN_SIGNING_KEY --project-ref <project-id>)
supabase secrets set TOKEN_SIGNING_KEY=$NEW_KEY --project-ref <project-id>
supabase secrets set TOKEN_SIGNING_KEY_SECONDARY=$OLD_KEY --project-ref <project-id>
```

**Step 6: Verify Rotation**
```bash
# Test token issuance and validation
curl -X POST https://<project-id>.supabase.co/functions/v1/score-broker \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@example.com","national_id":"12345678"}'

# Verify token validates successfully
```

**Step 7: Revoke Old Key (After Extended Overlap)**
```bash
# After 24 hours (safe buffer), remove secondary key
supabase secrets unset TOKEN_SIGNING_KEY_SECONDARY --project-ref <project-id>
```

### Automated Rotation (Phase 2)

**Components**:

1. **Cron Job**: Trigger rotation every 30 days
2. **Rotation Script**: Generate key, update secrets, deploy functions
3. **Metrics**: Track key age, rotation events, validation errors
4. **Alerts**: Notify on rotation failures or key near expiry

**Pseudocode**:
```typescript
// rotation-cron.ts (run daily)
async function checkAndRotateKey() {
  const keyMetadata = await getKeyMetadata(); // Fetch from database
  const keyAgeMs = Date.now() - keyMetadata.createdAt;
  const keyAgeDays = keyAgeMs / (1000 * 60 * 60 * 24);

  if (keyAgeDays >= 30) {
    console.log(`Key age ${keyAgeDays} days, rotating...`);
    await rotateKey();
    await notifyAdmins('Key rotation completed');
  } else {
    console.log(`Key age ${keyAgeDays} days, no rotation needed`);
  }
}

async function rotateKey() {
  // Generate new key
  const newKey = generateKey();
  
  // Store as secondary
  await setSecret('TOKEN_SIGNING_KEY_SECONDARY', newKey);
  
  // Wait for overlap window
  await sleep(90 * 1000); // 90 seconds
  
  // Promote to primary
  const oldKey = await getSecret('TOKEN_SIGNING_KEY');
  await setSecret('TOKEN_SIGNING_KEY', newKey);
  
  // Wait for extended overlap (24 hours)
  await sleep(24 * 60 * 60 * 1000);
  
  // Revoke old key
  await unsetSecret('TOKEN_SIGNING_KEY_SECONDARY');
  
  // Update metadata
  await updateKeyMetadata({ createdAt: Date.now(), keyId: newKey.substring(0, 8) });
}
```

---

## Key Compromise Response

### Detection Indicators

- Unusual token validation errors
- Tokens with valid signatures but suspicious payloads
- Unauthorized access to Supabase secrets management

### Immediate Actions

1. **Revoke Compromised Key**:
   ```bash
   supabase secrets unset TOKEN_SIGNING_KEY --project-ref <project-id>
   ```

2. **Generate New Key**:
   ```bash
   NEW_KEY=$(openssl rand -base64 32)
   supabase secrets set TOKEN_SIGNING_KEY=$NEW_KEY --project-ref <project-id>
   ```

3. **Invalidate All Existing Tokens**:
   - Tokens expire automatically after 45 seconds
   - No persistent token storage, so no database cleanup needed

4. **Audit Logs**:
   - Review logs for suspicious token usage
   - Identify compromised accounts or IP addresses

5. **Notify Stakeholders**:
   - Inform security team
   - Document incident in security log

### Post-Incident Review

- Root cause analysis: How was key compromised?
- Implement mitigations: Improve access controls, enable MFA, etc.
- Update rotation frequency: Consider more frequent rotations (e.g., weekly)

---

## Key Lifecycle Metrics (Phase 2+)

| Metric | Description |
|--------|-------------|
| `key_age_days` | Days since current key was created |
| `key_rotation_count` | Total number of key rotations |
| `key_rotation_errors` | Failed rotation attempts |
| `tokens_signed_with_old_key` | Tokens validated with secondary key (during overlap) |

**Alerts**:
- Key age > 35 days (rotation overdue)
- Key rotation failed
- High rate of tokens validated with old key (extended overlap needed)

---

## Security Considerations

### DO

✅ Store keys in Supabase Edge Function secrets (not in code or environment files)
✅ Use CSPRNG for key generation (e.g., `openssl rand`, `crypto.randomBytes`)
✅ Rotate keys regularly (every 30 days recommended)
✅ Use overlap windows for zero-downtime rotation
✅ Log key lifecycle events (generation, rotation, revocation)
✅ Audit access to secrets management

### DON'T

❌ Commit keys to version control (Git, GitHub)
❌ Share keys via email, Slack, or unencrypted channels
❌ Reuse keys across environments (dev, staging, prod)
❌ Use weak keys (e.g., short passwords, dictionary words)
❌ Skip overlap windows (causes token validation errors)
❌ Ignore key rotation schedules

---

## Alternative Key Management Solutions (Future)

### AWS Secrets Manager

**Pros**:
- Automatic rotation
- IAM integration
- Audit logging (CloudTrail)

**Cons**:
- Additional cost
- Complexity (requires AWS account)

### HashiCorp Vault

**Pros**:
- Dynamic secrets
- Fine-grained access control
- Multi-cloud support

**Cons**:
- Self-hosted (operational overhead)
- Steep learning curve

### Supabase Secrets + KMS (Future Enhancement)

**Proposal**: Integrate Supabase with AWS KMS or GCP KMS for envelope encryption

**Benefits**:
- Hardware-backed key storage
- Centralized key management
- Compliance (FIPS 140-2)

---

## Compliance Mapping

| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| PCI-DSS 3.2.1 | Requirement 3.6: Cryptographic key management | Key rotation every 30 days |
| SOC 2 | CC6.1: Logical access controls | Supabase secrets with RBAC |
| GDPR | Article 32: Security of processing | Encryption of tokens in transit |
| NIST SP 800-57 | Key management best practices | CSPRNG, key rotation, overlap windows |

---

## Testing Key Rotation

### Manual Test (Phase 1)

```bash
# Step 1: Issue token with Key A
TOKEN_A=$(curl -X POST https://<project-id>.supabase.co/functions/v1/score-broker \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@example.com","national_id":"12345678"}' \
  | jq -r '.token')

# Step 2: Validate token with Key A
curl -X POST https://<project-id>.supabase.co/functions/v1/score-checker \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@example.com","national_id":"12345678"}'
# Expected: 200 OK

# Step 3: Rotate to Key B (manual steps above)

# Step 4: Issue token with Key B
TOKEN_B=$(curl -X POST https://<project-id>.supabase.co/functions/v1/score-broker \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@example.com","national_id":"12345678"}' \
  | jq -r '.token')

# Step 5: Validate token with Key B (should still accept Key A during overlap)
curl -X POST https://<project-id>.supabase.co/functions/v1/score-checker \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@example.com","national_id":"12345678"}'
# Expected: 200 OK

# Step 6: Wait for overlap window to expire, re-test Token A
sleep 90
curl -X POST https://<project-id>.supabase.co/functions/v1/score-checker \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@example.com","national_id":"12345678"}'
# Expected: 401 Unauthorized (token expired)
```

### Automated Test (Phase 2)

```typescript
describe('Key Rotation', () => {
  it('should validate tokens during overlap window', async () => {
    // Issue token with Key A
    const tokenA = await issueToken();
    
    // Rotate to Key B
    await rotateKey();
    
    // Validate token A (should still work during overlap)
    const result = await validateToken(tokenA);
    expect(result).toBe(true);
  });

  it('should reject tokens after overlap window', async () => {
    // Issue token with Key A
    const tokenA = await issueToken();
    
    // Rotate to Key B
    await rotateKey();
    
    // Wait for overlap + TTL to expire
    await sleep(120 * 1000); // 120 seconds
    
    // Validate token A (should fail)
    const result = await validateToken(tokenA);
    expect(result).toBe(false);
  });
});
```

---

## References

- docs/SECURITY_DECISION.md: Security architecture rationale
- docs/AUTH_FLOW_CONTRACT.md: Token format specifications
- docs/ARCHITECTURE.md: Secrets management locations
- Issue #33: Phase 0 implementation
- Issue TBD: Phase 1 HMAC implementation
- Issue TBD: Phase 2 key rotation automation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-08 | Initial placeholder documentation (Phase 0) |

---

## Contact

For questions about key management strategy:
- **Repository Maintainer**: lisandrosuarez9-lab
- **Issue Tracker**: GitHub Issues on DataboxMVL repository
