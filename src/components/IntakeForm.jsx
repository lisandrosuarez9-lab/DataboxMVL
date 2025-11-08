import React, { useState } from 'react';
import fetchWithRetries from '../utils/fetchWithRetries';

export default function IntakeForm({ onClose, onProfile }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const form = new FormData(e.target);
    const payload = {
      full_name: `${form.get('first_name') || ''} ${form.get('last_name') || ''}`.trim(),
      national_id: form.get('national_id'),
      email: form.get('email'),
      phone: form.get('phone'),
      consent: true,
      consent_text: 'I agree',
      intake_source: 'github_pages_demo',
      intake_form_version: 'v1',
      intent_financing: false,
      prior_borrowing: false
    };

    const url = import.meta.env.VITE_PROFILE_FN_URL || (window.__env && window.__env.VITE_PROFILE_FN_URL);
    if (!url) {
      setErr('Configuration missing: profile function URL not set.');
      setLoading(false);
      return;
    }

    const resp = await fetchWithRetries(url, { method: 'POST', body: JSON.stringify(payload) }, 3);
    if (!resp.ok) {
      // Network or server error
      if (resp.status === 401 || resp.status === 403) {
        setErr(`Service unavailable — authentication required (cid ${resp.correlationId})`);
        setLoading(false);
        return;
      }
      setErr(`Network error — unable to reach server (cid ${resp.correlationId})`);
      setLoading(false);
      // demo fallback visible to user (handled by caller)
      return;
    }

    const body = resp.json || (resp.text ? JSON.parse(resp.text) : {});
    const borrower = body?.borrower || body?.data?.borrower || body?.payload?.borrower;
    const score = body?.score || body?.data?.score || body?.payload?.score;
    if (!borrower || !score) {
      setErr(`Unexpected response shape (cid ${resp.correlationId})`);
      setLoading(false);
      return;
    }

    onProfile({ borrower, score, enrichment: body.enrichment || {}, correlation_id: body.correlation_id || resp.correlationId });
    setLoading(false);
  }

  return (
    <form id="intake-form-dialog" role="dialog" aria-modal="true" onSubmit={onSubmit}>
      <label>First name<input name="first_name" aria-label="First name" required /></label>
      <label>Last name<input name="last_name" aria-label="Last name" required /></label>
      <label>National ID<input name="national_id" aria-label="National ID" required /></label>
      <label>Email<input name="email" aria-label="Email" required /></label>
      <label>Phone<input name="phone" aria-label="Phone" /></label>
      <div aria-live="polite">{loading ? 'Checking your profile — one moment' : ''}</div>
      {err && <div className="error">{err}</div>}
      <button type="submit" disabled={loading}>Submit</button>
      <button type="button" onClick={() => {
        // demo fallback: deterministic demo profile (clearly labeled by UI as demo)
        onProfile({
          borrower: { borrower_id: 'demo-0001', full_name: 'Demo User', email: 'demo@example.com', created_at: new Date().toISOString() },
          score: { score_id: 'demo-score-0001', factora_score: 650, score_band: 'fair' },
          enrichment: { source: 'demo' },
          correlation_id: `demo-${Date.now()}`
        });
      }}>View demo score</button>
    </form>
  );
}
