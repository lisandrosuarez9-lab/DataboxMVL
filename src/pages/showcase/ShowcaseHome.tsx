import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { IntegrityStatus } from '@/types';

/**
 * ShowcaseHome - Landing page for the compliance showcase
 * Displays live integrity metrics and system status
 */
const ShowcaseHome: React.FC = () => {
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch integrity status
    // In production, this would call the API
    // For now, showing mock data
    const mockStatus: IntegrityStatus = {
      orphan_records: 0,
      latest_run_id: 'RUN-20240115-ABCD1234',
      audit_entries_30d: 1247,
      rls_status: 'ENFORCED',
      last_verification: new Date().toISOString(),
      tables_checked: 5,
    };

    setTimeout(() => {
      setIntegrityStatus(mockStatus);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
      {/* Hero Section */}
      <div className="text-center bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl p-12 text-white shadow-xl">
        <h1 className="text-5xl font-bold mb-4">
          🛡️ Compliance-First Credit Scoring
        </h1>
        <p className="text-xl mb-2 opacity-90">
          Transparent, Auditable, and Regulator-Ready
        </p>
        <p className="text-lg opacity-80 max-w-3xl mx-auto">
          Demonstrating live integrity with ownership anchors, RLS-backed APIs, 
          alternate credit scoring, and RiskSeal integration
        </p>
      </div>

      {/* Value Proposition */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Why Compliance-First Matters
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="text-4xl">🔒</div>
            <h3 className="text-xl font-semibold text-gray-900">
              Ownership Anchored
            </h3>
            <p className="text-gray-600">
              Every data point verified against ownership anchors with immutable audit trails
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">📊</div>
            <h3 className="text-xl font-semibold text-gray-900">
              Explainable Decisions
            </h3>
            <p className="text-gray-600">
              Complete transparency in credit scoring with factor-level explanations
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl">🌍</div>
            <h3 className="text-xl font-semibold text-gray-900">
              Financial Inclusion
            </h3>
            <p className="text-gray-600">
              Alternate scoring for thin-file users using local and behavioral data
            </p>
          </div>
        </div>
      </div>

      {/* Live Integrity Status */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Live Integrity Status
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : integrityStatus ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Orphan Records Tile */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600 mb-2">
                  {integrityStatus.orphan_records}
                </div>
                <div className="text-sm font-medium text-green-800 mb-1">
                  Orphan Records
                </div>
                <div className="text-xs text-green-600">
                  ✓ Zero orphans maintained
                </div>
              </div>
            </Card>

            {/* Latest Run ID Tile */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="text-center">
                <div className="text-lg font-mono font-bold text-blue-600 mb-2 break-all">
                  {integrityStatus.latest_run_id}
                </div>
                <div className="text-sm font-medium text-blue-800 mb-1">
                  Latest Run ID
                </div>
                <div className="text-xs text-blue-600">
                  {new Date(integrityStatus.last_verification).toLocaleString()}
                </div>
              </div>
            </Card>

            {/* Audit Entries Tile */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  {integrityStatus.audit_entries_30d.toLocaleString()}
                </div>
                <div className="text-sm font-medium text-purple-800 mb-1">
                  Audit Entries
                </div>
                <div className="text-xs text-purple-600">
                  Last 30 days
                </div>
              </div>
            </Card>

            {/* RLS Status Tile */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {integrityStatus.rls_status}
                </div>
                <div className="text-sm font-medium text-orange-800 mb-1">
                  RLS Policy Status
                </div>
                <div className="text-xs text-orange-600">
                  ✓ {integrityStatus.tables_checked} tables checked
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-gray-500">
          Last verification: {integrityStatus ? new Date(integrityStatus.last_verification).toLocaleString() : '...'}
        </div>
      </div>

      {/* How FactorA Blends Data */}
      <div className="bg-white rounded-xl p-8 shadow-soft">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          How FactorA Blends Global + Hyper-Local Data
        </h2>
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Traditional Credit Data
              </h3>
              <p className="text-gray-600">
                Payment history, transaction patterns, and established credit relationships
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏘️</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Hyper-Local Context
              </h3>
              <p className="text-gray-600">
                Remittance patterns, utility payments, microcredit history, and community-verified markers
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                RiskSeal Verification
              </h3>
              <p className="text-gray-600">
                Device consistency, identity matching, behavioral anomaly detection with confidence scoring
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action - Sandbox */}
      <Card className="text-center bg-gradient-to-r from-brand-primary to-brand-secondary text-white">
        <h2 className="text-3xl font-bold mb-4">
          Experience the Sandbox
        </h2>
        <p className="text-lg mb-6 opacity-90">
          Run read-only credit scoring simulations with your own parameters. 
          No data leaves your browser.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 bg-white text-brand-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors">
            Try the Sandbox →
          </button>
          <button className="px-8 py-3 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors border-2 border-white">
            View Documentation
          </button>
        </div>
      </Card>

      {/* Navigation to Other Pages */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-5xl">📊</div>
            <h3 className="text-xl font-semibold text-gray-900">
              Credit Structure
            </h3>
            <p className="text-gray-600">
              Explore the scoring model, factor weights, and decision pathways
            </p>
            <button className="text-brand-primary font-semibold hover:underline">
              Learn More →
            </button>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-5xl">🔐</div>
            <h3 className="text-xl font-semibold text-gray-900">
              RiskSeal Integration
            </h3>
            <p className="text-gray-600">
              See how risk signals enhance credit decisions with live examples
            </p>
            <button className="text-brand-primary font-semibold hover:underline">
              Explore Signals →
            </button>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center space-y-4">
            <div className="text-5xl">📋</div>
            <h3 className="text-xl font-semibold text-gray-900">
              Compliance & Audits
            </h3>
            <p className="text-gray-600">
              View audit trails, policy catalog, and integrity attestations
            </p>
            <button className="text-brand-primary font-semibold hover:underline">
              View Audits →
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShowcaseHome;
