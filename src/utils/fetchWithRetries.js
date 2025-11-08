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
