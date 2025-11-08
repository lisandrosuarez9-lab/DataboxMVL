# Security Decision: Token Exchange Model

## Overview

This document outlines the security architecture decisions for DataboxMVL's credit scoring API, specifically the token exchange model and broker pattern chosen for Phase 0-2 implementation.

## Problem Statement

The credit scoring system requires secure authentication between the frontend application and backend services (score-checker) while:
- Protecting sensitive PII (national_id, email) in transit
- Preventing replay attacks
- Supporting correlation tracking for observability
- Minimizing exposure of long-lived credentials
- Enabling gradual migration from demo to secure mode

## Token Exchange Model Rationale

### Chosen Pattern: Token Broker with Short-Lived Bearer Tokens

We implement a **token broker pattern** where:

1. **Frontend** → **score-broker** (Edge Function): Request short-lived token
2. **score-broker** generates and signs token (demo mode: unsigned; secure mode: HMAC/JWT)
3. **Frontend** → **score-checker** (Edge Function): Present token with PII
4. **score-checker** validates token and processes request

### Key Characteristics

- **Short-lived tokens**: 45-second TTL minimizes replay attack window
- **One-time use**: Each token includes a nonce and correlation_id for single-use semantics
- **Stateless verification**: Token contains cryptographic proof (in secure mode)
- **Progressive enhancement**: Starts with demo tokens, upgrades to cryptographic tokens

## Alternatives Considered

### Alternative 1: Direct API Keys
**Rejected**: Exposes long-lived credentials in frontend code, high risk if compromised.

### Alternative 2: OAuth 2.0 / OpenID Connect
**Rejected**: Overengineered for single-purpose credit scoring API; adds complexity without proportional security benefit for this use case.

### Alternative 3: Mutual TLS (mTLS)
**Rejected**: Difficult to implement in browser environment; certificate management overhead excessive for GitHub Pages deployment.

### Alternative 4: No Authentication (Public API)
**Rejected**: Exposes PII processing endpoint to public internet without access control; unacceptable data protection risk.

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Untrusted)                                       │
│  - GitHub Pages: https://lisandrosuarez9-lab.github.io     │
│  - VITE_SCORE_MODE env var controls flow                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS + CORS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: score-broker (Trusted)                      │
│  - Input validation                                         │
│  - Token generation (demo: unsigned, secure: HMAC-SHA256)  │
│  - Correlation ID tracking                                  │
│  - PII hashing for logs                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Token (short-lived bearer)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: score-checker (Trusted)                     │
│  - Token validation                                         │
│  - PII processing                                           │
│  - Credit score calculation                                 │
│  - Response with correlation_id                             │
└─────────────────────────────────────────────────────────────┘
```

## Token Broker Pattern Details

### Phase 0: Demo Mode (Current Implementation)
- Tokens are **not cryptographically signed**
- Format: `demo.<base64(JSON)>` where JSON contains `{ nonce, correlation_id, exp }`
- Purpose: Establish API contract and data flow patterns
- Security: Relies solely on CORS and HTTPS

### Phase 1-2: Secure Mode (Future)
- Tokens are **HMAC-SHA256 signed** or **JWT with RS256**
- Secret key stored in Supabase Edge Function environment (not in frontend)
- Token payload includes: `{ nonce, correlation_id, exp, iat, aud: "score-checker" }`
- score-checker validates signature before processing

## Key Properties

### Confidentiality
- Secrets never exposed to frontend (stored in Edge Function environment)
- PII transmitted over HTTPS only
- National ID hashed in logs (SHA-256)

### Integrity
- Token signature prevents tampering (secure mode)
- Nonce prevents token reuse
- Expiration timestamp prevents replay attacks

### Availability
- Token broker is stateless (horizontally scalable)
- No database dependency for token issuance
- CORS-compliant for browser access

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Token replay attack | Short TTL (45s), nonce tracking, expiration validation |
| Token tampering | HMAC signature (secure mode), validation in score-checker |
| Credential exposure | Secrets in Edge Function env, never in frontend code |
| CORS bypass | Strict origin allowlist (lisandrosuarez9-lab.github.io only) |
| PII logging | Hash national_id before logging, structured JSON logs |
| DDoS on token broker | Rate limiting (future), stateless design for scaling |

## Secrets Management Strategy

### Phase 0 (Demo)
- No secrets required
- Tokens are unsigned

### Phase 1-2 (Secure)
- `TOKEN_SIGNING_KEY`: HMAC secret or RSA private key
- Stored in: Supabase Edge Function secrets (`supabase secrets set`)
- Rotation: Manual initially, automated overlap window in KEY_MANAGEMENT.md plan
- Access: score-broker (sign), score-checker (verify)

## Compliance Considerations

- **GDPR Article 32**: Technical measures for data security (encryption, pseudonymization)
- **PCI-DSS**: Not applicable (no payment card data)
- **SOC 2**: Logging and monitoring for security incidents (correlation_id tracking)

## References

- Issue #33: [Phase 0] Secure E2E scaffolding
- docs/AUTH_FLOW_CONTRACT.md: API endpoint specifications
- docs/KEY_MANAGEMENT.md: Key rotation and management plan
- docs/ARCHITECTURE.md: System architecture diagram

## Approval and Review

- **Decision Date**: 2025-11-08
- **Review Cycle**: Quarterly or upon security incident
- **Approver**: Repository maintainer (lisandrosuarez9-lab)
