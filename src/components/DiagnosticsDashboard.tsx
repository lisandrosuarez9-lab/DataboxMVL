/**
 * Diagnostics Dashboard Component
 * 
 * Implements the comprehensive diagnostics dashboard as specified in
 * DIAGNOSTIC LAYER 4 of the troubleshooting protocol.
 */

import React, { useState, useEffect } from 'react';
import { 
  generateEndpointReport, 
  testAuthenticationFlow,
  getEnvironmentConfig
} from '../lib/endpoint-checker';
import { 
  generateEnvironmentReport,
  validateRequiredEnvVars,
  getEnvironmentInfo
} from '../lib/env-validator';
import {
  enableAPIDebugging,
  disableAPIDebugging,
  isAPIDebuggingEnabled,
  getCombinedLogs,
  clearLogs,
  generateDebuggingReport
} from '../lib/api-debug';
import {
  generateValidationReport,
  getValidationStats
} from '../lib/api-validators';

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error' | 'running';
  message: string;
  details?: any;
  timestamp: string;
  duration?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  role?: string;
  expiresAt?: string;
  user?: {
    email?: string;
    id?: string;
  };
}

export const DiagnosticsDashboard: React.FC = () => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'environment' | 'debugging' | 'validation'>('overview');

  // Simulate Supabase client - in real implementation, this would come from your auth provider
  const getAuthSession = async (): Promise<AuthState> => {
    // This is a mock implementation - replace with actual Supabase auth
    const mockToken = localStorage.getItem('auth_token') || 
                     sessionStorage.getItem('auth_token');
    
    if (mockToken) {
      try {
        // Simple JWT decode (in production, use proper JWT library)
        const parts = mockToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          return {
            isAuthenticated: true,
            token: mockToken,
            role: payload.role || 'unknown',
            expiresAt: new Date(payload.exp * 1000).toISOString(),
            user: {
              email: payload.email,
              id: payload.sub
            }
          };
        }
      } catch (error) {
        console.warn('Failed to decode JWT token:', error);
      }
    }

    // Return mock auth state for development
    return {
      isAuthenticated: import.meta.env.DEV,
      role: import.meta.env.DEV ? 'service_role' : undefined,
      user: import.meta.env.DEV ? { email: 'dev@example.com' } : undefined
    };
  };

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    setResults([]);
    
    const startTime = Date.now();
    const newResults: DiagnosticResult[] = [];

    try {
      // 1. Environment Configuration Check
      newResults.push({
        category: 'Environment',
        status: 'running',
        message: 'Checking environment configuration...',
        timestamp: new Date().toISOString()
      });

      const envValidation = validateRequiredEnvVars();
      const envInfo = getEnvironmentInfo();
      
      newResults[newResults.length - 1] = {
        category: 'Environment',
        status: envValidation.isValid ? 'success' : 'error',
        message: envValidation.isValid 
          ? `Environment configuration valid (${envInfo.framework})`
          : `Environment configuration invalid: ${envValidation.missingVars.length} missing, ${Object.keys(envValidation.malformedVars).length} malformed`,
        details: {
          validation: envValidation,
          info: envInfo
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      // 2. Authentication State Check
      const authStartTime = Date.now();
      newResults.push({
        category: 'Authentication',
        status: 'running',
        message: 'Checking authentication state...',
        timestamp: new Date().toISOString()
      });

      const sessionData = await getAuthSession();
      setAuthState(sessionData);

      newResults[newResults.length - 1] = {
        category: 'Authentication',
        status: sessionData.isAuthenticated ? 'success' : 'warning',
        message: sessionData.isAuthenticated 
          ? `Authenticated as ${sessionData.role} (${sessionData.user?.email})`
          : 'Not authenticated - using development mode',
        details: sessionData,
        timestamp: new Date().toISOString(),
        duration: Date.now() - authStartTime
      };

      // 3. API Endpoint Health Check
      const endpointStartTime = Date.now();
      newResults.push({
        category: 'Endpoints',
        status: 'running',
        message: 'Testing API endpoints...',
        timestamp: new Date().toISOString()
      });

      const envConfig = getEnvironmentConfig();
      const baseUrl = envConfig.VITE_API_URL || 
                     envConfig.NEXT_PUBLIC_API_URL ||
                     (envConfig.VITE_SUPABASE_URL ? `${envConfig.VITE_SUPABASE_URL}/functions/v1/api-v1` : null) ||
                     (envConfig.NEXT_PUBLIC_SUPABASE_URL ? `${envConfig.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-v1` : null);

      if (baseUrl) {
        const authTest = await testAuthenticationFlow(baseUrl, sessionData.token);
        
        newResults[newResults.length - 1] = {
          category: 'Endpoints',
          status: authTest.endpointsAccessible > 0 ? 'success' : 'error',
          message: `${authTest.endpointsAccessible}/${authTest.totalEndpoints} endpoints accessible`,
          details: {
            authTest,
            baseUrl,
            errors: authTest.errors
          },
          timestamp: new Date().toISOString(),
          duration: Date.now() - endpointStartTime
        };
      } else {
        newResults[newResults.length - 1] = {
          category: 'Endpoints',
          status: 'error',
          message: 'No API base URL configured',
          details: { envConfig },
          timestamp: new Date().toISOString(),
          duration: Date.now() - endpointStartTime
        };
      }

      // 4. API Debugging Status
      newResults.push({
        category: 'Debugging',
        status: isAPIDebuggingEnabled() ? 'success' : 'warning',
        message: isAPIDebuggingEnabled() 
          ? 'API debugging enabled - requests are being logged'
          : 'API debugging disabled',
        details: {
          enabled: isAPIDebuggingEnabled(),
          logs: getCombinedLogs().length
        },
        timestamp: new Date().toISOString()
      });

      // 5. Validation Statistics
      const validationStats = getValidationStats();
      newResults.push({
        category: 'Validation',
        status: validationStats.total === 0 ? 'warning' : 
                validationStats.failed === 0 ? 'success' : 'error',
        message: validationStats.total === 0 
          ? 'No API responses validated yet'
          : `${validationStats.successful}/${validationStats.total} responses valid`,
        details: validationStats,
        timestamp: new Date().toISOString()
      });

      setResults(newResults);

    } catch (error: any) {
      newResults.push({
        category: 'System',
        status: 'error',
        message: `Diagnostics failed: ${error.message}`,
        details: { error: error.stack },
        timestamp: new Date().toISOString()
      });
      setResults(newResults);
    } finally {
      setIsRunningTests(false);
    }
  };

  const toggleResultExpansion = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const exportReports = async () => {
    const reports = {
      environment: generateEnvironmentReport(),
      endpoints: await generateEndpointReport(),
      debugging: generateDebuggingReport(),
      validation: generateValidationReport(),
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(reports, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `diagnostics-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  useEffect(() => {
    // Auto-run diagnostics on component mount
    runDiagnostics();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  🔍 API Diagnostics Dashboard
                </h1>
                <p className="text-gray-600">
                  Frontend-Backend Integration Troubleshooting Protocol
                </p>
                {authState && (
                  <div className="mt-2 text-sm text-gray-500">
                    {authState.isAuthenticated ? (
                      <span className="text-green-600">
                        ✅ Authenticated as {authState.role} ({authState.user?.email})
                      </span>
                    ) : (
                      <span className="text-yellow-600">
                        ⚠️ Not authenticated (development mode)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={runDiagnostics}
                  disabled={isRunningTests}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunningTests ? '⏳ Running...' : '🔄 Run Diagnostics'}
                </button>
                <button
                  onClick={exportReports}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📥 Export Reports
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'endpoints', label: 'Endpoints', icon: '🌐' },
                { id: 'environment', label: 'Environment', icon: '⚙️' },
                { id: 'debugging', label: 'Debug Logs', icon: '🐛' },
                { id: 'validation', label: 'Validation', icon: '✅' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
                {results.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No diagnostics run yet. Click "Run Diagnostics" to start.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${getStatusColor(result.status)}`}
                        onClick={() => toggleResultExpansion(index)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getStatusIcon(result.status)}</span>
                              <span className="font-medium">{result.category}</span>
                              {result.duration && (
                                <span className="text-xs text-gray-500">
                                  ({result.duration}ms)
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm">{result.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(result.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {expandedResults.has(index) ? '▼' : '▶'}
                          </span>
                        </div>
                        
                        {expandedResults.has(index) && result.details && (
                          <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'debugging' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">API Debug Logs</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={isAPIDebuggingEnabled() ? disableAPIDebugging : enableAPIDebugging}
                      className={`px-3 py-1 rounded text-sm ${
                        isAPIDebuggingEnabled()
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isAPIDebuggingEnabled() ? '🛑 Disable' : '🟢 Enable'} Debug Logging
                    </button>
                    <button
                      onClick={clearLogs}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      🧹 Clear Logs
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto">
                  {getCombinedLogs().length === 0 ? (
                    <p>No API requests logged yet. Enable debugging and make some API calls.</p>
                  ) : (
                    getCombinedLogs().map((log, index) => (
                      <div key={index} className="mb-4 border-b border-gray-700 pb-2">
                        <div className="text-blue-400">
                          {log.request.method} {log.request.url}
                        </div>
                        <div className="text-xs text-gray-400">
                          {log.request.timestamp}
                        </div>
                        {log.response && (
                          <div className={log.response.status >= 400 ? 'text-red-400' : 'text-green-400'}>
                            → {log.response.status} {log.response.statusText} ({log.response.responseTime.toFixed(2)}ms)
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Add more tab content as needed */}
          </div>
        </div>
      </div>
    </div>
  );
};