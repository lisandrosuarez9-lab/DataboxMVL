// score-checker - PR patch (safe, deterministic intake stub)
// Place under artifacts/function-patch/score-checker/index.js for PR
const ALLOWED_ORIGIN = 'https://lisandrosuarez9-lab.github.io';
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Factora-Correlation-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function makeResponse(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

export default async function handler(req) {
  try {
    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only allow POST to the intake stub
    if (req.method !== 'POST') {
      return makeResponse(405, { error: 'method_not_allowed' });
    }

    // Correlation id: echo if provided, otherwise generate
    const correlationId = (req.headers && (req.headers.get && req.headers.get('x-factora-correlation-id'))) || `cid-${Date.now()}`;

    // Parse body safely
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return makeResponse(400, { error: 'invalid_json', correlation_id: correlationId });
    }

    // Minimal validation
    if (!payload?.full_name || !payload?.email || !payload?.national_id) {
      return makeResponse(400, { error: 'missing_fields', correlation_id: correlationId });
    }

    // Deterministic demo response (safe; no secrets)
    const now = new Date().toISOString();
    const borrower = {
      borrower_id: `demo-${Math.floor(Math.random() * 1e6)}`,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone || null,
      national_id: payload.national_id,
      created_at: now
    };
    const score = {
      score_id: `score-${Math.floor(Math.random() * 1e6)}`,
      factora_score: 650,
      score_band: 'fair'
    };
    const enrichment = { source: 'demo', notes: 'synthetic demo enrichment' };

    const responseBody = { borrower, enrichment, score, correlation_id: correlationId };

    // Return 200 with CORS headers and deterministic schema
    return new Response(JSON.stringify(responseBody), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    const correlation = `cid-${Date.now()}`;
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err), correlation_id: correlation }), { status: 500, headers: CORS_HEADERS });
  }
}
