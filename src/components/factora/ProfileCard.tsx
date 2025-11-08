/**
 * Factora Profile Card Component
 * Displays borrower information and credit score results
 */

import React from 'react';

interface BorrowerData {
  borrower_id: string;
  full_name?: string;
  name?: string; // alternate property name
  national_id: string;
  email: string;
  phone: string;
  created_at: string;
}

interface EnrichmentData {
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

interface ScoreData {
  factora_score?: number;
  value?: number; // alternate property name
  score_band?: string;
  risk_level?: string;
}

interface ProfileCardProps {
  borrower: BorrowerData;
  enrichment?: EnrichmentData;
  score: ScoreData;
  onReset: () => void;
  isDemo?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  borrower,
  score,
  onReset,
  isDemo = false,
}) => {
  // Defensive parsing as per mandate
  const name = borrower?.full_name || borrower?.name || 'Name not provided';
  const scoreValue = score?.factora_score ?? score?.value ?? null;
  
  if (scoreValue === null) {
    return (
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile Unavailable</h2>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Profile unavailable — see troubleshooting</p>
          <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '1rem' }}>
            Please check the console for correlation ID and error details.
          </p>
          <button onClick={onReset} className="btn-primary" style={{ marginTop: '1.5rem' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (factora_score: number) => {
    if (factora_score >= 700) return 'score-excellent';
    if (factora_score >= 650) return 'score-good';
    if (factora_score >= 600) return 'score-fair';
    return 'score-poor';
  };

  const getScoreBand = (factora_score: number) => {
    if (factora_score >= 700) return 'Excellent';
    if (factora_score >= 650) return 'Good';
    if (factora_score >= 600) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="profile-card">
      {isDemo && (
        <div 
          style={{
            background: '#fff7e6',
            border: '2px solid #ffa940',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
          role="alert"
        >
          <strong style={{ color: '#d46b08' }}>📊 Demo Profile</strong>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#ad6800' }}>
            Demo profile shown because live scoring is unavailable
          </p>
        </div>
      )}
      
      <div className="profile-header">
        <h2>Your Factora Credit Score</h2>
      </div>

      <div className={`score-display ${getScoreColor(scoreValue)}`}>
        <div className="score-number">{scoreValue}</div>
        <div className="score-label">{score.score_band || getScoreBand(scoreValue)}</div>
      </div>

      <div className="profile-details">
        <h3>Borrower Information</h3>
        <div className="detail-row">
          <span className="detail-label">Name:</span>
          <span className="detail-value">{name}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">ID:</span>
          <span className="detail-value">{borrower.national_id}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Email:</span>
          <span className="detail-value">{borrower.email}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Phone:</span>
          <span className="detail-value">{borrower.phone}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Borrower ID:</span>
          <span className="detail-value">{borrower.borrower_id}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Created:</span>
          <span className="detail-value">
            {new Date(borrower.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {score.risk_level && (
        <div className="risk-level">
          <strong>Risk Level:</strong> {score.risk_level}
        </div>
      )}

      <div className="profile-actions">
        <button onClick={onReset} className="btn-primary">
          Check Another Score
        </button>
      </div>

      <div className="profile-footer">
        <p className="disclaimer">
          This score is for informational purposes only and does not constitute
          a credit decision or guarantee of financing.
        </p>
      </div>
    </div>
  );
};
