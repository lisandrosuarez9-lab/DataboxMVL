// score-checker: JWT token verification and score calculation
// Phase 1: Verifies EdDSA (Ed25519) signed JWT tokens with replay protection
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, x-factora-client, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// In-memory nonce tracking for replay protection
// Maps nonce -> expiration timestamp
const usedNonces = new Map<string, number>();

// Cleanup interval for expired nonces (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of usedNonces.entries()) {
    if (expiry < now) {
      usedNonces.delete(nonce);
    }
  }
}, 60000);

/**
 * JWK Structure for EdDSA (Ed25519) public key verification:
 * The public key can be derived from the private key JWK or stored separately.
 * Example public JWK structure in Supabase secret SCORE_CHECKER_ED25519_PUBLIC_JWK:
 * {
 *   "kty": "OKP",
 *   "crv": "Ed25519",
 *   "x": "<base64url-encoded-public-key>",
 *   "kid": "score-broker-ed25519-v1"
 * }
 * 
 * For demo/testing, can use the same private key JWK (contains both public and private parts)
 */

// Structured logging helper
function log(level: string, event: string, metadata: Record<string, any> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata
  }));
}

// Load EdDSA public key from Supabase secret
async function loadPublicKey(): Promise<jose.KeyLike> {
  try {
    // Prefer base64-encoded public JWK (Windows PowerShell safe)
    let jwkJson = Deno.env.get('SCORE_CHECKER_ED25519_PUBLIC_JWK_B64');
    
    if (jwkJson) {
      // Decode from base64
      try {
        jwkJson = atob(jwkJson);
      } catch (e) {
        log('ERROR', 'key_load_failed', {
          error_message: 'Failed to decode base64 public JWK',
          error_type: 'key_configuration'
        });
        throw new Error('Failed to decode base64 verification key');
      }
    } else {
      // Fallback to raw JSON string (public key)
      jwkJson = Deno.env.get('SCORE_CHECKER_ED25519_PUBLIC_JWK');
      
      // Further fallback to broker private key (contains public key data) for compatibility
      if (!jwkJson) {
        jwkJson = Deno.env.get('SCORE_BROKER_ED25519_JWK_B64');
        if (jwkJson) {
          // Decode from base64
          try {
            jwkJson = atob(jwkJson);
          } catch (e) {
            log('ERROR', 'key_load_failed', {
              error_message: 'Failed to decode base64 broker JWK',
              error_type: 'key_configuration'
            });
            throw new Error('Failed to decode base64 verification key');
          }
        } else {
          // Last fallback to raw broker private key
          jwkJson = Deno.env.get('SCORE_BROKER_ED25519_JWK');
        }
      }
    }
    
    if (!jwkJson) {
      throw new Error('No EdDSA public key configuration found');
    }
    
    const jwk = JSON.parse(jwkJson);
    
    // Import the JWK as a public key (works with both public-only and private JWKs)
    const publicKey = await jose.importJWK(jwk, 'EdDSA');
    return publicKey;
  } catch (error) {
    log('ERROR', 'key_load_failed', {
      error_message: String(error),
      error_type: 'key_configuration'
    });
    throw new Error('Failed to load verification key');
  }
}

// Check if nonce has been used (replay protection)
function checkNonceReplay(nonce: string, exp: number): boolean {
  if (usedNonces.has(nonce)) {
    return true; // Nonce already used (replay attack)
  }
  
  // Store nonce with expiration time (in milliseconds)
  usedNonces.set(nonce, exp * 1000);
  return false;
}

function makeResponse(status: number, payload: any) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

