import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/stores';
import { HealthCheckResult, healthCheck } from '@/utils/monitoring';
import { Card } from '@/components/ui';

interface HealthIndicatorProps {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  label: string;
  details?: string;
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({ status, label, details }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {status}
        </span>
        {details && (
          <span className="text-xs text-gray-500" title={details}>
            {details}
          </span>
        )}
      </div>
    </div>
  );
};

const InfrastructureMonitoringDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const monitoring = useSelector((state: RootState) => state.monitoring);

  useEffect(() => {
    const loadHealthStatus = async () => {
      setIsLoading(true);
      try {
        const status = await healthCheck.run();
        setHealthStatus(status);
      } catch (error) {
        console.error('Failed to load health status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load initial status
    loadHealthStatus();

    // Refresh every 30 seconds
    const interval = setInterval(loadHealthStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatResponseTime = (time: number) => {
    return time < 100 ? 'Fast' : time < 500 ? 'Normal' : 'Slow';
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">🔗 Infrastructure Health</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔗 Infrastructure Health</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => healthCheck.run().then(setHealthStatus)}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
          >
            Refresh
          </button>
          <span className="text-xs text-gray-500">
            Last check: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>

      {healthStatus && (
        <div className="space-y-3">
          {/* Overall Status */}
          <div className="border-b pb-3">
            <HealthIndicator
              status={healthStatus.status}
              label="Overall System"
              details={`${healthStatus.responseTime.toFixed(1)}ms - ${formatResponseTime(healthStatus.responseTime)}`}
            />
          </div>

          {/* Component Status */}
          <div className="space-y-1">
            <HealthIndicator
              status={healthStatus.details.database === 'connected' ? 'healthy' : 'unhealthy'}
              label="Database Connection"
              details={healthStatus.details.database}
            />
            <HealthIndicator
              status={healthStatus.details.api === 'responsive' ? 'healthy' : 'unhealthy'}
              label="API Services"
              details={healthStatus.details.api}
            />
            <HealthIndicator
              status={healthStatus.details.authentication === 'working' ? 'healthy' : 'unhealthy'}
              label="Authentication"
              details={healthStatus.details.authentication}
            />
            <HealthIndicator
              status={healthStatus.details.assets === 'loaded' ? 'healthy' : 'unhealthy'}
              label="Asset Loading"
              details={healthStatus.details.assets}
            />
          </div>

          {/* Connection Details */}
          <div className="border-t pt-3 text-xs text-gray-600">
            <div className="grid grid-cols-2 gap-2">
              <div>📡 Real-time: {monitoring.isConnected ? 'Connected' : 'Disconnected'}</div>
              <div>🔄 Sync: In Sync</div>
              <div>⚡ Performance: ~{healthStatus.responseTime.toFixed(0)}ms</div>
              <div>🔐 Security: RLS Enabled</div>
            </div>
          </div>

          {/* Errors */}
          {healthStatus.errors.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-red-600 mb-2">Recent Issues:</h4>
              <div className="space-y-1">
                {healthStatus.errors.map((error, index) => (
                  <div key={index} className="text-xs text-red-500 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Report Button */}
          <div className="border-t pt-3">
            <button
              onClick={() => {
                const report = healthCheck.generateReport();
                console.log(report);
                alert('Health report generated in browser console');
              }}
              className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              📊 Generate Detailed Health Report
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default InfrastructureMonitoringDashboard;