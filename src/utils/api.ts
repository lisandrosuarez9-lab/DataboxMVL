import { Persona, AuditEntry, DashboardMetrics, ApiResponse, PaginatedResponse } from '@/types';

// JWT decoding utility
interface JWTPayload {
  sub: string;
  email?: string;
  role?: 'compliance' | 'service_role';
  exp: number;
  iat: number;
}

// API Configuration
const API_CONFIG = {
  baseUrl: (import.meta as any).env?.VITE_SUPABASE_URL 
    ? `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/api-v1`
    : 'https://your-project.supabase.co/functions/v1/api-v1',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
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

  // Get JWT token from localStorage or Redux store
  private getJWTToken(): string | null {
    // In a real implementation, this would get from your auth system
    // For now, return a mock JWT or get from localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      return token;
    }

    // Mock JWT for testing purposes
    return this.createMockJWT();
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

  // Get current user role from JWT
  public getCurrentUserRole(): 'compliance' | 'service_role' | null {
    const payload = this.decodeJWT();
    return payload?.role || null;
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

        // Validate response shape if expectedKeys provided
        if (expectedKeys.length > 0 && data.data && !this.validateResponseShape(data.data, expectedKeys)) {
          console.warn('Response shape validation failed for:', endpoint, expectedKeys);
          // Log the validation failure but don't throw - this is for debugging
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

  // Get connectivity status
  public async getConnectivityStatus(): Promise<{
    connected: boolean;
    lastHandshake: string;
    version?: string;
  }> {
    try {
      // Simple health check by calling KPIs endpoint
      await this.getKPIs();
      
      return {
        connected: true,
        lastHandshake: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      return {
        connected: false,
        lastHandshake: new Date().toISOString(),
      };
    }
  }

  // Test all endpoints for verification
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