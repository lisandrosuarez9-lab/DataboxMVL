import { useState, useEffect, useCallback } from 'react';
import { apiClient, apiHelpers } from '@/utils/api';
import { Persona, AuditEntry, DashboardMetrics, PaginatedResponse } from '@/types';

// Generic API hook with loading, error, and data states
export interface UseAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: string | null;
}

// Hook for fetching personas
export function usePersonas(params: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  flagged?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) {
  const [data, setData] = useState<PaginatedResponse<Persona> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getPersonas(params);
      setData(result);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMessage = apiHelpers.getErrorMessage(err as Error);
      setError(errorMessage);
      console.error('Failed to fetch personas:', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (params.autoRefresh && params.refreshInterval) {
      const interval = setInterval(fetchData, params.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [params.autoRefresh, params.refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}

// Hook for fetching a single persona
export function usePersona(personaId: string | null) {
  const [data, setData] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!personaId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getPersonas({ personaId });
      setData(result.data[0] || null);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMessage = apiHelpers.getErrorMessage(err as Error);
      setError(errorMessage);
      console.error('Failed to fetch persona:', err);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}

// Hook for fetching persona explanation
export function usePersonaExplanation(personaId: string | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!personaId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getPersonaExplanation(personaId);
      setData(result);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMessage = apiHelpers.getErrorMessage(err as Error);
      setError(errorMessage);
      console.error('Failed to fetch persona explanation:', err);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  // Don't auto-fetch on mount - this should be triggered manually
  const fetchExplanation = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    fetchExplanation,
    lastUpdated
  };
}

// Hook for fetching audit entries
export function useAuditEntries(params: {
  page?: number;
  limit?: number;
  personaId?: string;
  changedBy?: string;
  startDate?: string;
  endDate?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) {
  const [data, setData] = useState<PaginatedResponse<AuditEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getAuditEntries(params);
      setData(result);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMessage = apiHelpers.getErrorMessage(err as Error);
      setError(errorMessage);
      console.error('Failed to fetch audit entries:', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (params.autoRefresh && params.refreshInterval) {
      const interval = setInterval(fetchData, params.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [params.autoRefresh, params.refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}

// Hook for fetching KPIs
export function useKPIs(params: {
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.getKPIs();
      setData(result);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      const errorMessage = apiHelpers.getErrorMessage(err as Error);
      setError(errorMessage);
      console.error('Failed to fetch KPIs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (params.autoRefresh && params.refreshInterval) {
      const interval = setInterval(fetchData, params.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [params.autoRefresh, params.refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}

// Hook for connectivity status
export function useConnectivityStatus(checkInterval: number = 30000) {
  const [status, setStatus] = useState<{
    connected: boolean;
    lastHandshake: string;
    version?: string;
  }>({
    connected: false,
    lastHandshake: new Date().toISOString()
  });

  const checkConnectivity = useCallback(async () => {
    try {
      const result = await apiClient.getConnectivityStatus();
      setStatus(result);
    } catch (err) {
      setStatus({
        connected: false,
        lastHandshake: new Date().toISOString()
      });
    }
  }, []);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, checkInterval);
    return () => clearInterval(interval);
  }, [checkConnectivity, checkInterval]);

  return status;
}

// Hook for role-based permissions
export function usePermissions() {
  const [role, setRole] = useState<'compliance' | 'service_role' | null>(null);
  const [permissions, setPermissions] = useState<{
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }>({
    canRead: false,
    canWrite: false,
    canDelete: false
  });

  useEffect(() => {
    const currentRole = apiClient.getCurrentUserRole();
    setRole(currentRole);
    
    setPermissions({
      canRead: apiHelpers.canPerformAction('read'),
      canWrite: apiHelpers.canPerformAction('write'),
      canDelete: apiHelpers.canPerformAction('delete')
    });
  }, []);

  // Re-check permissions when JWT might have changed
  const refreshPermissions = useCallback(() => {
    const currentRole = apiClient.getCurrentUserRole();
    setRole(currentRole);
    
    setPermissions({
      canRead: apiHelpers.canPerformAction('read'),
      canWrite: apiHelpers.canPerformAction('write'),
      canDelete: apiHelpers.canPerformAction('delete')
    });
  }, []);

  return {
    role,
    permissions,
    refreshPermissions
  };
}

// Hook for running smoke tests
export function useSmokeTest() {
  const [results, setResults] = useState<{
    personas: boolean;
    audit: boolean;
    kpis: boolean;
    explain: boolean;
    errors: string[];
  } | null>(null);
  const [running, setRunning] = useState(false);

  const runTest = useCallback(async () => {
    try {
      setRunning(true);
      const testResults = await apiClient.runSmokeTest();
      setResults(testResults);
    } catch (err) {
      console.error('Smoke test failed:', err);
      setResults({
        personas: false,
        audit: false,
        kpis: false,
        explain: false,
        errors: ['Failed to run smoke test: ' + (err instanceof Error ? err.message : 'Unknown error')]
      });
    } finally {
      setRunning(false);
    }
  }, []);

  return {
    results,
    running,
    runTest
  };
}

// Composite hook for dashboard data
export function useDashboardData(params: {
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) {
  const personas = usePersonas({
    limit: 25,
    sortBy: 'created_at',
    sortOrder: 'desc',
    autoRefresh: params.autoRefresh,
    refreshInterval: params.refreshInterval
  });

  const auditEntries = useAuditEntries({
    limit: 25,
    autoRefresh: params.autoRefresh,
    refreshInterval: params.refreshInterval
  });

  const kpis = useKPIs({
    autoRefresh: params.autoRefresh,
    refreshInterval: params.refreshInterval
  });

  const connectivity = useConnectivityStatus();
  const permissions = usePermissions();

  const loading = personas.loading || auditEntries.loading || kpis.loading;
  const error = personas.error || auditEntries.error || kpis.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      personas.refetch(),
      auditEntries.refetch(),
      kpis.refetch()
    ]);
  }, [personas.refetch, auditEntries.refetch, kpis.refetch]);

  return {
    personas,
    auditEntries,
    kpis,
    connectivity,
    permissions,
    loading,
    error,
    refetchAll
  };
}

export default {
  usePersonas,
  usePersona,
  usePersonaExplanation,
  useAuditEntries,
  useKPIs,
  useConnectivityStatus,
  usePermissions,
  useSmokeTest,
  useDashboardData
};