import React from 'react';

interface RoleBannerProps {
  role: 'compliance' | 'service_role' | null;
}

export const RoleBanner: React.FC<RoleBannerProps> = ({ role }) => {
  if (role === 'compliance') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-blue-600 mr-3 text-xl">🛡️</div>
          <div>
            <div className="font-medium text-blue-800">
              Read-only Access for Compliance
            </div>
            <div className="text-sm text-blue-600">
              You have read-only access to audit data and persona information. 
              Interactive controls are disabled for compliance role.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'service_role') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-green-600 mr-3 text-xl">⚙️</div>
          <div>
            <div className="font-medium text-green-800">
              Service Role - Full Access
            </div>
            <div className="text-sm text-green-600">
              You have full access to all features including toggle controls for test personas.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Anonymous or no role - this should trigger redirect in parent component
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <div className="text-red-600 mr-3 text-xl">🚫</div>
        <div>
          <div className="font-medium text-red-800">
            Authentication Required
          </div>
          <div className="text-sm text-red-600">
            Please log in to access the dashboard.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleBanner;