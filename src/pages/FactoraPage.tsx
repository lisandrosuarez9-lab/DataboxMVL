/**
 * Factora Single-CTA Page
 * Main page for Factora credit score intake and results
 */

import React, { useState } from 'react';
import { Hero } from '../components/factora/Hero';
import { IntakeForm } from '../components/factora/IntakeForm';
import { ProfileCard } from '../components/factora/ProfileCard';
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
  };
  score: {
    factora_score: number;
    score_band?: string;
    risk_level?: string;
  };
}

export const FactoraPage: React.FC = () => {
  const [view, setView] = useState<ViewState>('hero');
  const [results, setResults] = useState<ScoreResponse | null>(null);

  const handleGetStarted = () => {
    setView('form');
  };

  const handleFormSubmit = async (formData: any) => {
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

    try {
      const response = await fetch(scoreCheckerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.borrower || !data.score) {
        throw new Error('Invalid response from server');
      }

      setResults(data);
      setView('results');
    } catch (error) {
      console.error('Score check failed:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to check credit score. Please try again.'
      );
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
          />
        )}
      </div>
    </div>
  );
};
