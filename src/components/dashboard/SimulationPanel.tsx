import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { apiClient, apiHelpers } from '@/utils/api';

interface SimulationPanelProps {
  personaId: string;
  onClose: () => void;
  role: 'compliance' | 'service_role' | null;
}

interface SimulationResult {
  simulated_score: number;
  explanation: any;
  computed_at_simulation: string;
  original_score?: number;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  personaId,
  onClose,
  role
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [overrides, setOverrides] = useState({
    tx_6m_count: '',
    tx_6m_avg_amount: '',
    tx_6m_sum: '',
    days_since_last_tx: '',
    remesa_12m_sum: '',
    bills_paid_ratio: '',
    avg_bill_amount: '',
    micro_active: false,
    micro_active_sum: ''
  });

  // Check if user can run simulations
  const canRunSimulation = role === 'service_role' || role === 'compliance';

  const handleInputChange = (field: string, value: string | boolean) => {
    setOverrides(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const runSimulation = async () => {
    if (!canRunSimulation) {
      setError('Access denied: Only service_role or compliance can run simulations');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert string values to numbers where appropriate
      const processedOverrides: Record<string, any> = {};
      Object.entries(overrides).forEach(([key, value]) => {
        if (value === '' || value === null) return; // Skip empty values
        
        if (key === 'micro_active') {
          processedOverrides[key] = value;
        } else {
          const numValue = parseFloat(value as string);
          if (!isNaN(numValue)) {
            processedOverrides[key] = numValue;
          }
        }
      });

      const simulationResult = await apiClient.simulateScore(personaId, processedOverrides);
      setResult(simulationResult);
    } catch (err) {
      const errorMessage = apiHelpers.getErrorMessage(err as Error);
      setError(errorMessage);
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearSimulation = () => {
    setResult(null);
    setError(null);
    setOverrides({
      tx_6m_count: '',
      tx_6m_avg_amount: '',
      tx_6m_sum: '',
      days_since_last_tx: '',
      remesa_12m_sum: '',
      bills_paid_ratio: '',
      avg_bill_amount: '',
      micro_active: false,
      micro_active_sum: ''
    });
  };

  if (!canRunSimulation) {
    return (
      <Card className="bg-red-50 border-red-200">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🚫</div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Access Denied</h3>
          <p className="text-red-600">
            Only service_role or compliance users can run simulations.
          </p>
          <Button onClick={onClose} className="mt-4" variant="secondary">
            Close
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SIMULATION ONLY Banner */}
      <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <div className="text-orange-600 mr-3 text-xl">⚠️</div>
          <div className="text-center">
            <div className="font-bold text-orange-800 text-lg">
              SIMULATION ONLY
            </div>
            <div className="text-sm text-orange-700">
              Results are non-persistent and for analysis purposes only
            </div>
          </div>
        </div>
      </div>

      <Card title="Credit Score Simulation" className="bg-white">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transaction Metrics */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Transaction Metrics</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Count (6M)
                </label>
                <input
                  type="number"
                  value={overrides.tx_6m_count}
                  onChange={(e) => handleInputChange('tx_6m_count', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Transaction Amount (6M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrides.tx_6m_avg_amount}
                  onChange={(e) => handleInputChange('tx_6m_avg_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 150.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Transaction Sum (6M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrides.tx_6m_sum}
                  onChange={(e) => handleInputChange('tx_6m_sum', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 3750.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days Since Last Transaction
                </label>
                <input
                  type="number"
                  value={overrides.days_since_last_tx}
                  onChange={(e) => handleInputChange('days_since_last_tx', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 5"
                />
              </div>
            </div>

            {/* Financial Metrics */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Financial Metrics</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remittances Sum (12M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrides.remesa_12m_sum}
                  onChange={(e) => handleInputChange('remesa_12m_sum', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 12000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bills Paid Ratio
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={overrides.bills_paid_ratio}
                  onChange={(e) => handleInputChange('bills_paid_ratio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 0.85"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Bill Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrides.avg_bill_amount}
                  onChange={(e) => handleInputChange('avg_bill_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 75.00"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={overrides.micro_active}
                    onChange={(e) => handleInputChange('micro_active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Has Active Microcredit
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Microcredit Active Sum
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrides.micro_active_sum}
                  onChange={(e) => handleInputChange('micro_active_sum', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 5000.00"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              onClick={runSimulation}
              loading={loading}
              variant="primary"
              className="flex items-center space-x-2"
            >
              <span>🧪</span>
              <span>Run Simulation</span>
            </Button>
            
            <Button
              onClick={clearSimulation}
              variant="secondary"
              disabled={loading}
            >
              Clear
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              disabled={loading}
            >
              Close
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="text-red-800 font-medium mb-2">Simulation Error</div>
          <div className="text-red-600 text-sm">{error}</div>
          <div className="text-red-500 text-xs mt-1">
            {new Date().toISOString()}
          </div>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-blue-900">
                🧪 Simulation Results
              </h3>
              <div className="text-sm text-blue-600">
                NON-PERSISTENT
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Simulated Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {result.simulated_score}
                </div>
              </div>

              {result.original_score && (
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Original Score</div>
                  <div className="text-2xl font-bold text-gray-600">
                    {result.original_score}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Simulated Explanation
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                {JSON.stringify(result.explanation, null, 2)}
              </pre>
            </div>

            <div className="text-center text-sm text-blue-600">
              <div>Computed at: {apiHelpers.formatTimestamp(result.computed_at_simulation)}</div>
              <div className="text-xs text-blue-500 mt-1">
                ⚠️ This simulation is non-persistent and will not affect live data
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SimulationPanel;