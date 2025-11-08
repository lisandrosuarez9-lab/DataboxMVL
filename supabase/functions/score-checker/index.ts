// score-checker: Exact handler — replace existing body
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Factora-Correlation-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function makeResponse(status: number, payload: any) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

async function handler(req: Request) {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') {
      return makeResponse(405, { error: 'method_not_allowed' });
    }

    const correlationId = (req.headers.get('x-factora-correlation-id') || crypto?.randomUUID?.() || `cid-${Date.now()}`);
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

    // Optional non-blocking admin log (no secrets)
    try { /* if DB client present and allowed: insert admin_ops row */ } catch (e) { /* ignore */ }

    return new Response(JSON.stringify(responseBody), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    const correlation = `cid-${Date.now()}`;
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err), correlation_id: correlation }), { status: 500, headers: CORS_HEADERS });
  }
}

serve(handler);
