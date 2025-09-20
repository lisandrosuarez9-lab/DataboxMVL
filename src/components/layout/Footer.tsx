import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Version 1.0.0</span>
            <span>Last Deploy: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="text-sm text-gray-600 italic">
            Compliance Dashboard - Audit records are immutable and retention compliant
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;