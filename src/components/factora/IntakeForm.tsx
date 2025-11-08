/**
 * Factora Intake Form Component
 * Collects borrower information for credit score check
 */

import React, { useState } from 'react';
import { Spinner } from './Spinner';
import { createDemoProfile } from '../../utils/fetchWithRetries';

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
  const [showDemoFallback, setShowDemoFallback] = useState(false);
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

  const handleDemoFallback = async () => {
    console.log('[IntakeForm] Using demo fallback profile');
    const demoProfile = createDemoProfile(formData.full_name);
    
    // Create a synthetic form data event
    const syntheticData = {
      ...formData,
      _profileData: demoProfile,
    };
    
    setLoading(true);
    try {
      await onSubmit(syntheticData as any);
    } catch (err) {
      console.error('[IntakeForm] Demo fallback error:', err);
      setError('Unable to display demo profile. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowDemoFallback(false);

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
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('[IntakeForm] Submission error:', errorMessage);
      
      // Check if this is a network or service error - show demo fallback option
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('5') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('CORS') ||
        errorMessage.includes('unavailable')
      ) {
        setShowDemoFallback(true);
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="intake-form" id="intake-form-dialog" role="dialog" aria-modal="true" aria-label="Credit score application form">
        <Spinner message="Checking your profile — one moment..." />
        <div role="status" aria-live="polite" className="sr-only">
          Checking your profile — one moment
        </div>
      </div>
    );
  }

  return (
    <div className="intake-form" id="intake-form-dialog" role="dialog" aria-modal="true" aria-label="Credit score application form">
      <h2 className="form-title">Credit Score Application</h2>
      <p className="form-subtitle">
        Please provide your information to get your free credit score
      </p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {showDemoFallback && (
        <div 
          style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#0050b3' }}>
            <strong>Service Unavailable:</strong> Would you like to view a demo score instead?
          </p>
          <button
            type="button"
            onClick={handleDemoFallback}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1rem',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
            title="Demo profile shown because live scoring is unavailable"
          >
            View Demo Score
          </button>
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
          <button type="submit" className="btn-primary" disabled={loading}>
            Get My Score
          </button>
        </div>
      </form>
    </div>
  );
};
