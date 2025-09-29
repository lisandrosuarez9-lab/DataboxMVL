/**
 * Endpoint Health Checker Utility
 * 
 * Implements systematic endpoint verification as specified in 
 * DIAGNOSTIC LAYER 1 of the troubleshooting protocol.
 */

export type EndpointCheckResult = {
  endpoint: string;
  status: 'success' | 'failure';
  statusCode?: number;
  responseTime: number;
  error?: string;
  data?: any;
  headers?: Record<string, string>;
  corsEnabled?: boolean;
};

export type EnvironmentConfig = {
  VITE_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  VITE_API_URL?: string;
  NEXT_PUBLIC_API_URL?: string;
};

// Extract environment configuration
export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    NEXT_PUBLIC_API_URL: import.meta.env.NEXT_PUBLIC_API_URL,
  };
};

// Validate environment configuration
export const validateEnvironmentConfig = (): {
  isValid: boolean;
  issues: string[];
  config: EnvironmentConfig;
} => {
  const config = getEnvironmentConfig();
  const issues: string[] = [];

  // Check for mixed Vite/Next.js environment variables
  const hasVite = !!(config.VITE_SUPABASE_URL || config.VITE_SUPABASE_ANON_KEY || config.VITE_API_URL);
  const hasNext = !!(config.NEXT_PUBLIC_SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_ANON_KEY || config.NEXT_PUBLIC_API_URL);

  if (hasVite && hasNext) {
    issues.push('Mixed Vite and Next.js environment variables detected');
  }

  // Check for required Supabase URL
  const supabaseUrl = config.VITE_SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    issues.push('Missing Supabase URL - set VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  } else if (!supabaseUrl.startsWith('https://')) {
    issues.push('Supabase URL must start with https://');
  } else if (supabaseUrl.includes('your-project')) {
    issues.push('Supabase URL appears to be a placeholder - update with actual project URL');
  }

  // Check for trailing slashes
  if (supabaseUrl && supabaseUrl.endsWith('/')) {
    issues.push('Supabase URL should not end with trailing slash');
  }

  // Check API URL if specified
  const apiUrl = config.VITE_API_URL || config.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    if (!apiUrl.startsWith('https://')) {
      issues.push('API URL must start with https://');
    }
    if (apiUrl.endsWith('/')) {
      issues.push('API URL should not end with trailing slash');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    config
  };
};

// Check individual endpoint
export const checkEndpoint = async (
  endpoint: string,
  headers: Record<string, string> = {},
  options: { timeout?: number; method?: string } = {}
): Promise<EndpointCheckResult> => {
  const startTime = performance.now();
  const { timeout = 10000, method = 'GET' } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = performance.now() - startTime;

    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    // Check CORS headers
    const corsEnabled = response.headers.get('Access-Control-Allow-Origin') !== null;

    return {
      endpoint,
      status: response.ok ? 'success' : 'failure',
      statusCode: response.status,
      responseTime,
      data,
      headers: Object.fromEntries(response.headers.entries()),
      corsEnabled,
    };
  } catch (error: any) {
    const responseTime = performance.now() - startTime;
    
    return {
      endpoint,
      status: 'failure',
      responseTime,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
};

// Check multiple endpoints
export const checkEndpoints = async (
  endpoints: string[],
  headers: Record<string, string> = {}
): Promise<EndpointCheckResult[]> => {
  const results: EndpointCheckResult[] = [];
  
  // Use Promise.allSettled to check all endpoints even if some fail
  const promises = endpoints.map(endpoint => checkEndpoint(endpoint, headers));
  const settledResults = await Promise.allSettled(promises);
  
  settledResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        endpoint: endpoints[index],
        status: 'failure',
        responseTime: 0,
        error: result.reason?.message || 'Unknown error',
      });
    }
  });
  
  return results;
};

