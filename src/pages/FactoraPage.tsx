/**
 * Factora Single-CTA Page
 * Main page for Factora credit score intake and results
 */

import React, { useState } from 'react';
import { Hero } from '../components/factora/Hero';
import { IntakeForm } from '../components/factora/IntakeForm';
import { ProfileCard } from '../components/factora/ProfileCard';
import { fetchWithRetries } from '../utils/fetchWithRetries';
import '../styles/factora.css';

type ViewState = 'hero' | 'form' | 'results';

interface ScoreResponse {
  borrower: {
    borrower_id: string;
    full_name: string;
    national_id: string;
    email: string;
    phone: string;
    created_at: string;
  };
  enrichment?: {
    ip_address?: string;
    user_agent?: string;
    timestamp?: string;
    source?: string;
    notes?: string;
  };
  score: {
    factora_score: number;
    score_band?: string;
    risk_level?: string;
  };
  correlation_id?: string;
  _isDemo?: boolean;
}

export const FactoraPage: React.FC = () => {
  const [view, setView] = useState<ViewState>('hero');
  const [results, setResults] = useState<ScoreResponse | null>(null);

  const handleGetStarted = () => {
    setView('form');
  };

  const handleFormSubmit = async (formData: any) => {
    // Check if this is a demo profile passed from IntakeForm
    if (formData._profileData) {
      console.log('[FactoraPage] Received demo profile from IntakeForm');
      setResults(formData._profileData);
      setView('results');
      return;
    }

    const scoreCheckerUrl = import.meta.env.VITE_PROFILE_FN_URL || 
      import.meta.env.VITE_SCORE_CHECKER_URL ||
      'https://rzashahhkafjicjpupww.supabase.co/functions/v1/score-checker';

    const payload = {
      full_name: formData.full_name,
      national_id: formData.national_id,
      email: formData.email,
      phone: formData.phone,
      consent: formData.consent,
      consent_text: 'I consent to the processing of my personal data for credit evaluation purposes',
      intake_source: 'github_pages_demo',
      intake_form_version: 'v1',
      intent_financing: formData.intent_financing,
      prior_borrowing: formData.prior_borrowing,
    };

    console.log('[FactoraPage] Submitting to score-checker:', scoreCheckerUrl);

    try {
      const result = await fetchWithRetries(scoreCheckerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify(payload),
        maxAttempts: 3,
      });

      console.log('[FactoraPage] Fetch result:', {
        ok: result.ok,
        status: result.status,
        correlationId: result.correlationId,
      });

      if (!result.ok) {
        // Map status codes to user-friendly messages
        if (result.status === 401 || result.status === 403) {
          throw new Error(
            'Service unavailable — authentication required. Please contact support.'
          );
        } else if (result.status >= 500) {
          throw new Error(
            `Temporary server error (${result.status}) — please try again. Correlation ID: ${result.correlationId}`
          );
        } else if (result.status === 0 || result.error) {
          throw new Error(
            `Network error — unable to reach server. Please check your connection and try again.`
          );
        } else {
          throw new Error(
            `Error ${result.status}: ${result.json?.error || 'Unknown error'}. Correlation ID: ${result.correlationId}`
          );
        }
      }

      const data = result.json;

      if (!data.borrower || !data.score) {
        console.error('[FactoraPage] Invalid response schema:', data);
        throw new Error('Invalid response from server - missing required fields');
      }

      // Add correlation ID to console for debugging
      console.log('[FactoraPage] Success! Correlation ID:', result.correlationId);
      console.log('[FactoraPage] Profile data:', {
        borrower_id: data.borrower.borrower_id,
        score: data.score.factora_score,
      });

      setResults(data);
      setView('results');
    } catch (error) {
      console.error('[FactoraPage] Score check failed:', error);
      throw error; // Re-throw to let IntakeForm handle it
    }
  };

  const handleCancel = () => {
    setView('hero');
  };

  const handleReset = () => {
    setResults(null);
    setView('hero');
  };

  return (
    <div className="factora-page">
      <div className="factora-container">
        {view === 'hero' && <Hero onGetStarted={handleGetStarted} />}
        
        {view === 'form' && (
          <IntakeForm onSubmit={handleFormSubmit} onCancel={handleCancel} />
        )}
        
        {view === 'results' && results && (
          <ProfileCard
            borrower={results.borrower}
            enrichment={results.enrichment}
            score={results.score}
            onReset={handleReset}
            isDemo={results._isDemo}
          />
        )}
      </div>
    </div>
  );
};
