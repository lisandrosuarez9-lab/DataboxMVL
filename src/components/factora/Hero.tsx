/**
 * Factora Credit Score Hero Component
 * Single CTA landing section for credit score intake
 */

import React from 'react';

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <div className="factora-hero">
      <div className="hero-content">
        <h1 className="hero-title">
          Get your free Factora Credit Score!
        </h1>
        <p className="hero-subtitle">
          Fast, secure, and transparent credit evaluation
        </p>
        <button 
          className="cta" 
          onClick={onGetStarted}
          aria-haspopup="dialog"
          aria-controls="intake-form-dialog"
        >
          Get your free Factora Credit Score
        </button>
        <p className="hero-note">
          Takes less than 2 minutes • No hidden fees • Instant results
        </p>
      </div>
    </div>
  );
};
