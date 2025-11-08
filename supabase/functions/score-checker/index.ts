// score-checker Supabase Edge Function
// Handles credit score checking with CORS support for GitHub Pages

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Factora-Correlation-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function makeResponse(status: number, payload: any) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

serve(async (req: Request) => {
  try {
    // OPTIONS preflight handling
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // enforce POST
    if (req.method !== 'POST') {
      return makeResponse(405, { error: 'method_not_allowed' });
    }

    // correlation id handling
    const correlationId = req.headers.get('x-factora-correlation-id') || crypto.randomUUID?.() || Date.now().toString();
    
    // basic JSON parse with guard
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return makeResponse(400, { error: 'invalid_json', correlation_id: correlationId });
    }

    // minimal required fields check
    if (!payload.full_name || !payload.email || !payload.national_id) {
      return makeResponse(400, { error: 'missing_fields', correlation_id: correlationId });
    }

    // --- Business logic placeholder ---
    // Replace the following with the existing scoring/enrichment
    // For deterministic success during testing return a fake but valid structure:
    const now = new Date().toISOString();
    const borrower = {
      borrower_id: `demo-${Math.floor(Math.random()*1000000)}`,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone || null,
      national_id: payload.national_id,
      created_at: now
    };
    const score = {
      score_id: `score-${Math.floor(Math.random()*1000000)}`,
      factora_score: 650,
      score_band: 'fair'
    };
    const enrichment = { source: 'demo', notes: 'synthetic demo enrichment' };

    const responseBody = { borrower, enrichment, score, correlation_id: correlationId };

    // optional: insert admin_ops log if admin client exists (no secret in public function)
    // try { await admin.from('admin_ops').insert({ correlation_id: correlationId, function_name:'score-checker', status:'ok', notes: { borrower_id: borrower.borrower_id } }) } catch(e) {}

    return new Response(JSON.stringify(responseBody), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    // catch-all error response
    const correlation = Date.now().toString();
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err), correlation_id: correlation }), { status: 500, headers: CORS_HEADERS });
  }
});
