import React from 'react';
import Button from './Button';
import { apiHelpers } from '@/utils/api';

interface ConnectivityBannerProps {
  connected: boolean;
  lastHandshake: string;
  baseUrl: string;
  version?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export const ConnectivityBanner: React.FC<ConnectivityBannerProps> = ({
  connected,
  lastHandshake,
  baseUrl,
  version,
  onRefresh,
  loading = false
}) => {
  const statusColor = connected ? 'green' : 'red';
  const statusIcon = connected ? '🟢' : '🔴';
  const statusText = connected ? 'Connected' : 'Disconnected';

  return (
    <div className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{statusIcon}</span>
            <div>
              <div className={`font-medium text-${statusColor}-800`}>
                Backend Connectivity: {statusText}
              </div>
              <div className={`text-sm text-${statusColor}-600`}>
                {baseUrl}
              </div>
            </div>
          </div>
          
          <div className="hidden sm:block border-l border-gray-300 pl-4">
            <div className={`text-sm text-${statusColor}-600`}>
              Last handshake: {apiHelpers.formatTimestamp(lastHandshake)}
            </div>
            <div className={`text-xs text-${statusColor}-500`}>
              {apiHelpers.getTimeAgo(lastHandshake)}
            </div>
          </div>

          {version && (
            <div className={`text-xs px-2 py-1 bg-${statusColor}-100 text-${statusColor}-700 rounded`}>
              v{version}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="secondary"
              size="sm"
              loading={loading}
              className="flex items-center space-x-1"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile view for handshake info */}
      <div className="sm:hidden mt-2 pt-2 border-t border-gray-200">
        <div className={`text-sm text-${statusColor}-600`}>
          Last handshake: {apiHelpers.formatTimestamp(lastHandshake)}
        </div>
        <div className={`text-xs text-${statusColor}-500`}>
          {apiHelpers.getTimeAgo(lastHandshake)}
        </div>
      </div>
    </div>
  );
};

export default ConnectivityBanner;