// Generate comprehensive endpoint report
export const generateEndpointReport = async (baseUrl?: string): Promise<string> => {
  const config = getEnvironmentConfig();
  const validation = validateEnvironmentConfig();
  
  // Determine base URL
  const effectiveBaseUrl = baseUrl || 
    config.VITE_API_URL || 
    config.NEXT_PUBLIC_API_URL ||
    (config.VITE_SUPABASE_URL ? `${config.VITE_SUPABASE_URL}/functions/v1/api-v1` : null) ||
    (config.NEXT_PUBLIC_SUPABASE_URL ? `${config.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-v1` : null);

  if (!effectiveBaseUrl) {
    return `
## API Endpoint Health Report
Generated at: ${new Date().toISOString()}

❌ **CONFIGURATION ERROR**: No API base URL could be determined from environment variables.

### Environment Configuration Issues:
${validation.issues.map(issue => `- ${issue}`).join('\n')}

### Environment Variables Found:
${Object.entries(validation.config)
  .filter(([_, value]) => value)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n') || 'None'}

### Required Environment Variables:
- VITE_SUPABASE_URL (for Vite) or NEXT_PUBLIC_SUPABASE_URL (for Next.js)
- VITE_SUPABASE_ANON_KEY (for Vite) or NEXT_PUBLIC_SUPABASE_ANON_KEY (for Next.js)
    `;
  }

  // Define critical endpoints to test
  const apiEndpoints = [
    `${effectiveBaseUrl}/health`,
    `${effectiveBaseUrl}/personas`,
    `${effectiveBaseUrl}/kpis`,
    `${effectiveBaseUrl}/audit`,
  ];

  // Test with mock auth header (will be replaced with real token in production)
  const authHeaders = {
    'Authorization': 'Bearer mock-jwt-token-for-testing'
  };

  const results = await checkEndpoints(apiEndpoints, authHeaders);
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failure');

  return `
## API Endpoint Health Report
Generated at: ${new Date().toISOString()}
Base URL: ${effectiveBaseUrl}

### Environment Configuration
${validation.isValid ? '✅ **VALID**' : '❌ **INVALID**'}

${validation.issues.length > 0 ? `
#### Configuration Issues:
${validation.issues.map(issue => `- ⚠️ ${issue}`).join('\n')}
` : ''}

#### Environment Variables:
${Object.entries(validation.config)
  .filter(([_, value]) => value)
  .map(([key, value]) => `- ${key}: ${value?.substring(0, 50)}${value && value.length > 50 ? '...' : ''}`)
  .join('\n') || 'None configured'}

### Endpoint Test Results
**Summary**: ${successful.length}/${results.length} endpoints accessible

${results.map(result => `
#### ${result.endpoint}
- Status: ${result.status === 'success' ? '✅' : '❌'} ${result.status.toUpperCase()}
- Response time: ${result.responseTime.toFixed(2)}ms
- Status code: ${result.statusCode || 'N/A'}
- CORS enabled: ${result.corsEnabled ? '✅' : '❌'}
${result.error ? `- Error: ${result.error}` : ''}
${result.status === 'success' && result.data ? `- Response preview: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...` : ''}
`).join('\n')}

### Recommendations
${validation.issues.length > 0 ? `
#### Fix Configuration Issues:
${validation.issues.map(issue => `- ${issue}`).join('\n')}
` : ''}

${failed.length > 0 ? `
#### Fix Failed Endpoints:
${failed.map(result => `- ${result.endpoint}: ${result.error || 'HTTP ' + result.statusCode}`).join('\n')}
` : ''}

${results.some(r => !r.corsEnabled) ? `
#### CORS Configuration:
- Some endpoints may not have proper CORS headers configured
- Verify Edge Function CORS configuration in Supabase
` : ''}
  `;
};

// Test specific authentication flow
export const testAuthenticationFlow = async (baseUrl: string, token?: string): Promise<{
  tokenValid: boolean;
  endpointsAccessible: number;
  totalEndpoints: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  
  if (!token) {
    errors.push('No authentication token provided');
    return {
      tokenValid: false,
      endpointsAccessible: 0,
      totalEndpoints: 0,
      errors
    };
  }

  // Test token format
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    errors.push('Invalid JWT token format');
  }

  // Test authenticated endpoints
  const authEndpoints = [
    `${baseUrl}/personas`,
    `${baseUrl}/kpis`,
    `${baseUrl}/audit`,
  ];

  const results = await checkEndpoints(authEndpoints, {
    'Authorization': `Bearer ${token}`
  });

  const accessible = results.filter(r => r.status === 'success' && r.statusCode !== 401 && r.statusCode !== 403);
  
  results.forEach(result => {
    if (result.statusCode === 401) {
      errors.push(`Authentication failed for ${result.endpoint}`);
    } else if (result.statusCode === 403) {
      errors.push(`Access forbidden for ${result.endpoint}`);
    } else if (result.status === 'failure') {
      errors.push(`Network error for ${result.endpoint}: ${result.error}`);
    }
  });

  return {
    tokenValid: errors.filter(e => e.includes('Invalid JWT')).length === 0,
    endpointsAccessible: accessible.length,
    totalEndpoints: authEndpoints.length,
    errors
  };
};