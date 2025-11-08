# Feature Flag: SCORE_MODE

## Overview

The `SCORE_MODE` feature flag controls the authentication flow for credit score requests in DataboxMVL. It enables gradual migration from demo mode (no authentication) to secure mode (token-based authentication) without requiring code changes.

## Environment Variable

### Name
`VITE_SCORE_MODE`

### Values
- `demo` (default): Use direct score-checker calls without authentication
- `secure`: Use token broker flow with bearer token authentication

### Scope
Frontend application (Vite build-time environment variable)

## Usage

### .env Configuration

Add to `.env.local` or `.env.production`:

```bash
# Score authentication mode
# - demo: Direct calls to score-checker (no token required)
# - secure: Token broker flow with bearer authentication
VITE_SCORE_MODE=demo
```

### Build-Time vs Runtime

**Build-Time** (default for Vite):
- Environment variable is embedded in the built JavaScript bundle
- Value is fixed at build time (`npm run build`)
- To change mode, rebuild the application

**Runtime** (future enhancement):
- Could be implemented via runtime config fetch
- Allows mode switching without rebuild
- Not implemented in Phase 0

### Code Integration

#### Checking the Flag

```typescript
// In any TypeScript/JavaScript file
const scoreMode = import.meta.env.VITE_SCORE_MODE || 'demo';

if (scoreMode === 'secure') {
  // Use token broker flow
} else {
  // Use direct score-checker flow
}
```

#### Type Safety

Add to `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCORE_MODE?: 'demo' | 'secure';
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // ... other env vars
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Behavior by Mode

### Demo Mode (`VITE_SCORE_MODE=demo`)

**Flow**:
1. Frontend collects PII from user form
2. Frontend calls `POST /functions/v1/score-checker` directly
3. score-checker processes request without token validation
4. score-checker returns credit score result

**Security**:
- HTTPS transport encryption
- CORS origin validation
- No bearer token required
- Suitable for: Development, testing, MVP demos

**Example Request**:
```typescript
const response = await fetch(`${apiUrl}/score-checker`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-correlation-id': generateUUID(),
  },
  body: JSON.stringify({
    full_name: 'John Doe',
    email: 'john@example.com',
    national_id: '12345678',
  }),
});
```

### Secure Mode (`VITE_SCORE_MODE=secure`)

**Flow**:
1. Frontend collects PII from user form
2. Frontend calls `POST /functions/v1/score-broker` to get short-lived token
3. score-broker returns token with 45-second TTL
4. Frontend calls `POST /functions/v1/score-checker` with `Authorization: Bearer <token>`
5. score-checker validates token and processes request
6. score-checker returns credit score result

**Security**:
- HTTPS transport encryption
- CORS origin validation
- Bearer token with HMAC signature (Phase 1+) or JWT (Phase 2+)
- Short-lived tokens (45 seconds)
- Nonce for single-use semantics
- Suitable for: Production deployments

**Example Request Flow**:
```typescript
// Step 1: Get token from broker
const tokenResponse = await fetch(`${apiUrl}/score-broker`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-correlation-id': generateUUID(),
  },
  body: JSON.stringify({
    full_name: 'John Doe',
    email: 'john@example.com',
    national_id: '12345678',
  }),
});

const { token, correlation_id } = await tokenResponse.json();

// Step 2: Use token to get score
const scoreResponse = await fetch(`${apiUrl}/score-checker`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-correlation-id': correlation_id,
  },
  body: JSON.stringify({
    full_name: 'John Doe',
    email: 'john@example.com',
    national_id: '12345678',
    phone: '+1234567890',
    consent: true,
  }),
});

const scoreData = await scoreResponse.json();
```

## Default Behavior

### When VITE_SCORE_MODE is Not Set

If `VITE_SCORE_MODE` is undefined or empty:

```typescript
const scoreMode = import.meta.env.VITE_SCORE_MODE || 'demo';
// Falls back to 'demo'
```

**Rationale**: Demo mode is safer default during development and prevents production breakage if env var is missing.

### Production Recommendation

For production deployments:
1. Set `VITE_SCORE_MODE=secure` in `.env.production`
2. Ensure Supabase Edge Functions secrets are configured
3. Test token flow in staging environment first

## Migration Path

### Phase 0: Demo Mode Only
- `VITE_SCORE_MODE=demo` (default)
- Code supports both modes, but secure mode uses unsigned tokens
- Establishes API contract and data flow

### Phase 1: HMAC Secure Mode
- `VITE_SCORE_MODE=secure` available
- score-broker signs tokens with HMAC-SHA256
- score-checker validates token signatures
- Production can switch to secure mode

### Phase 2: JWT Secure Mode (Optional)
- Replace HMAC with JWT (RS256)
- Public/private key pair for signing
- Key rotation support via KEY_MANAGEMENT.md

## Environment Variable Checklist

When deploying, ensure these variables are set:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SCORE_MODE` | No | `demo` | Authentication mode |
| `VITE_SUPABASE_URL` | Yes | - | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |

For secure mode, additionally configure in Supabase Edge Functions:
- `TOKEN_SIGNING_KEY` (Phase 1+): HMAC secret or RSA private key

## Validation

### Build-Time Validation

Add to build script:

```typescript
// scripts/validate-env.ts
const validModes = ['demo', 'secure'];
const scoreMode = process.env.VITE_SCORE_MODE || 'demo';

if (!validModes.includes(scoreMode)) {
  console.error(`Invalid VITE_SCORE_MODE: ${scoreMode}`);
  console.error(`Valid values: ${validModes.join(', ')}`);
  process.exit(1);
}

console.log(`✓ VITE_SCORE_MODE=${scoreMode}`);
```

### Runtime Detection

Frontend can log the active mode:

```typescript
console.log(`[Auth] Running in ${scoreMode} mode`);
```

## Testing Strategy

### Manual Testing

1. **Demo Mode**:
   - Set `VITE_SCORE_MODE=demo`
   - Build: `npm run build`
   - Verify score-checker called directly
   - No Authorization header sent

2. **Secure Mode**:
   - Set `VITE_SCORE_MODE=secure`
   - Build: `npm run build`
   - Verify score-broker called first
   - Authorization header sent to score-checker

### Automated Testing

```typescript
describe('Feature Flag: SCORE_MODE', () => {
  it('defaults to demo mode when not set', () => {
    // Mock import.meta.env.VITE_SCORE_MODE as undefined
    const mode = import.meta.env.VITE_SCORE_MODE || 'demo';
    expect(mode).toBe('demo');
  });

  it('uses secure mode when explicitly set', () => {
    // Mock import.meta.env.VITE_SCORE_MODE as 'secure'
    const mode = 'secure'; // Set in test env
    expect(mode).toBe('secure');
  });
});
```

## Troubleshooting

### Issue: Mode not changing after .env update

**Solution**: Rebuild the application
```bash
npm run build
```

Vite embeds env vars at build time. Changing `.env` requires rebuild.

### Issue: Authorization header not sent in secure mode

**Checklist**:
1. Verify `VITE_SCORE_MODE=secure` in `.env.production`
2. Confirm application was rebuilt after env change
3. Check browser DevTools Network tab for Authorization header
4. Ensure score-broker returned valid token

### Issue: Token expired error

**Solution**: Token TTL is 45 seconds. Ensure:
1. Minimal delay between score-broker and score-checker calls
2. No long-running operations between token acquisition and use
3. Consider increasing TTL if necessary (adjust in score-broker)

## Security Considerations

### Do NOT

❌ Commit `.env.local` or `.env.production` to version control
❌ Hard-code `VITE_SCORE_MODE=secure` in code (use env var)
❌ Use secure mode without properly configured signing keys
❌ Share tokens between users or sessions

### DO

✅ Use `.env.example` to document expected variables
✅ Set `VITE_SCORE_MODE=secure` in production deployments
✅ Validate signing keys are present before enabling secure mode
✅ Monitor token issuance and validation logs

## References

- docs/SECURITY_DECISION.md: Token broker architecture
- docs/AUTH_FLOW_CONTRACT.md: API endpoint specifications
- docs/ARCHITECTURE.md: System diagram
- .env.example: Environment variable template
- Issue #33: Phase 0 implementation

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-08 | Initial feature flag documentation |
