/**
 * Factora Intake Form Component
 * Collects borrower information for credit score check
 */

import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface IntakeFormData {
  full_name: string;
  national_id: string;
  email: string;
  phone: string;
  consent: boolean;
  intent_financing: boolean;
  prior_borrowing: boolean;
}

interface IntakeFormProps {
  onSubmit: (data: IntakeFormData) => Promise<void>;
  onCancel: () => void;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({ onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<IntakeFormData>({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    consent: false,
    intent_financing: false,
    prior_borrowing: false,
  });

  const handleChange = (field: keyof IntakeFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.full_name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!formData.national_id.trim()) {
      setError('Please enter your national ID');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (!formData.consent) {
      setError('You must consent to data processing to continue');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="intake-form">
        <Spinner message="Processing your information..." />
      </div>
    );
  }

  return (
    <div className="intake-form">
      <h2 className="form-title">Credit Score Application</h2>
      <p className="form-subtitle">
        Please provide your information to get your free credit score
      </p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="full_name">Full Name *</label>
          <input
            type="text"
            id="full_name"
            value={formData.full_name}
            onChange={handleChange('full_name')}
            aria-label="Full name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="national_id">National ID *</label>
          <input
            type="text"
            id="national_id"
            value={formData.national_id}
            onChange={handleChange('national_id')}
            aria-label="National ID"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={handleChange('email')}
            aria-label="Email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={handleChange('phone')}
            aria-label="Phone"
            placeholder="+1-555-000-0000"
            required
          />
        </div>

        <div className="form-group-checkbox">
          <input
            type="checkbox"
            id="intent_financing"
            checked={formData.intent_financing}
            onChange={handleChange('intent_financing')}
            aria-label="Intent financing"
          />
          <label htmlFor="intent_financing">I am interested in financing options</label>
        </div>

        <div className="form-group-checkbox">
          <input
            type="checkbox"
            id="prior_borrowing"
            checked={formData.prior_borrowing}
            onChange={handleChange('prior_borrowing')}
            aria-label="Prior borrowing"
          />
          <label htmlFor="prior_borrowing">I have borrowed from financial institutions before</label>
        </div>

        <div className="form-group-checkbox consent">
          <input
            type="checkbox"
            id="consent"
            checked={formData.consent}
            onChange={handleChange('consent')}
            aria-label="Consent"
            required
          />
          <label htmlFor="consent">
            I consent to the processing of my personal data for credit evaluation purposes *
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Get My Score
          </button>
        </div>
      </form>
    </div>
  );
};
