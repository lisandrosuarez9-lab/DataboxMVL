import React, { useEffect, useState } from 'react';
import { ScoreFactor, RiskBand } from '@/types';

/**
 * CreditStructure - Business Logic Explanation
 * Displays scoring methodology with factor lineage visualization
 */
const CreditStructure: React.FC = () => {
  const [factors, setFactors] = useState<ScoreFactor[]>([]);
  const [riskBands, setRiskBands] = useState<RiskBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactor, setSelectedFactor] = useState<ScoreFactor | null>(null);

  useEffect(() => {
    // TODO: Replace with API call when backend is ready
    // For now, using mock data that matches the spec
    const mockFactors: ScoreFactor[] = [
      {
        id: '1',
        model_id: 1,
        feature_key: 'payment_regularity',
        weight: 0.25,
        description: 'Consistency and timeliness of payments over 12 months',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        model_id: 1,
        feature_key: 'transaction_volume',
        weight: 0.20,
        description: 'Average transaction volume and frequency',
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        model_id: 1,
        feature_key: 'remittance_regularity',
        weight: 0.18,
        description: 'Consistency of remittance receipts',
        created_at: new Date().toISOString(),
      },
      {
        id: '4',
        model_id: 1,
        feature_key: 'microcredit_history',
        weight: 0.15,
        description: 'Microcredit repayment history',
        created_at: new Date().toISOString(),
      },
      {
        id: '5',
        model_id: 1,
        feature_key: 'utility_payments',
        weight: 0.12,
        description: 'Utility bill payment consistency',
        created_at: new Date().toISOString(),
      },
      {
        id: '6',
        model_id: 1,
        feature_key: 'device_consistency',
        weight: 0.10,
        description: 'Device and identity verification consistency',
        created_at: new Date().toISOString(),
      },
    ];

    const mockBands: RiskBand[] = [
      {
        id: '1',
        model_id: 1,
        band: 'EXCELLENT',
        min_score: 750,
        max_score: 1000,
        recommendation: 'Approve with premium rates',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        model_id: 1,
        band: 'GOOD',
        min_score: 650,
        max_score: 749,
        recommendation: 'Approve with standard rates',
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        model_id: 1,
        band: 'MODERATE',
        min_score: 550,
        max_score: 649,
        recommendation: 'Conditional approval',
        created_at: new Date().toISOString(),
      },
      {
        id: '4',
        model_id: 1,
        band: 'FAIR',
        min_score: 450,
        max_score: 549,
        recommendation: 'Higher risk - limited approval',
        created_at: new Date().toISOString(),
      },
      {
        id: '5',
        model_id: 1,
        band: 'POOR',
        min_score: 0,
        max_score: 449,
        recommendation: 'Decline or refer to alternate scoring',
        created_at: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setFactors(mockFactors);
      setRiskBands(mockBands);
      setLoading(false);
    }, 500);
  }, []);

  const getBandColor = (band: string) => {
    switch (band) {
      case 'EXCELLENT': return 'bg-green-100 text-green-800 border-green-300';
      case 'GOOD': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FAIR': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'POOR': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-3">
          📊 Credit Scoring Structure
        </h1>
        <p className="text-lg opacity-90">
          Transparent methodology showing how we assess creditworthiness
        </p>
      </div>

      {/* Flow Diagram */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Scoring Flow
        </h2>
        <div className="flex items-center justify-between overflow-x-auto">
          <div className="flex items-center space-x-4">
            <div className="text-center min-w-[140px]">
              <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 mb-2">
                <div className="text-3xl mb-2">📥</div>
                <div className="font-semibold text-gray-900">Data Input</div>
              </div>
              <p className="text-xs text-gray-600">Transactions, remittances, payments</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[140px]">
              <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4 mb-2">
                <div className="text-3xl mb-2">⚙️</div>
                <div className="font-semibold text-gray-900">Preprocessing</div>
              </div>
              <p className="text-xs text-gray-600">Normalization, validation</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[140px]">
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 mb-2">
                <div className="text-3xl mb-2">🔬</div>
                <div className="font-semibold text-gray-900">Factorization</div>
              </div>
              <p className="text-xs text-gray-600">Extract weighted features</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[140px]">
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 mb-2">
                <div className="text-3xl mb-2">📈</div>
                <div className="font-semibold text-gray-900">Scoring</div>
              </div>
              <p className="text-xs text-gray-600">Compute final score</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[140px]">
              <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 mb-2">
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold text-gray-900">Risk Banding</div>
              </div>
              <p className="text-xs text-gray-600">Classify risk level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Factor Weights */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Factor Weights & Contributions
        </h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-brand-primary hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedFactor(factor)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">
                      {factor.feature_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <p className="text-sm text-gray-600">{factor.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-brand-primary">
                      {(factor.weight * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Weight</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-brand-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${factor.weight * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Bands */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Risk Band Definitions
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {riskBands.sort((a, b) => b.min_score - a.min_score).map((band) => (
              <div
                key={band.id}
                className={`border-2 rounded-lg p-4 ${getBandColor(band.band)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-lg">{band.band}</div>
                    <p className="text-sm mt-1">{band.recommendation}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-mono font-bold text-xl">
                      {band.min_score} - {band.max_score}
                    </div>
                    <div className="text-xs opacity-75">Score Range</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Factor Detail Modal */}
      {selectedFactor && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedFactor(null)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedFactor.feature_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <button
                onClick={() => setSelectedFactor(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Description</div>
                <p className="text-gray-900">{selectedFactor.description}</p>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Weight</div>
                <div className="text-3xl font-bold text-brand-primary">
                  {(selectedFactor.weight * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Data Sources</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Transaction History</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Remittance Records</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Payment History</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Sample calculation: value × weight = contribution
                </div>
                <div className="font-mono text-sm text-gray-700 mt-1">
                  0.87 × {selectedFactor.weight.toFixed(2)} = {(0.87 * selectedFactor.weight).toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transparency Statement */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Transparency Guarantee</h3>
            <p className="text-sm text-gray-700">
              All scoring factors are documented and auditable. Every credit decision can be traced back to
              its input data with complete lineage. Weights are reviewed quarterly and adjusted based on
              performance metrics while maintaining regulatory compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditStructure;