async function handler(req: Request) {
  const startTime = Date.now();
  
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') {
      return makeResponse(405, { error: 'method_not_allowed' });
    }

    // Parse correlation_id from header
    const headerCorrelationId = req.headers.get('x-correlation-id') || 
                                req.headers.get('x-factora-correlation-id');

    // Parse Authorization header
    const authHeader = req.headers.get('authorization');
    let authMode = 'demo';
    let tokenCorrelationId: string | undefined;
    let tokenClaims: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      if (token.startsWith('demo.')) {
        // Demo mode: Accept token without validation (backward compatibility)
        authMode = 'demo';
        log('INFO', 'token_validation_success', {
          correlation_id: headerCorrelationId || 'unknown',
          authorization_mode: 'demo',
          duration_ms: Date.now() - startTime
        });
      } else {
        // Secure mode: Validate EdDSA JWT
        try {
          const publicKey = await loadPublicKey();
          
          // Verify JWT signature and extract claims
          const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
            issuer: 'score-broker',
            audience: 'score-checker',
            algorithms: ['EdDSA']
          });
          
          // Validate required claims
          if (!payload.nonce || !payload.correlation_id || !payload.jti) {
            log('WARN', 'token_validation_failed', {
              correlation_id: headerCorrelationId || 'unknown',
              error_code: 'missing_claims',
              duration_ms: Date.now() - startTime
            });
            return makeResponse(401, { 
              error: 'invalid_token',
              message: 'Missing required claims',
              correlation_id: headerCorrelationId || 'unknown'
            });
          }
          
          // Check nonce replay
          if (checkNonceReplay(payload.nonce as string, payload.exp as number)) {
            log('WARN', 'token_replay_detected', {
              correlation_id: payload.correlation_id,
              jti: payload.jti,
              nonce: (payload.nonce as string).substring(0, 8) + '...',
              duration_ms: Date.now() - startTime
            });
            return makeResponse(401, { 
              error: 'token_replay',
              message: 'Token has already been used',
              correlation_id: payload.correlation_id as string
            });
          }
          
          // Validate TTL (exp is already checked by jose.jwtVerify, but log it)
          const now = Math.floor(Date.now() / 1000);
          const ttlRemaining = (payload.exp as number) - now;
          
          authMode = 'secure';
          tokenCorrelationId = payload.correlation_id as string;
          tokenClaims = payload;
          
          log('INFO', 'token_validation_success', {
            correlation_id: tokenCorrelationId,
            jti: payload.jti,
            scope: payload.scope,
            ttl_remaining_seconds: ttlRemaining,
            authorization_mode: 'secure',
            duration_ms: Date.now() - startTime
          });
        } catch (error) {
          // JWT verification failed
          const errorMessage = error instanceof Error ? error.message : String(error);
          log('WARN', 'token_validation_failed', {
            correlation_id: headerCorrelationId || 'unknown',
            error_code: 'invalid_signature',
            error_message: errorMessage,
            duration_ms: Date.now() - startTime
          });
          return makeResponse(401, { 
            error: 'invalid_token',
            message: 'Token verification failed',
            correlation_id: headerCorrelationId || 'unknown'
          });
        }
      }
    } else {
      // No Authorization header: Demo mode (backward compatibility)
      log('INFO', 'authorization_mode_detected', {
        correlation_id: headerCorrelationId || 'unknown',
        authorization_mode: 'demo',
        duration_ms: Date.now() - startTime
      });
    }

    // Use correlation_id from token if in secure mode, otherwise from header
    const correlationId = tokenCorrelationId || headerCorrelationId || crypto.randomUUID();

    let payload;
    try { payload = await req.json(); } catch (e) {
      return makeResponse(400, { error: 'invalid_json', correlation_id: correlationId });
    }

    if (!payload?.full_name || !payload?.email || !payload?.national_id) {
      return makeResponse(400, { error: 'missing_fields', correlation_id: correlationId });
    }

    const now = new Date().toISOString();
    const borrower = {
      borrower_id: `demo-${Math.floor(Math.random()*1e6)}`,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone || null,
      national_id: payload.national_id,
      created_at: now
    };
    const score = {
      score_id: `score-${Math.floor(Math.random()*1e6)}`,
      factora_score: 650,
      score_band: 'fair'
    };
    const enrichment = { source: 'demo', notes: 'synthetic demo enrichment' };
    const responseBody = { borrower, enrichment, score, correlation_id: correlationId };

    // Log redemption event
    log('INFO', 'score_calculated', {
      correlation_id: correlationId,
      score_band: score.score_band,
      enrichment_source: enrichment.source,
      authorization_mode: authMode,
      jti: tokenClaims?.jti,
      scope: tokenClaims?.scope,
      processing_time_ms: Date.now() - startTime,
      duration_ms: Date.now() - startTime
    });

    // Optional non-blocking admin log (no secrets)
    try { /* if DB client present and allowed: insert admin_ops row */ } catch (e) { /* ignore */ }

    return new Response(JSON.stringify(responseBody), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    const correlation = req.headers?.get?.('x-correlation-id') || 
                       req.headers?.get?.('x-factora-correlation-id') ||
                       `cid-${Date.now()}`;
    
    log('ERROR', 'internal_error', {
      correlation_id: correlation,
      error_message: String(err),
      function_name: 'score-checker',
      duration_ms: Date.now() - startTime
    });
    
    return new Response(JSON.stringify({ error: 'internal_error', correlation_id: correlation }), { status: 500, headers: CORS_HEADERS });
  }
}

serve(handler);
