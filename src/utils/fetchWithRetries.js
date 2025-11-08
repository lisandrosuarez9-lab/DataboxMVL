// Resilient fetch wrapper for Factora UI
export default async function fetchWithRetries(url, opts = {}, maxAttempts = 3) {
  let attempt = 0;
  let lastErr = null;
  const correlationId = (opts.headers && (opts.headers['X-Factora-Correlation-Id'] || opts.headers['x-factora-correlation-id'])) || `cid-${Date.now()}`;
  opts.headers = { ...(opts.headers || {}), Accept: 'application/json', 'Content-Type': 'application/json', 'X-Factora-Correlation-Id': correlationId, 'X-Factora-Client': 'factora-ui' };
  while (++attempt <= maxAttempts) {
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
      return { ok: res.ok, status: res.status, json, text, headers: res.headers, correlationId };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 300 * Math.pow(3, attempt - 1)));
    }
  }
  return { ok: false, error: lastErr, correlationId };
}

// Also export as named export for compatibility
export { fetchWithRetries };

// Create a demo profile response for fallback mode
export function createDemoProfile(fullName) {
  const now = new Date().toISOString();
  return {
    borrower: {
      borrower_id: 'demo-0001',
      full_name: fullName || 'Demo User',
      email: 'demo@example.com',
      phone: null,
      national_id: '000000000',
      created_at: now,
    },
    score: {
      score_id: 'demo-score-0001',
      factora_score: 650,
      score_band: 'fair',
    },
    enrichment: {
      source: 'demo',
      notes: 'synthetic demo enrichment - service unavailable',
    },
    correlation_id: `demo-${Date.now()}`,
    _isDemo: true,
  };
}
