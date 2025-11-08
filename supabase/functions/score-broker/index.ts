// score-broker: Token broker for secure credit scoring flow
// Phase 0: Issues demo tokens (unsigned) for score-checker access
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, x-factora-client, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const TOKEN_TTL_SECONDS = 45;

// Structured logging helper
function log(level: string, event: string, metadata: Record<string, any> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata
  }));
}

// Hash national_id for privacy-preserving logs
async function hashNationalId(nationalId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(nationalId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
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

    // Generate token components
    const nonce = crypto.randomUUID();
    const now = Date.now();
    const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS; // Unix timestamp
    const issuedAt = new Date(now).toISOString();

    // Create demo token payload
    const tokenPayload = {
      nonce,
      correlation_id: correlationId,
      exp
    };

    // Encode as base64url (Phase 0: unsigned)
    const payloadJson = JSON.stringify(tokenPayload);
    const payloadBase64 = btoa(payloadJson)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Demo token format: "demo.<base64-payload>"
    const token = `demo.${payloadBase64}`;

    // Log token issuance (privacy-preserving)
    const nationalIdHash = await hashNationalId(payload.national_id);
    const emailDomain = getEmailDomain(payload.email);

    log('INFO', 'token_issued', {
      correlation_id: correlationId,
      national_id_hash: nationalIdHash,
      email_domain: emailDomain,
      ttl_seconds: TOKEN_TTL_SECONDS,
      token_format: 'demo',
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
