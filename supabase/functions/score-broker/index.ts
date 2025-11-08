// score-broker: Token broker for secure credit scoring flow
// Phase 1: Issues EdDSA (Ed25519) signed JWT tokens for score-checker access
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

const TOKEN_TTL_SECONDS = 45;

// Rate limit configuration (soft limits - log only)
const RATE_LIMIT_PII_PER_MINUTE = 1;
const RATE_LIMIT_REQUESTER_PER_HOUR = 10;

// In-memory rate limit tracking
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

/**
 * JWK Structure for EdDSA (Ed25519) private key:
 * Example JWK structure stored in Supabase secret SCORE_BROKER_ED25519_JWK:
 * {
 *   "kty": "OKP",
 *   "crv": "Ed25519",
 *   "x": "<base64url-encoded-public-key>",
 *   "d": "<base64url-encoded-private-key>",
 *   "kid": "score-broker-ed25519-v1"
 * }
 * 
 * To generate a new Ed25519 key pair:
 * const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { crv: 'Ed25519' });
 * const jwk = await jose.exportJWK(privateKey);
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

// Hash national_id for privacy-preserving logs (SHA-256)
async function hashNationalId(nationalId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(nationalId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex; // Return just the hex string, without prefix for consistency
}

// Truncate hash to first 16 hex characters for logging
function truncateHash(hash: string): string {
  return hash.substring(0, 16);
}

// Check and update rate limits (soft - log only, does not block)
function checkRateLimit(key: string, limit: number, windowSeconds: number): { limited: boolean; count: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || (now - entry.windowStart) > windowSeconds * 1000) {
    // New window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { limited: false, count: 1 };
  }
  
  // Same window
  entry.count++;
  const limited = entry.count > limit;
  return { limited, count: entry.count };
}

// Extract email domain for logging (privacy-preserving)
function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : 'unknown';
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate 128-bit nonce as base64url string (16 bytes = 128 bits)
function generateNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  // Convert to base64url
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Load EdDSA private key from Supabase secret
async function loadPrivateKey(): Promise<jose.KeyLike> {
  try {
    const jwkJson = Deno.env.get('SCORE_BROKER_ED25519_JWK');
    
    if (!jwkJson) {
      throw new Error('SCORE_BROKER_ED25519_JWK secret not configured');
    }
    
    const jwk = JSON.parse(jwkJson);
    
    // Import the JWK as a private key
    const privateKey = await jose.importJWK(jwk, 'EdDSA');
    return privateKey;
  } catch (error) {
    log('ERROR', 'key_load_failed', {
      error_message: String(error),
      error_type: 'key_configuration'
    });
    throw new Error('Failed to load signing key');
  }
}

function makeResponse(status: number, payload: any) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

async function handler(req: Request) {
  const startTime = Date.now();

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return makeResponse(405, { error: 'method_not_allowed' });
    }

    // Parse correlation_id from header or generate new one
    const correlationId = req.headers.get('x-correlation-id') || 
                          req.headers.get('x-factora-correlation-id') ||
                          crypto.randomUUID();

    // Parse request body
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      log('WARN', 'input_validation_error', {
        correlation_id: correlationId,
        error_code: 'invalid_json',
        duration_ms: Date.now() - startTime
      });
      return makeResponse(400, { 
        error: 'invalid_json', 
        correlation_id: correlationId 
      });
    }

    // Validate required fields
    const missingFields: string[] = [];
    if (!payload?.full_name) missingFields.push('full_name');
    if (!payload?.email) missingFields.push('email');
    if (!payload?.national_id) missingFields.push('national_id');

    if (missingFields.length > 0) {
      log('WARN', 'input_validation_error', {
        correlation_id: correlationId,
        error_code: 'missing_fields',
        missing_fields: missingFields,
        duration_ms: Date.now() - startTime
      });
      return makeResponse(400, { 
        error: 'missing_fields',
        missing_fields: missingFields,
        correlation_id: correlationId 
      });
    }

    // Validate email format
    if (!isValidEmail(payload.email)) {
      log('WARN', 'input_validation_error', {
        correlation_id: correlationId,
        error_code: 'invalid_email',
        duration_ms: Date.now() - startTime
      });
      return makeResponse(400, { 
        error: 'invalid_email',
        correlation_id: correlationId 
      });
    }

    // Validate minimum field lengths
    if (payload.full_name.length < 3) {
      log('WARN', 'input_validation_error', {
        correlation_id: correlationId,
        error_code: 'invalid_full_name',
        duration_ms: Date.now() - startTime
      });
      return makeResponse(400, { 
        error: 'invalid_full_name',
        message: 'full_name must be at least 3 characters',
        correlation_id: correlationId 
      });
    }

    if (payload.national_id.length < 5) {
      log('WARN', 'input_validation_error', {
        correlation_id: correlationId,
        error_code: 'invalid_national_id',
        duration_ms: Date.now() - startTime
      });
      return makeResponse(400, { 
        error: 'invalid_national_id',
        message: 'national_id must be at least 5 characters',
        correlation_id: correlationId 
      });
    }

    // Hash national_id for PII privacy (SHA-256)
    const piiHash = await hashNationalId(payload.national_id);
    const emailDomain = getEmailDomain(payload.email);
    
    // Generate requester_id (hash of email domain for privacy)
    const requesterIdHash = await hashNationalId(emailDomain);
    
    // Check rate limits (soft - log only, does not block)
    const piiRateLimit = checkRateLimit(`pii:${piiHash}`, RATE_LIMIT_PII_PER_MINUTE, 60);
    const requesterRateLimit = checkRateLimit(`requester:${requesterIdHash}`, RATE_LIMIT_REQUESTER_PER_HOUR, 3600);
    
    if (piiRateLimit.limited) {
      log('WARN', 'rate_limit_exceeded', {
        correlation_id: correlationId,
        limit_type: 'pii_per_minute',
        pii_hash_truncated: truncateHash(piiHash),
        count: piiRateLimit.count,
        limit: RATE_LIMIT_PII_PER_MINUTE,
        action: 'log_only'
      });
    }
    
    if (requesterRateLimit.limited) {
      log('WARN', 'rate_limit_exceeded', {
        correlation_id: correlationId,
        limit_type: 'requester_per_hour',
        requester_id: truncateHash(requesterIdHash),
        count: requesterRateLimit.count,
        limit: RATE_LIMIT_REQUESTER_PER_HOUR,
        action: 'log_only'
      });
    }

    // Generate token components
    const nonce = generateNonce(); // 128-bit nonce
    const jti = crypto.randomUUID(); // Unique token ID
    const now = Math.floor(Date.now() / 1000);
    const exp = now + TOKEN_TTL_SECONDS;
    const issuedAt = new Date(now * 1000).toISOString();

    // Load private key and sign JWT
    const privateKey = await loadPrivateKey();
    
    // Create JWT with EdDSA signature
    const token = await new jose.SignJWT({
      nonce,
      correlation_id: correlationId,
      requester_id: requesterIdHash,
      scope: 'score:single',
      pii_hash: piiHash,
      jti
    })
      .setProtectedHeader({ 
        alg: 'EdDSA',
        kid: 'score-broker-ed25519-v1',
        typ: 'JWT'
      })
      .setIssuer('score-broker')
      .setAudience('score-checker')
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(privateKey);

    // Log token issuance (privacy-preserving)
    log('INFO', 'token_issued', {
      correlation_id: correlationId,
      pii_hash_truncated: truncateHash(piiHash),
      email_domain: emailDomain,
      requester_id_truncated: truncateHash(requesterIdHash),
      jti,
      ttl_seconds: TOKEN_TTL_SECONDS,
      token_format: 'EdDSA-Ed25519',
      scope: 'score:single',
      user_agent: req.headers.get('user-agent') || 'unknown',
      duration_ms: Date.now() - startTime
    });

    // Return token response
    const response = {
      token,
      ttl_seconds: TOKEN_TTL_SECONDS,
      correlation_id: correlationId,
      issued_at: issuedAt
    };

    return makeResponse(200, response);

  } catch (err) {
    const correlation = req.headers?.get?.('x-correlation-id') || 
                       req.headers?.get?.('x-factora-correlation-id') ||
                       `cid-${Date.now()}`;
    
    log('ERROR', 'internal_error', {
      correlation_id: correlation,
      error_message: String(err),
      function_name: 'score-broker',
      duration_ms: Date.now() - startTime
    });

    return makeResponse(500, { 
      error: 'internal_error',
      correlation_id: correlation 
    });
  }
}

serve(handler);
