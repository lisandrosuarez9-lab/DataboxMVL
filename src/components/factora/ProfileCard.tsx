/**
 * Factora Profile Card Component
 * Displays borrower information and credit score results
 */

import React from 'react';

interface BorrowerData {
  borrower_id: string;
  full_name: string;
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
  factora_score: number;
  score_band?: string;
  risk_level?: string;
}

interface ProfileCardProps {
  borrower: BorrowerData;
  enrichment?: EnrichmentData;
  score: ScoreData;
  onReset: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  borrower,
  score,
  onReset,
}) => {
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
      <div className="profile-header">
        <h2>Your Factora Credit Score</h2>
      </div>

      <div className={`score-display ${getScoreColor(score.factora_score)}`}>
        <div className="score-number">{score.factora_score}</div>
        <div className="score-label">{score.score_band || getScoreBand(score.factora_score)}</div>
      </div>

      <div className="profile-details">
        <h3>Borrower Information</h3>
        <div className="detail-row">
          <span className="detail-label">Name:</span>
          <span className="detail-value">{borrower.full_name}</span>
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
