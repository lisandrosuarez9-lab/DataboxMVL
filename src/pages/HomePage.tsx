import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';

const HomePage: React.FC = () => {
  const protocolCards = [
    {
      title: '💰 Microcrédito Protocol',
      description: 'Credit evaluation and scoring system',
      icon: '💰',
      color: 'from-green-400 to-green-600',
    },
    {
      title: '👔 Empleo Protocol',
      description: 'Employment verification and tracking',
      icon: '👔',
      color: 'from-blue-400 to-blue-600',
    },
    {
      title: '💵 Ingreso Protocol',
      description: 'Income assessment and validation',
      icon: '💵',
      color: 'from-purple-400 to-purple-600',
    },
    {
      title: '🎓 Educación Protocol',
      description: 'Educational background verification',
      icon: '🎓',
      color: 'from-amber-400 to-amber-600',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-soft">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🛡️ DataboxMVL Sovereign Protocol Suite
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Identity-centric data injection with consent enforcement and comprehensive audit capabilities
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              📊 View Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              🔐 Access Control
            </Button>
          </Link>
        </div>
      </div>

      {/* Protocol Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {protocolCards.map((protocol) => (
          <Card
            key={protocol.title}
            className="relative overflow-hidden hover:scale-105 transition-transform duration-200"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${protocol.color} opacity-5`} />
            <div className="relative">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-3xl">{protocol.icon}</div>
                <h3 className="text-xl font-bold text-gray-900">
                  {protocol.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                {protocol.description}
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Real-time data processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Audit trail compliance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✓</span>
                  <span>Consent management</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Features Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <Card title="🔐 Security & Compliance">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Row Level Security (RLS)</h4>
                <p className="text-sm text-gray-600">Database-level access control for data protection</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Immutable Audit Records</h4>
                <p className="text-sm text-gray-600">Complete audit trail with retention compliance</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Role-based Access</h4>
                <p className="text-sm text-gray-600">Granular permissions for different user types</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="📊 Real-time Monitoring">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-xs">●</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Live Dashboard</h4>
                <p className="text-sm text-gray-600">Real-time persona flag monitoring and alerts</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-xs">●</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Performance Metrics</h4>
                <p className="text-sm text-gray-600">Query performance and system health monitoring</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-600 text-xs">●</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Data Synchronization</h4>
                <p className="text-sm text-gray-600">Real-time sync status and connection health</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Call to Action */}
      <Card className="text-center bg-gradient-to-r from-brand-primary to-brand-secondary text-white">
        <h2 className="text-2xl font-bold mb-4">Ready to explore the dashboard?</h2>
        <p className="mb-6 opacity-90">
          Monitor persona flags, view audit logs, and ensure compliance in real-time
        </p>
        <Link to="/dashboard">
          <Button variant="secondary" size="lg">
            Launch Dashboard →
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default HomePage;