import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/stores';
import { 
  TotalPersonasKPI, 
  FlaggedPersonasKPI, 
  AuditActivityKPI,
  PersonaTable,
  EnhancedAuditLogTable
} from '@/components/dashboard';
import { Card, Button, ConnectivityBanner, RoleBanner } from '@/components/ui';
import { useDashboardData, usePersonaExplanation } from '@/hooks/useAPI';
import { apiHelpers, apiClient } from '@/utils/api';
import { runFrontendSmokeTest } from '@/utils/verificationChecklist';
import { POLLING_INTERVALS } from '@/utils/pollingConfig';

const DashboardPage: React.FC = () => {
  const { currentUser } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Get current role from JWT (re-evaluated on every render)
  const currentRole = apiClient.getCurrentUserRole();

  // Redirect anonymous users to login
  useEffect(() => {
    if (apiClient.isAnonymous()) {
      console.warn('Anonymous user detected, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  // Use the dashboard data hook with proper polling intervals per requirements
  const {
    personas,
    auditEntries,
    kpis,
    connectivity,
    permissions,
    loading,
    error,
    refetchAll
  } = useDashboardData({
    autoRefresh: true,
    refreshInterval: POLLING_INTERVALS.KPIs // This will be overridden by specific intervals in the hook
  });

  // Hook for persona explanation
  const personaExplanation = usePersonaExplanation(selectedPersonaId);

  // Handle persona click to show explanation
  const handlePersonaClick = (persona: any) => {
    setSelectedPersonaId(persona.id);
    setShowExplanationModal(true);
    personaExplanation.fetchExplanation();
  };

  // Handle modal close
  const handleCloseExplanationModal = () => {
    setShowExplanationModal(false);
    setSelectedPersonaId(null);
  };

  // Handle smoke test execution
  const handleRunSmokeTest = async () => {
    console.log('🧪 Running Frontend Smoke Test...');
    try {
      const result = await runFrontendSmokeTest();
      
      const status = result.overall ? 'PASSED' : 'FAILED';
      const message = `Smoke Test ${status}: ${result.summary.passed}/${result.summary.total} checks passed`;
      
      alert(`${message}\n\nCheck browser console for detailed results.`);
    } catch (error) {
      console.error('Smoke test execution failed:', error);
      alert('Smoke test failed to execute. Check console for details.');
    }
  };

  // Early return for authentication check
  if (apiClient.isAnonymous()) {
    return null; // Let useEffect handle redirect
  }

  // Error state
  if (error && !kpis.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-secondary p-6">
        <Card className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-4">
            {apiHelpers.getErrorMessage(new Error(error))}
          </p>
          <div className="text-sm text-gray-500 mb-4">
            Timestamp: {new Date().toISOString()}
          </div>
          <Button onClick={refetchAll} loading={loading}>
            Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🛡️ Persona Flag Audit Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring and compliance tracking
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{currentUser?.role?.replace('_', ' ')}</span>
            </div>
            <div className="text-xs text-gray-500">
              {kpis.lastUpdated && `Last updated: ${apiHelpers.getTimeAgo(kpis.lastUpdated)}`}
            </div>
          </div>
        </div>

        {/* Role banner - shows role-specific information and restrictions */}
        <RoleBanner role={currentRole} />

        {/* Connectivity banner - shows backend connection status */}
        <ConnectivityBanner
          connected={connectivity.connected}
          lastHandshake={connectivity.lastHandshake}
          baseUrl={'baseUrl' in connectivity ? connectivity.baseUrl : 'Unknown'}
          version={'version' in connectivity ? connectivity.version : undefined}
          onRefresh={refetchAll}
          loading={loading}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <TotalPersonasKPI
          totalPersonas={kpis.data?.totalPersonas || 0}
          loading={kpis.loading}
          growthRate={kpis.data?.growthRate}
          onViewDetails={() => console.log('View persona details')}
        />
        
        <FlaggedPersonasKPI
          reviewNeeded={kpis.data?.flaggedPersonas || kpis.data?.reviewNeeded || 0}
          totalPersonas={kpis.data?.totalPersonas || 0}
          loading={kpis.loading}
          onViewFlagged={() => personas.refetch()}
        />
        
        <AuditActivityKPI
          auditEntries={kpis.data?.auditEntries || 0}
          loading={kpis.loading}
          dailyAverage={kpis.data?.dailyAverageActivity}
          onViewAudit={() => auditEntries.refetch()}
        />
      </div>

      {/* Database Overview */}
      <Card title="📊 Database Schema Overview" className="bg-white/95 backdrop-blur-sm mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Core Tables</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span><strong>public.personas</strong></span>
                <span className="text-gray-600">Main persona records</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span><strong>public.protocol_data</strong></span>
                <span className="text-gray-600">Injected protocol data</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span><strong>private.persona_flag_audit</strong></span>
                <span className="text-gray-600">Audit trail</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">🛡️ Compliance Features</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• All persona flag changes are automatically audited</li>
              <li>• Audit records are immutable and retention compliant</li>
              <li>• Role-based access control ensures data privacy</li>
              <li>• Real-time monitoring and alerting capabilities</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Enhanced Data Tables */}
      <div className="space-y-8">
        {/* Main Persona Table */}
        <Card title="🧑‍💼 Persona Management" subtitle="Comprehensive persona data with advanced filtering and sorting">
          {personas.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-800 font-medium">Failed to load personas</div>
              <div className="text-red-600 text-sm">{personas.error}</div>
              <Button 
                onClick={personas.refetch} 
                size="sm" 
                className="mt-2"
                loading={personas.loading}
              >
                Retry
              </Button>
            </div>
          )}
          
          {personas.data?.data && (
            <PersonaTable
              personas={personas.data.data}
              loading={personas.loading}
              onPersonaClick={handlePersonaClick}
              onPersonaSelect={(selectedIds) => console.log('Selected personas:', selectedIds)}
              onExport={(format, selectedRows) => console.log('Export:', format, selectedRows?.length)}
              enableInlineEdit={permissions.role === 'service_role'}
            />
          )}

          {!personas.loading && (!personas.data?.data || personas.data.data.length === 0) && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Personas Found</h3>
              <p className="text-gray-600 mb-4">
                There are no personas in the database or they may not be accessible with your current permissions.
              </p>
              <Button onClick={personas.refetch} loading={personas.loading}>
                Refresh Data
              </Button>
            </div>
          )}
        </Card>

        {/* Enhanced Audit Log */}
        <Card title="📋 Audit Trail" subtitle="Detailed audit log with change visualization and temporal grouping">
          {auditEntries.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-800 font-medium">Failed to load audit entries</div>
              <div className="text-red-600 text-sm">{auditEntries.error}</div>
              <Button 
                onClick={auditEntries.refetch} 
                size="sm" 
                className="mt-2"
                loading={auditEntries.loading}
              >
                Retry
              </Button>
            </div>
          )}

          {auditEntries.data?.data && (
            <EnhancedAuditLogTable
              entries={auditEntries.data.data}
              loading={auditEntries.loading}
              onEntryClick={(entry) => console.log('View audit entry:', entry.audit_id)}
              onExport={(format, selectedRows) => console.log('Export audit:', format, selectedRows?.length)}
            />
          )}

          {!auditEntries.loading && (!auditEntries.data?.data || auditEntries.data.data.length === 0) && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Entries Found</h3>
              <p className="text-gray-600 mb-4">
                There are no audit entries to display. This could indicate that audit infrastructure is not yet configured.
              </p>
              <Button onClick={auditEntries.refetch} loading={auditEntries.loading}>
                Refresh Data
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Connection Status - Real connectivity info */}
      <Card title="🔗 Connection Status" className="bg-white/95 backdrop-blur-sm mt-8">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`text-center p-4 ${connectivity.connected ? 'bg-green-50' : 'bg-red-50'} rounded-lg`}>
            <div className="text-2xl mb-2">{connectivity.connected ? '📡' : '📵'}</div>
            <div className={`font-medium ${connectivity.connected ? 'text-green-800' : 'text-red-800'}`}>
              Backend API
            </div>
            <div className={`text-sm ${connectivity.connected ? 'text-green-600' : 'text-red-600'}`}>
              {connectivity.connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">🔄</div>
            <div className="font-medium text-blue-800">Auto-refresh</div>
            <div className="text-sm text-blue-600">Every 30s</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🔐</div>
            <div className="font-medium text-purple-800">Authentication</div>
            <div className="text-sm text-purple-600">
              {currentRole ? `${currentRole.replace('_', ' ')} Active` : 'Anonymous'}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-medium text-green-800">Data Freshness</div>
            <div className="text-sm text-green-600">
              Polling: {POLLING_INTERVALS.KPIs/1000}s
            </div>
          </div>
        </div>

        {/* Verification Controls */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h4 className="font-medium text-gray-900">Verification & Testing</h4>
              <p className="text-sm text-gray-600">
                Run verification checks to ensure all frontend mandate requirements are met
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleRunSmokeTest}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
              >
                <span>🧪</span>
                <span>Run Smoke Test</span>
              </Button>
              <Button
                onClick={refetchAll}
                variant="primary"
                size="sm"
                loading={loading}
                className="flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Refresh All Data</span>
              </Button>
            </div>
          </div>

          {/* Deployment Information */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Deployment Target:</strong><br />
                <a 
                  href="https://lisandrosuarez9-lab.github.io/DataboxMVL/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  https://lisandrosuarez9-lab.github.io/DataboxMVL/dashboard
                </a>
              </div>
              <div>
                <strong>Last Deployment:</strong><br />
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Persona Explanation Modal */}
      {showExplanationModal && selectedPersonaId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Credit Score Explanation
                </h2>
                <button
                  onClick={handleCloseExplanationModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 mt-1">
                Persona ID: {selectedPersonaId}
              </p>
            </div>
            
            <div className="p-6">
              {personaExplanation.loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading explanation...</p>
                </div>
              )}

              {personaExplanation.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium">Failed to load explanation</div>
                  <div className="text-red-600 text-sm">{personaExplanation.error}</div>
                  <Button 
                    onClick={personaExplanation.fetchExplanation} 
                    size="sm" 
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {personaExplanation.data && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Score Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Score:</span>
                        <span className="ml-2 font-medium">{personaExplanation.data.score || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Computed At:</span>
                        <span className="ml-2 font-medium">
                          {personaExplanation.data.computed_at 
                            ? apiHelpers.formatTimestamp(personaExplanation.data.computed_at)
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Explanation JSON</h3>
                    <pre className="text-xs bg-white border rounded p-3 overflow-x-auto">
                      {JSON.stringify(personaExplanation.data.explanation || personaExplanation.data, null, 2)}
                    </pre>
                  </div>

                  {personaExplanation.lastUpdated && (
                    <div className="text-xs text-gray-500 text-center">
                      Retrieved: {apiHelpers.formatTimestamp(personaExplanation.lastUpdated)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;