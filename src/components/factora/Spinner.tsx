/**
 * Spinner Component
 * Loading indicator for async operations
 */

import React from 'react';

interface SpinnerProps {
  message?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="spinner-container">
      <div className="spinner" role="status" aria-label="Loading">
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};
