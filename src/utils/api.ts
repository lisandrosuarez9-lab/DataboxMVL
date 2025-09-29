import { Persona, AuditEntry, DashboardMetrics, ApiResponse, PaginatedResponse } from '@/types';
import { validateAPIResponseWithStats } from '../lib/api-validators';
import { getEnvironmentConfig } from '../lib/endpoint-checker';
import { validateRequiredEnvVars } from '../lib/env-validator';

// JWT decoding utility
interface JWTPayload {
  sub: string;
  email?: string;
  role?: 'compliance' | 'service_role';
  exp: number;
  iat: number;
}

// API Configuration - Enhanced with environment detection
const getAPIConfig = () => {
  const envConfig = getEnvironmentConfig();
  
  // Priority: explicit API URL > constructed from Supabase URL > fallback
  const baseUrl = envConfig.VITE_API_URL || 
                 envConfig.NEXT_PUBLIC_API_URL ||
                 (envConfig.VITE_SUPABASE_URL ? `${envConfig.VITE_SUPABASE_URL}/functions/v1/api-v1` : null) ||
                 (envConfig.NEXT_PUBLIC_SUPABASE_URL ? `${envConfig.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-v1` : null) ||
                 'https://your-project.supabase.co/functions/v1/api-v1';

  return {
    baseUrl,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  };
};

const API_CONFIG = getAPIConfig();

// Exact endpoint definitions with expected shapes
const ENDPOINTS = {
  PERSONAS_LIST: '/personas',
  PERSONA_EXPLAIN: '/personas/explain',
  PERSONA_TREND: '/personas/trend', 
  AUDIT_LIST: '/audit',
  KPIS: '/kpis',
  SIMULATION: '/simulation',
  TOGGLE_FLAG: '/personas/toggle-flag',
  HEALTH: '/health'
} as const;

// Expected response shapes for validation
const EXPECTED_SHAPES = {
  PERSONAS: ['id', 'nombre', 'documento_id', 'user_id_review_needed', 'is_test', 'created_at'],
  PERSONA_EXPLAIN: ['score', 'explanation', 'computed_at'],
  AUDIT: ['audit_id', 'persona_id', 'field_name', 'old_value', 'new_value', 'changed_by', 'changed_at'],
  KPIS: ['totalPersonas', 'flaggedPersonas', 'auditEntries', 'lastUpdated'],
  SIMULATION: ['simulated_score', 'explanation', 'computed_at_simulation'],
  TOGGLE_RESULT: ['success', 'audit_id', 'timestamp']
};

