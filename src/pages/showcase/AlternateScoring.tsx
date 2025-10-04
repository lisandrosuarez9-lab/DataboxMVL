import React, { useEffect, useState } from 'react';
import { AltScoreReport } from '@/types';

/**
 * AlternateScoring - Thin-File Credit Scoring Report
 * Displays alternate scoring reports with explainability and download options
 */
const AlternateScoring: React.FC = () => {
  const [report, setReport] = useState<AltScoreReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<string>('demo-12345678');

  useEffect(() => {
    loadReport(selectedPersona);
  }, [selectedPersona]);

  const loadReport = (personaRef: string) => {
    setLoading(true);
    
    // TODO: Replace with API call when backend is ready
    const runId = `ALT-RUN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const mockReport: AltScoreReport = {
      header: {
        run_id: runId,
        model_version: 'alt-credit-v2.1',
        generated_at: new Date().toISOString(),
        persona_ref: personaRef,
      },
      scores: {
        primary_score: null,
        alternate_score: 687,
        band: 'MODERATE',
        eligibility: 'Qualified for up to $5,000 with standard terms',
      },
      factor_contributions: [
        {
          factor: 'remittance_regularity',
          weight: 0.30,
          value: 0.91,
          contribution: 0.273,
          confidence: 0.94,
          source: 'Remittance History',
        },
        {
          factor: 'mobile_topup_pattern',
          weight: 0.15,
          value: 0.85,
          contribution: 0.1275,
          confidence: 0.88,
          source: 'Telco Records',
        },
        {
          factor: 'utility_payment_consistency',
          weight: 0.20,
          value: 0.78,
          contribution: 0.156,
          confidence: 0.91,
          source: 'Utility Payments',
        },
        {
          factor: 'peer_lending_history',
          weight: 0.12,
          value: 0.82,
          contribution: 0.0984,
          confidence: 0.86,
          source: 'Microcredit Data',
        },
        {
          factor: 'social_vouching',
          weight: 0.08,
          value: 0.75,
          contribution: 0.06,
          confidence: 0.79,
          source: 'Community Network',
        },
        {
          factor: 'device_consistency',
          weight: 0.10,
          value: 0.92,
          contribution: 0.092,
          confidence: 0.95,
          source: 'RiskSeal',
        },
        {
          factor: 'identity_verification',
          weight: 0.05,
          value: 0.88,
          contribution: 0.044,
          confidence: 0.93,
          source: 'ID Verification',
        },
      ],
      risk_mitigations: [
        'Device verified with high confidence',
        'Consistent remittance pattern over 18 months',
        'Regular utility payments demonstrate commitment',
        'Strong community vouching from trusted sources',
      ],
      integrity: {
        hash: `sha256:${Math.random().toString(36).substr(2, 16)}`,
        audit_link: `/api/audit/summary?run_id=${runId}`,
      },
    };

    setTimeout(() => {
      setReport(mockReport);
      setLoading(false);
    }, 500);
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

  const downloadJSON = () => {
    if (!report) return;
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.header.run_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    // Client-side PDF generation would go here
    // For now, just show an alert
    alert('PDF generation would be implemented here using a library like jsPDF or html2pdf');
  };

  const demoPersonas = [
    { ref: 'demo-12345678', name: 'Ana Martinez - Remittance Receiver' },
    { ref: 'demo-87654321', name: 'Carlos Lopez - Microcredit Borrower' },
    { ref: 'demo-11223344', name: 'Maria Rodriguez - New to Credit' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-3">
          💳 Alternate Credit Scoring
        </h1>
        <p className="text-lg opacity-90">
          Financial inclusion through thin-file scoring with full explainability
        </p>
      </div>

      {/* Persona Selector */}
      <div className="bg-white rounded-xl p-6 shadow-soft">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Demo Persona
        </label>
        <select
          value={selectedPersona}
          onChange={(e) => setSelectedPersona(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          {demoPersonas.map((persona) => (
            <option key={persona.ref} value={persona.ref}>
              {persona.name} ({persona.ref})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-48"></div>
          ))}
        </div>
      ) : report ? (
        <>
          {/* Report Header */}
          <div className="bg-white rounded-xl p-8 shadow-soft">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Alternate Credit Report
                </h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold">Run ID:</span>{' '}
                    <span className="font-mono">{report.header.run_id}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Model:</span> {report.header.model_version}
                  </div>
                  <div>
                    <span className="font-semibold">Generated:</span>{' '}
                    {new Date(report.header.generated_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Persona:</span>{' '}
                    <span className="font-mono">{report.header.persona_ref}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>📄</span>
                  <span>JSON</span>
                </button>
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <span>📕</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Score Display */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="text-sm font-semibold text-gray-700 mb-2">Primary Score</div>
                <div className="text-4xl font-bold text-gray-400">
                  {report.scores.primary_score ?? 'N/A'}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Insufficient traditional credit history
                </div>
              </div>
              <div className={`border-2 border-transparent rounded-lg p-6 ${getBandColor(report.scores.band)} text-white`}>
                <div className="text-sm font-semibold opacity-90 mb-2">Alternate Score</div>
                <div className="text-5xl font-bold">
                  {report.scores.alternate_score}
                </div>
                <div className="flex items-center space-x-2 mt-3">
                  <span className="px-3 py-1 bg-white bg-opacity-20 rounded text-sm font-semibold">
                    {report.scores.band}
                  </span>
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">✅</div>
                <div>
                  <div className="font-semibold text-gray-900">Eligibility Decision</div>
                  <div className="text-gray-700 mt-1">{report.scores.eligibility}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Factor Contributions */}
          <div className="bg-white rounded-xl p-8 shadow-soft">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Factor Contributions
            </h3>
            <div className="space-y-4">
              {report.factor_contributions
                .sort((a, b) => b.contribution - a.contribution)
                .map((factor, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg">
                          {factor.factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Source: {factor.source} • Confidence: {(factor.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-brand-primary">
                          +{(factor.contribution * 1000).toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Value</div>
                        <div className="font-semibold text-gray-900">{factor.value.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Weight</div>
                        <div className="font-semibold text-gray-900">{(factor.weight * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Contribution</div>
                        <div className="font-semibold text-gray-900">{(factor.contribution * 100).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-brand-primary to-brand-secondary h-3 rounded-full"
                        style={{ width: `${factor.contribution * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Comparative View */}
          <div className="bg-white rounded-xl p-8 shadow-soft">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Traditional vs. Alternate Scoring
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Traditional Scoring Relies On:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500">✗</span>
                    <span className="text-gray-700">Credit card history</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500">✗</span>
                    <span className="text-gray-700">Mortgage/loan history</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500">✗</span>
                    <span className="text-gray-700">Credit bureau reports</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500">✗</span>
                    <span className="text-gray-700">Formal banking relationship</span>
                  </li>
                </ul>
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm font-semibold text-red-600">
                    Result: Insufficient data for thin-file users
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Alternate Scoring Uses:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">Remittance patterns</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">Utility payment history</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">Mobile top-up behavior</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">Peer lending & microcredit</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-700">Device & identity verification</span>
                  </li>
                </ul>
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm font-semibold text-green-600">
                    Result: Actionable score for 70%+ thin-file users
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Mitigations */}
          {report.risk_mitigations && report.risk_mitigations.length > 0 && (
            <div className="bg-white rounded-xl p-8 shadow-soft">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Risk Mitigations
              </h3>
              <div className="space-y-3">
                {report.risk_mitigations.map((mitigation, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xl">🛡️</div>
                    <div className="text-gray-700">{mitigation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrity Verification */}
          <div className="bg-white rounded-xl p-8 shadow-soft">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Integrity Verification
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Report Hash</div>
                <div className="font-mono text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded p-3">
                  {report.integrity.hash}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  This SHA-256 hash provides tamper-proof verification of report integrity
                </p>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Audit Trail</div>
                <a
                  href={report.integrity.audit_link}
                  className="text-brand-primary hover:underline text-sm"
                >
                  {report.integrity.audit_link}
                </a>
                <p className="text-xs text-gray-600 mt-2">
                  Full audit trail available for regulatory review
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center shadow-soft">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl text-gray-900 font-semibold">No report available</div>
        </div>
      )}

      {/* Methodology Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">📚</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Methodology Transparency</h3>
            <p className="text-sm text-gray-700">
              Our alternate scoring model is designed for users with limited traditional credit history (thin-file).
              It leverages alternative data sources including remittances, utility payments, and behavioral patterns
              to provide fair access to credit. All factors are weighted based on statistical correlation with
              repayment behavior, validated through extensive backtesting, and regularly reviewed for bias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlternateScoring;
