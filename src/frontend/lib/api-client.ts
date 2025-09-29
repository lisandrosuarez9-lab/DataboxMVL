import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                   import.meta.env.NEXT_PUBLIC_API_URL || 
                   (supabaseUrl ? `${supabaseUrl}/functions/v1/api-v1` : '');

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Use anon key for public endpoints
      config.headers.apikey = supabaseAnonKey;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Credit Scoring API
export const creditScoringAPI = {
  // Compute credit score for a persona
  computeScore: async (personaId: string, data: any) => {
    const response = await apiClient.post(`/personas/${personaId}/score/compute`, data);
    return response.data;
  },

  // Get score explanation
  getScoreExplanation: async (personaId: string) => {
    const response = await apiClient.get(`/personas/${personaId}/score/explain`);
    return response.data;
  },

  // Get score trend over time
  getScoreTrend: async (personaId: string, months?: number) => {
    const params = months ? { months } : {};
    const response = await apiClient.get(`/personas/${personaId}/score/trend`, { params });
    return response.data;
  },

  // Get all personas
  getPersonas: async () => {
    const response = await apiClient.get('/personas');
    return response.data;
  },

  // Get KPIs
  getKPIs: async () => {
    const response = await apiClient.get('/kpis');
    return response.data;
  },

  // Get audit entries
  getAuditEntries: async () => {
    const response = await apiClient.get('/audit');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Simulate score changes
  simulateScore: async (personaId: string, changes: Record<string, any>) => {
    const response = await apiClient.post('/credit-score/simulate', {
      persona_id: personaId,
      ...changes
    });
    return response.data;
  },

  // Get model factors
  getModelFactors: async () => {
    const response = await apiClient.get('/models/factors');
    return response.data;
  },

  // Get risk bands
  getRiskBands: async () => {
    const response = await apiClient.get('/models/risk-bands');
    return response.data;
  }
};

// Connection status checker
export const checkAPIConnection = async (): Promise<{
  connected: boolean;
  url: string;
  responseTime?: number;
  error?: string;
  endpoints: Array<{
    path: string;
    status: 'success' | 'failure';
    responseTime: number;
    error?: string;
  }>;
}> => {
  const testEndpoints = ['/health', '/personas', '/kpis'];
  const results = [];
  
  const startTime = performance.now();
  
  for (const endpoint of testEndpoints) {
    const endpointStartTime = performance.now();
    try {
      await apiClient.get(endpoint, { timeout: 5000 });
      const responseTime = performance.now() - endpointStartTime;
      results.push({
        path: endpoint,
        status: 'success' as const,
        responseTime
      });
    } catch (error: any) {
      const responseTime = performance.now() - endpointStartTime;
      results.push({
        path: endpoint,
        status: 'failure' as const,
        responseTime,
        error: error.message
      });
    }
  }
  
  const totalTime = performance.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  
  return {
    connected: successCount > 0,
    url: API_BASE_URL,
    responseTime: totalTime,
    endpoints: results,
    error: successCount === 0 ? 'All endpoints failed' : undefined
  };
};