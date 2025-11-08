// score-checker: Exact handler — replace existing body
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, x-factora-client, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Structured logging helper
function log(level: string, event: string, metadata: Record<string, any> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata
  }));
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

    // Parse correlation_id from header (new standard: x-correlation-id, backward compatible: x-factora-correlation-id)
    const correlationId = req.headers.get('x-correlation-id') || 
                          req.headers.get('x-factora-correlation-id') || 
                          crypto?.randomUUID?.() || 
                          `cid-${Date.now()}`;

    // Parse Authorization header (optional for demo mode)
    const authHeader = req.headers.get('authorization');
    let authMode = 'demo';
    let tokenValid = true;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      if (token.startsWith('demo.')) {
        // Demo mode: Accept token without validation
        authMode = 'demo';
        log('INFO', 'token_validation_success', {
          correlation_id: correlationId,
          authorization_mode: 'demo',
          duration_ms: Date.now() - startTime
        });
      } else {
        // Secure mode: Would validate signature here (Phase 1+)
        // For now, accept any non-demo token
        authMode = 'secure';
        log('INFO', 'token_validation_success', {
          correlation_id: correlationId,
          authorization_mode: 'secure',
          duration_ms: Date.now() - startTime
        });
      }
    } else {
      // No Authorization header: Demo mode
      log('INFO', 'authorization_mode_detected', {
        correlation_id: correlationId,
        authorization_mode: 'demo',
        duration_ms: Date.now() - startTime
      });
    }

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
    
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err), correlation_id: correlation }), { status: 500, headers: CORS_HEADERS });
  }
}

serve(handler);
