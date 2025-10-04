import React, { useEffect, useState } from 'react';
import { RiskEvent, RiskFactor } from '@/types';

/**
 * RiskSealIntegration - Signals to Decisions
 * Displays risk signals and their impact on credit decisions
 */
const RiskSealIntegration: React.FC = () => {
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<RiskEvent | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);

  useEffect(() => {
    // TODO: Replace with API call when backend is ready
    const mockEvents: RiskEvent[] = [
      {
        id: '1',
        owner_id: 'demo-user-1',
        owner_ref: 'demo-12345678',
        source: 'RiskSeal',
        event_type: 'device_consistency_check',
        signal_payload: {
          device_id: 'dev_abc123',
          match_score: 0.92,
          anomaly_flags: [],
        },
        confidence: 0.95,
        observed_at: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        owner_id: 'demo-user-1',
        owner_ref: 'demo-12345678',
        source: 'IdentityVerification',
        event_type: 'identity_match',
        signal_payload: {
          match_score: 0.88,
          verification_level: 'high',
        },
        confidence: 0.91,
        observed_at: new Date(Date.now() - 7200000).toISOString(),
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '3',
        owner_id: 'demo-user-2',
        owner_ref: 'demo-87654321',
        source: 'BehavioralAnalytics',
        event_type: 'transaction_pattern_analysis',
        signal_payload: {
          pattern_consistency: 0.85,
          anomaly_score: 0.12,
        },
        confidence: 0.87,
        observed_at: new Date(Date.now() - 10800000).toISOString(),
        created_at: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: '4',
        owner_id: 'demo-user-3',
        owner_ref: 'demo-11223344',
        source: 'RiskSeal',
        event_type: 'fraud_check',
        signal_payload: {
          fraud_score: 0.05,
          risk_level: 'low',
        },
        confidence: 0.98,
        observed_at: new Date(Date.now() - 14400000).toISOString(),
        created_at: new Date(Date.now() - 14400000).toISOString(),
      },
    ];

    const mockFactors: RiskFactor[] = [
      {
        id: '1',
        owner_id: 'demo-user-1',
        owner_ref: 'demo-12345678',
        factor_code: 'device_consistency',
        factor_value: 0.92,
        confidence: 0.95,
        derived_at: new Date(Date.now() - 3600000).toISOString(),
        source_event_id: '1',
        signal_source: 'RiskSeal',
        signal_type: 'device_consistency_check',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        owner_id: 'demo-user-1',
        owner_ref: 'demo-12345678',
        factor_code: 'identity_match_score',
        factor_value: 0.88,
        confidence: 0.91,
        derived_at: new Date(Date.now() - 7200000).toISOString(),
        source_event_id: '2',
        signal_source: 'IdentityVerification',
        signal_type: 'identity_match',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '3',
        owner_id: 'demo-user-2',
        owner_ref: 'demo-87654321',
        factor_code: 'behavior_consistency',
        factor_value: 0.85,
        confidence: 0.87,
        derived_at: new Date(Date.now() - 10800000).toISOString(),
        source_event_id: '3',
        signal_source: 'BehavioralAnalytics',
        signal_type: 'transaction_pattern_analysis',
        created_at: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: '4',
        owner_id: 'demo-user-3',
        owner_ref: 'demo-11223344',
        factor_code: 'fraud_risk',
        factor_value: 0.05,
        confidence: 0.98,
        derived_at: new Date(Date.now() - 14400000).toISOString(),
        source_event_id: '4',
        signal_source: 'RiskSeal',
        signal_type: 'fraud_check',
        created_at: new Date(Date.now() - 14400000).toISOString(),
      },
    ];

    setTimeout(() => {
      setRiskEvents(mockEvents);
      setRiskFactors(mockFactors);
      setLoading(false);
    }, 500);
  }, []);

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'RiskSeal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DeviceFingerprint': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'BehavioralAnalytics': return 'bg-green-100 text-green-800 border-green-300';
      case 'IdentityVerification': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { label: 'High', color: 'bg-green-500' };
    if (confidence >= 0.7) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-red-500' };
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredFactors = riskFactors.filter(f => f.confidence >= confidenceFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-3">
          🛡️ RiskSeal Integration
        </h1>
        <p className="text-lg opacity-90">
          Real-time risk signals powering smarter credit decisions
        </p>
      </div>

      {/* Signal Taxonomy */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Signal Taxonomy
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
            <div className="text-3xl mb-2">🔷</div>
            <div className="font-semibold text-gray-900">RiskSeal</div>
            <p className="text-sm text-gray-600 mt-1">Device & fraud detection</p>
          </div>
          <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
            <div className="text-3xl mb-2">📱</div>
            <div className="font-semibold text-gray-900">Device Fingerprint</div>
            <p className="text-sm text-gray-600 mt-1">Device consistency checks</p>
          </div>
          <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold text-gray-900">Behavioral Analytics</div>
            <p className="text-sm text-gray-600 mt-1">Pattern analysis</p>
          </div>
          <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-semibold text-gray-900">Identity Verification</div>
            <p className="text-sm text-gray-600 mt-1">Identity matching</p>
          </div>
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Live Risk Event Feed
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {riskEvents.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-brand-primary hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedSignal(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getSourceColor(event.source)}`}>
                        {event.source}
                      </span>
                      <span className="text-sm text-gray-600">{formatTimeAgo(event.observed_at)}</span>
                    </div>
                    <div className="font-semibold text-gray-900">
                      {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Persona: <span className="font-mono">{event.owner_ref}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceBadge(event.confidence).color}`}></div>
                      <span className="text-sm font-semibold">{(event.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getConfidenceBadge(event.confidence).label} Confidence
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Derived Risk Factors */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Derived Risk Factors
          </h2>
          <div className="flex items-center space-x-3">
            <label className="text-sm text-gray-700">Min Confidence:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
              {(confidenceFilter * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredFactors.map((factor) => (
              <div
                key={factor.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-brand-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {factor.factor_code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Source: {factor.signal_source}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-brand-primary">
                      {factor.factor_value !== null ? factor.factor_value.toFixed(2) : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Value</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Confidence: {(factor.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(factor.derived_at)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-brand-primary h-2 rounded-full"
                    style={{ width: `${(factor.factor_value || 0) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Impact Simulation */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Signal Impact on Credit Score
        </h2>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">✅ Device Consistency</div>
                <div className="text-sm text-gray-600 mt-1">High confidence match detected</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">+8</div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">✅ Identity Verified</div>
                <div className="text-sm text-gray-600 mt-1">Strong identity match</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">+12</div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">⚠️ Low Fraud Risk</div>
                <div className="text-sm text-gray-600 mt-1">Minimal fraud indicators</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-600">+5</div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Detail Modal */}
      {selectedSignal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSignal(null)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Signal Details
              </h3>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Event Type</div>
                <div className="text-lg text-gray-900">
                  {selectedSignal.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Source</div>
                <span className={`px-3 py-1 rounded text-sm font-semibold border ${getSourceColor(selectedSignal.source)}`}>
                  {selectedSignal.source}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Confidence</div>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-bold text-brand-primary">
                    {(selectedSignal.confidence * 100).toFixed(0)}%
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getConfidenceBadge(selectedSignal.confidence).color} text-white`}>
                    {getConfidenceBadge(selectedSignal.confidence).label}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Observed At</div>
                <div className="text-gray-900">
                  {new Date(selectedSignal.observed_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Signal Payload (Anonymized)</div>
                <pre className="bg-gray-100 border border-gray-300 rounded p-4 text-xs overflow-x-auto">
                  {JSON.stringify(selectedSignal.signal_payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Privacy & Anonymization</h3>
            <p className="text-sm text-gray-700">
              All risk signals are anonymized before display. Personal identifiers are replaced with demo references
              (e.g., "demo-12345678"). Raw signal payloads contain only technical metadata necessary for
              transparency and auditability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskSealIntegration;