// HTTP Client class with JWT authentication and error handling
class APIClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config = API_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
    this.retryDelay = config.retryDelay;
  }

  // Get JWT token from localStorage or Redux store - secure handling
  private getJWTToken(): string | null {
    // Try multiple sources for JWT token
    const sources = [
      () => localStorage.getItem('auth_token'),
      () => sessionStorage.getItem('auth_token'),
      () => {
        // Try to get from Redux store if available
        const store = (window as any).__REDUX_STORE__;
        return store && store.getState()?.user?.token;
      }
    ];

    for (const getToken of sources) {
      try {
        const token = getToken();
        if (token && this.validateJWTFormat(token)) {
          return token;
        }
      } catch (error) {
        console.warn('Error accessing token source:', error);
      }
    }

    // Only use mock JWT in development mode
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock JWT for development');
      return this.createMockJWT();
    }

    return null;
  }

  // Validate JWT format without decoding
  private validateJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Create a mock JWT for testing
  private createMockJWT(): string {
    // This is a simplified mock JWT - in production, you'd get this from Supabase Auth
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: '12345678-1234-1234-1234-123456789012',
      email: 'test@example.com',
      role: 'compliance',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
      iat: Math.floor(Date.now() / 1000)
    }));
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  }

  // Decode JWT to extract role and user info
  public decodeJWT(token?: string): JWTPayload | null {
    try {
      const tokenToUse = token || this.getJWTToken();
      if (!tokenToUse) return null;

      const parts = tokenToUse.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        console.warn('JWT token is expired');
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }

  // Get current user role from JWT - re-evaluates on every call
  public getCurrentUserRole(): 'compliance' | 'service_role' | null {
    const payload = this.decodeJWT();
    if (!payload) return null;
    
    // Re-validate token expiration on every call
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn('JWT token expired, clearing token');
      this.clearStoredTokens();
      return null;
    }
    
    return payload?.role || null;
  }

  // Clear all stored tokens
  private clearStoredTokens(): void {
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch (error) {
      console.warn('Error clearing stored tokens:', error);
    }
  }

  // Deterministic role check API
  public isCompliance(): boolean {
    return this.getCurrentUserRole() === 'compliance';
  }

  public isServiceRole(): boolean {
    return this.getCurrentUserRole() === 'service_role';
  }

  public isAnonymous(): boolean {
    return this.getCurrentUserRole() === null;
  }

  // Validate response shape against expected keys
  private validateResponseShape<T>(data: any, expectedKeys: string[]): data is T {
    if (!data || typeof data !== 'object') return false;
    
    return expectedKeys.every(key => {
      const keyPath = key.split('.');
      let current = data;
      
      for (const pathKey of keyPath) {
        if (current === null || current === undefined || !(pathKey in current)) {
          return false;
        }
        current = current[pathKey];
      }
      
      return true;
    });
  }

  // Main HTTP request method with retry logic
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    expectedKeys: string[] = []
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getJWTToken();

    if (!token) {
      throw new Error('Authentication required - no JWT token available');
    }

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Authentication failed - invalid or expired token');
        }

        if (response.status === 403) {
          throw new Error('Access forbidden - insufficient permissions');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 
            errorData.error || 
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        // Enhanced validation using new API contract validators
        if (expectedKeys.length > 0) {
          // Legacy shape validation for backward compatibility
          if (data.data && !this.validateResponseShape(data.data, expectedKeys)) {
            console.warn('Legacy response shape validation failed for:', endpoint, expectedKeys);
          }
          
          // New contract validation with statistics tracking
          const endpointType = this.getEndpointType(endpoint);
          if (endpointType) {
            const validation = validateAPIResponseWithStats(data.data || data, endpointType);
            if (!validation.valid) {
              console.warn('API contract validation failed for:', endpoint, {
                type: endpointType,
                errors: validation.errors,
                warnings: validation.warnings
              });
              
              // Log validation failure for monitoring
              this.logUIEvent('api_validation_failure', {
                endpoint,
                type: endpointType,
                errors: validation.errors,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        // Log successful API call for verification
        this.logUIEvent('api_success', {
          endpoint,
          timestamp: new Date().toISOString(),
          responseChecksum: this.calculateChecksum(JSON.stringify(data)),
          attempt
        });

        return data;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication/authorization errors
        if (error instanceof Error && 
            (error.message.includes('Authentication') || error.message.includes('forbidden'))) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError!;
  }

  // Determine endpoint type for validation
  private getEndpointType(endpoint: string): string | null {
    if (endpoint.includes('/personas/explain')) return 'score_response';
    if (endpoint.includes('/personas/trend')) return 'score_trend';
    if (endpoint.includes('/personas')) return 'persona_list';
    if (endpoint.includes('/audit')) return 'audit_entries';
    if (endpoint.includes('/kpis')) return 'dashboard_kpis';
    if (endpoint.includes('/simulation')) return 'simulation_result';
    if (endpoint.includes('/toggle-flag')) return 'toggle_result';
    if (endpoint.includes('/health')) return 'health_check';
    return null;
  }

  // Calculate simple checksum for response verification
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Log immutable UI events for verification
  private logUIEvent(event: string, data: any): void {
    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.info('🔒 IMMUTABLE UI EVENT:', JSON.stringify(logEntry));
    
    // In production, you might also send this to a logging service
  }

  // Get personas with pagination and filtering
  public async getPersonas(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    flagged?: boolean;
    personaId?: string;
  } = {}): Promise<PaginatedResponse<Persona>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.flagged !== undefined) queryParams.set('flagged', params.flagged.toString());
    if (params.personaId) queryParams.set('persona_id', params.personaId);

    const expectedKeys = [
      'id', 'user_id_review_needed', 'is_test', 'nombre', 
      'documento_id', 'created_at'
    ];

    const response = await this.request<ApiResponse<Persona[]>>(
      `/personas?${queryParams.toString()}`,
      { method: 'GET' },
      expectedKeys
    );

    if (params.personaId) {
      // Single persona request
      return {
        data: Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []),
        pagination: {
          page: 1,
          limit: 1,
          total: response.data ? 1 : 0,
          totalPages: 1
        }
      };
    }

    return {
      data: response.data || [],
      pagination: (response as any).pagination || {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0
      }
    };
  }

  // Get persona credit score explanation
  public async getPersonaExplanation(personaId: string): Promise<any> {
    const response = await this.request<ApiResponse<any>>(
      `/personas/explain?persona_id=${personaId}`,
      { method: 'GET' }
    );

    return response.data;
  }

  // Get audit entries with filtering
  public async getAuditEntries(params: {
    page?: number;
    limit?: number;
    personaId?: string;
    changedBy?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedResponse<AuditEntry>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.personaId) queryParams.set('persona_id', params.personaId);
    if (params.changedBy) queryParams.set('changed_by', params.changedBy);
    if (params.startDate) queryParams.set('start_date', params.startDate);
    if (params.endDate) queryParams.set('end_date', params.endDate);

    const expectedKeys = [
      'audit_id', 'persona_id', 'field_name', 'old_value', 
      'new_value', 'changed_by', 'changed_at'
    ];

    const response = await this.request<ApiResponse<AuditEntry[]>>(
      `/audit?${queryParams.toString()}`,
      { method: 'GET' },
      expectedKeys
    );

    return {
      data: response.data || [],
      pagination: (response as any).pagination || {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0
      }
    };
  }

  // Get KPI metrics
  public async getKPIs(): Promise<DashboardMetrics> {
    const response = await this.request<ApiResponse<DashboardMetrics>>(
      '/kpis',
      { method: 'GET' },
      ['totalPersonas', 'flaggedPersonas', 'auditEntries', 'lastUpdated']
    );

    return response.data;
  }

  // Get connectivity status with actual health check and environment validation
  public async getConnectivityStatus(): Promise<{
    connected: boolean;
    lastHandshake: string;
    baseUrl: string;
    responseTime?: number;
    error?: string;
    authenticated: boolean;
    userRole?: string;
    environmentValid: boolean;
    environmentIssues: string[];
    version?: string;
  }> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    
    // Validate environment configuration
    const envValidation = validateRequiredEnvVars();
    
    try {
      // Perform minimal health call (HEAD request to avoid response payload)
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.getJWTToken() || 'anonymous'}`
        },
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = performance.now() - startTime;
      const connected = response.status >= 200 && response.status < 300;
      
      this.logUIEvent('connectivity_check', {
        endpoint: '/health',
        status: response.status,
        connected,
        responseTime,
        timestamp
      });

      return {
        connected,
        lastHandshake: timestamp,
        baseUrl: this.baseUrl,
        responseTime,
        authenticated: !!this.getJWTToken(),
        userRole: this.getCurrentUserRole() || undefined,
        environmentValid: envValidation.isValid,
        environmentIssues: [
          ...envValidation.missingVars.map(v => `Missing: ${v}`),
          ...Object.entries(envValidation.malformedVars).map(([k, v]) => `${k}: ${v}`),
          ...envValidation.warnings
        ],
        version: response.headers.get('x-api-version') || '1.0.0'
      };
    } catch (error) {
      // Fallback to KPIs endpoint if health endpoint not available
      try {
        const responseTime = performance.now() - startTime;
        await this.getKPIs();
        return {
          connected: true,
          lastHandshake: timestamp,
          baseUrl: this.baseUrl,
          responseTime,
          authenticated: !!this.getJWTToken(),
          userRole: this.getCurrentUserRole() || undefined,
          environmentValid: envValidation.isValid,
          environmentIssues: [
            ...envValidation.missingVars.map(v => `Missing: ${v}`),
            ...Object.entries(envValidation.malformedVars).map(([k, v]) => `${k}: ${v}`),
            ...envValidation.warnings
          ],
          version: '1.0.0'
        };
      } catch (fallbackError) {
        const responseTime = performance.now() - startTime;
        
        this.logUIEvent('connectivity_check', {
          endpoint: '/health',
          error: error instanceof Error ? error.message : 'Unknown error',
          connected: false,
          responseTime,
          timestamp
        });

        return {
          connected: false,
          lastHandshake: timestamp,
          baseUrl: this.baseUrl,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          authenticated: !!this.getJWTToken(),
          userRole: this.getCurrentUserRole() || undefined,
          environmentValid: envValidation.isValid,
          environmentIssues: [
            ...envValidation.missingVars.map(v => `Missing: ${v}`),
            ...Object.entries(envValidation.malformedVars).map(([k, v]) => `${k}: ${v}`),
            ...envValidation.warnings
          ]
        };
      }
    }
  }

  // Toggle flag action - uses secure RPC endpoint
  public async togglePersonaFlag(personaId: string, flagValue: boolean): Promise<{
    success: boolean;
    audit_id?: string;
    timestamp: string;
    message?: string;
  }> {
    // Ensure only service_role can perform toggle actions
    if (!this.isServiceRole()) {
      throw new Error('Access denied: Only service_role can toggle persona flags');
    }

    const response = await this.request<ApiResponse<any>>(
      ENDPOINTS.TOGGLE_FLAG,
      {
        method: 'POST',
        body: JSON.stringify({
          persona_id: personaId,
          user_id_review_needed: flagValue
        })
      },
      EXPECTED_SHAPES.TOGGLE_RESULT
    );

    return {
      success: response.data.success,
      audit_id: response.data.audit_id,
      timestamp: new Date().toISOString(),
      message: response.data.message
    };
  }

  // Verify audit entry creation after toggle
  public async verifyAuditEntry(auditId: string, timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const auditResponse = await this.getAuditEntries({ limit: 50 });
        const auditEntry = auditResponse.data.find(entry => entry.audit_id === auditId);
        
        if (auditEntry) {
          this.logUIEvent('audit_verification_success', {
            audit_id: auditId,
            verified_at: new Date().toISOString()
          });
          return true;
        }
        
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn('Audit verification check failed:', error);
      }
    }
    
    this.logUIEvent('audit_verification_timeout', {
      audit_id: auditId,
      timeout_ms: timeoutMs,
      timestamp: new Date().toISOString()
    });
    
    return false;
  }

  // Scenario simulation endpoint
  public async simulateScore(personaId: string, overrides: Record<string, any>): Promise<{
    simulated_score: number;
    explanation: any;
    computed_at_simulation: string;
    original_score?: number;
  }> {
    // Only service_role and compliance can run simulations per requirements
    const role = this.getCurrentUserRole();
    if (!role || (role !== 'service_role' && role !== 'compliance')) {
      throw new Error('Access denied: Only service_role or compliance can run simulations');
    }

    const response = await this.request<ApiResponse<any>>(
      ENDPOINTS.SIMULATION,
      {
        method: 'POST',
        body: JSON.stringify({
          persona_id: personaId,
          overrides,
          simulation_only: true
        })
      },
      EXPECTED_SHAPES.SIMULATION
    );

    return {
      ...response.data,
      computed_at_simulation: new Date().toISOString()
    };
  }

  public async runSmokeTest(): Promise<{
    personas: boolean;
    audit: boolean;
    kpis: boolean;
    explain: boolean;
    errors: string[];
  }> {
    const results = {
      personas: false,
      audit: false,
      kpis: false,
      explain: false,
      errors: [] as string[]
    };

    try {
      await this.getPersonas({ limit: 1 });
      results.personas = true;
    } catch (error) {
      results.errors.push(`Personas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await this.getAuditEntries({ limit: 1 });
      results.audit = true;
    } catch (error) {
      results.errors.push(`Audit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await this.getKPIs();
      results.kpis = true;
    } catch (error) {
      results.errors.push(`KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Try to get explanation for a test persona if personas work
    if (results.personas) {
      try {
        const personas = await this.getPersonas({ limit: 1 });
        if (personas.data.length > 0) {
          await this.getPersonaExplanation(personas.data[0].id);
          results.explain = true;
        }
      } catch (error) {
        results.errors.push(`Explain: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Helper functions for common operations
export const apiHelpers = {
  // Check if user has permission for an action
  canPerformAction: (action: 'read' | 'write' | 'delete') => {
    const role = apiClient.getCurrentUserRole();
    if (!role) return false;
    
    switch (action) {
      case 'read':
        return ['compliance', 'service_role'].includes(role);
      case 'write':
      case 'delete':
        return role === 'service_role';
      default:
        return false;
    }
  },

  // Get user-friendly error message
  getErrorMessage: (error: Error): string => {
    if (error.message.includes('Authentication')) {
      return 'Please log in to access this feature';
    }
    if (error.message.includes('forbidden')) {
      return 'You do not have permission to perform this action';
    }
    if (error.message.includes('Network')) {
      return 'Network connection error. Please check your internet connection.';
    }
    return error.message || 'An unexpected error occurred';
  },

  // Format timestamp for display
  formatTimestamp: (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  },

  // Calculate time difference for "time ago" display
  getTimeAgo: (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  }
};

export default apiClient;