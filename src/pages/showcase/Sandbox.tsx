import React, { useState } from 'react';
import { SandboxInput, SandboxOutput } from '@/types';

/**
 * Sandbox - Safe Read-Only Credit Score Simulations
 * Client-side only calculations, no data leaves the browser
 */
const Sandbox: React.FC = () => {
  const [input, setInput] = useState<SandboxInput>({
    monthly_income: 2500,
    transaction_count_3m: 45,
    remittance_frequency: 'monthly',
    microcredit_repayment_rate: 0.95,
    risk_signals: {
      device_consistency: 0.92,
      identity_confidence: 0.88,
    },
  });

  const [output, setOutput] = useState<SandboxOutput | null>(null);
  const [showLineage, setShowLineage] = useState(false);

  // Client-side scoring calculation
  const calculateScore = () => {
    // Normalize inputs to 0-1 range
    const normalizedIncome = Math.min(input.monthly_income / 5000, 1);
    const normalizedTxCount = Math.min(input.transaction_count_3m / 100, 1);
    
    const remittanceScore = {
      weekly: 0.95,
      monthly: 0.85,
      quarterly: 0.70,
      rare: 0.50,
    }[input.remittance_frequency];

    // Factor weights (must match model specification)
    const factors = {
      income: { weight: 0.20, value: normalizedIncome },
      transaction_volume: { weight: 0.18, value: normalizedTxCount },
      remittance_regularity: { weight: 0.22, value: remittanceScore },
      repayment_rate: { weight: 0.15, value: input.microcredit_repayment_rate },
      device_consistency: { weight: 0.13, value: input.risk_signals.device_consistency },
      identity_confidence: { weight: 0.12, value: input.risk_signals.identity_confidence },
    };

    // Calculate weighted score
    let rawScore = 0;
    let highestContribution = { name: '', value: 0 };

    Object.entries(factors).forEach(([key, { weight, value }]) => {
      const contribution = weight * value;
      rawScore += contribution;
      if (contribution > highestContribution.value) {
        highestContribution = { name: key, value: contribution };
      }
    });

    // Normalize to 300-850 range (standard credit score range)
    const normalizedScore = Math.round(300 + (rawScore * 550));

    // Determine band
    let band: string;
    if (normalizedScore >= 750) band = 'EXCELLENT';
    else if (normalizedScore >= 650) band = 'GOOD';
    else if (normalizedScore >= 550) band = 'MODERATE';
    else if (normalizedScore >= 450) band = 'FAIR';
    else band = 'POOR';

    // Identify risk mitigations
    const mitigations: string[] = [];
    if (input.risk_signals.device_consistency >= 0.85) {
      mitigations.push('device_verified');
    }
    if (normalizedIncome >= 0.5) {
      mitigations.push('income_verified');
    }
    if (input.microcredit_repayment_rate >= 0.90) {
      mitigations.push('strong_repayment_history');
    }

    const result: SandboxOutput = {
      score: normalizedScore,
      band,
      explanation: {
        factors_used: Object.keys(factors).length,
        highest_contribution: `${highestContribution.name.replace(/_/g, ' ')} (${highestContribution.value.toFixed(2)})`,
        risk_mitigations: mitigations,
      },
      lineage: {
        model_version: 'sandbox-v2.1',
        calculation_timestamp: new Date().toISOString(),
        policy_view: 'public_score_models',
      },
    };

    setOutput(result);
  };

  const resetForm = () => {
    setInput({
      monthly_income: 2500,
      transaction_count_3m: 45,
      remittance_frequency: 'monthly',
      microcredit_repayment_rate: 0.95,
      risk_signals: {
        device_consistency: 0.92,
        identity_confidence: 0.88,
      },
    });
    setOutput(null);
  };

  const getBandColor = (band: string) => {
    switch (band) {
      case 'EXCELLENT': return 'bg-green-600';
      case 'GOOD': return 'bg-blue-600';
      case 'MODERATE': return 'bg-yellow-600';
      case 'FAIR': return 'bg-orange-600';
      case 'POOR': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-3">
          🧪 Credit Score Sandbox
        </h1>
        <p className="text-lg opacity-90">
          Safe, read-only simulations - all calculations happen in your browser
        </p>
      </div>

      {/* Privacy Guarantee */}
      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">
              No Data Leaves Your Browser
            </h3>
            <p className="text-sm text-gray-700">
              All calculations are performed client-side using JavaScript. No API calls are made.
              Your inputs are never sent to our servers. This is a read-only demonstration environment
              with no connection to production systems.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl p-8 shadow-soft space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Simulation Parameters
          </h2>

          {/* Monthly Income */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monthly Income ($)
            </label>
            <input
              type="number"
              value={input.monthly_income}
              onChange={(e) => setInput({ ...input, monthly_income: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              min="0"
              step="100"
            />
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={input.monthly_income}
                onChange={(e) => setInput({ ...input, monthly_income: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 min-w-[80px] text-right">
                ${input.monthly_income.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Transaction Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Transaction Count (Last 3 Months)
            </label>
            <input
              type="number"
              value={input.transaction_count_3m}
              onChange={(e) => setInput({ ...input, transaction_count_3m: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              min="0"
            />
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="200"
                value={input.transaction_count_3m}
                onChange={(e) => setInput({ ...input, transaction_count_3m: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 min-w-[80px] text-right">
                {input.transaction_count_3m} txs
              </span>
            </div>
          </div>

          {/* Remittance Frequency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Remittance Frequency
            </label>
            <select
              value={input.remittance_frequency}
              onChange={(e) => setInput({ ...input, remittance_frequency: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="rare">Rare</option>
            </select>
          </div>

          {/* Microcredit Repayment Rate */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Microcredit Repayment Rate
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={input.microcredit_repayment_rate}
                onChange={(e) => setInput({ ...input, microcredit_repayment_rate: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-900 min-w-[60px] text-right">
                {(input.microcredit_repayment_rate * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Device Consistency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Device Consistency (RiskSeal)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={input.risk_signals.device_consistency}
                onChange={(e) => setInput({
                  ...input,
                  risk_signals: { ...input.risk_signals, device_consistency: parseFloat(e.target.value) }
                })}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-900 min-w-[60px] text-right">
                {(input.risk_signals.device_consistency * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Identity Confidence */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Identity Confidence
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={input.risk_signals.identity_confidence}
                onChange={(e) => setInput({
                  ...input,
                  risk_signals: { ...input.risk_signals, identity_confidence: parseFloat(e.target.value) }
                })}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-900 min-w-[60px] text-right">
                {(input.risk_signals.identity_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={calculateScore}
              className="flex-1 bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-secondary transition-colors"
            >
              Calculate Score
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Output Display */}
        <div className="space-y-6">
          {output ? (
            <>
              {/* Score Result */}
              <div className={`rounded-xl p-8 text-white shadow-xl ${getBandColor(output.band)}`}>
                <div className="text-center">
                  <div className="text-sm font-semibold opacity-90 mb-2">Calculated Credit Score</div>
                  <div className="text-7xl font-bold mb-4">{output.score}</div>
                  <div className="inline-block px-4 py-2 bg-white bg-opacity-20 rounded-lg">
                    <div className="text-2xl font-bold">{output.band}</div>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-white rounded-xl p-8 shadow-soft">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Score Explanation
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-700">Factors Used</span>
                    <span className="font-semibold text-gray-900">{output.explanation.factors_used}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-700">Highest Contribution</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {output.explanation.highest_contribution}
                    </span>
                  </div>
                  <div className="py-2">
                    <div className="text-gray-700 mb-2">Risk Mitigations</div>
                    <div className="space-y-2">
                      {output.explanation.risk_mitigations.length > 0 ? (
                        output.explanation.risk_mitigations.map((mitigation, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span className="text-sm text-gray-700">
                              {mitigation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 italic">None identified</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lineage */}
              <div className="bg-white rounded-xl p-8 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    Calculation Lineage
                  </h3>
                  <button
                    onClick={() => setShowLineage(!showLineage)}
                    className="text-brand-primary hover:underline text-sm font-semibold"
                  >
                    {showLineage ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                {showLineage && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">Model Version</span>
                      <span className="font-mono text-gray-900">{output.lineage.model_version}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">Calculation Time</span>
                      <span className="font-mono text-gray-900">
                        {new Date(output.lineage.calculation_timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">Policy View</span>
                      <span className="font-mono text-gray-900">{output.lineage.policy_view}</span>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-xs text-gray-700">
                        <strong>Verification:</strong> This calculation is deterministic and can be reproduced
                        by re-running with the same inputs. All factor weights match the published model specification.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center shadow-soft">
              <div className="text-6xl mb-4">🧮</div>
              <div className="text-xl text-gray-900 font-semibold mb-2">Ready to Calculate</div>
              <p className="text-gray-600">
                Adjust the parameters on the left and click "Calculate Score" to see your result
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Model Information */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          About This Sandbox
        </h3>
        <div className="space-y-4 text-gray-700">
          <p>
            This sandbox uses a simplified version of our alternate credit scoring model. It demonstrates
            how various factors contribute to the final credit score in a transparent, explainable way.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">✅ What This Does</div>
              <ul className="space-y-1 text-sm">
                <li>• Demonstrates scoring logic</li>
                <li>• Provides instant feedback</li>
                <li>• Shows factor contributions</li>
                <li>• Runs entirely in browser</li>
              </ul>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">⚠️ What This Doesn't Do</div>
              <ul className="space-y-1 text-sm">
                <li>• Doesn't affect real scores</li>
                <li>• Doesn't store any data</li>
                <li>• Doesn't make API calls</li>
                <li>• Doesn't use production models</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sandbox;
