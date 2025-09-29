import axios from 'axios';

// Create diagnostic interceptor
export const setupAPIdiagnostics = () => {
  // Request interceptor
  axios.interceptors.request.use(
    (config) => {
      console.log('🔍 [API Request]', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        headers: config.headers,
        data: config.data,
        params: config.params,
        timeout: config.timeout,
        timestamp: new Date().toISOString()
      });
      
      // Add request timing
      (config as any).startTime = performance.now();
      
      return config;
    },
    (error) => {
      console.error('🚨 [API Request Error]', {
        message: error.message,
        config: error.config,
        timestamp: new Date().toISOString()
      });
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      const requestTime = (response.config as any).startTime;
      const responseTime = requestTime ? performance.now() - requestTime : 0;
      
      console.log('✅ [API Response]', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        method: response.config.method?.toUpperCase(),
        headers: response.headers,
        data: response.data,
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      return response;
    },
    (error) => {
      const requestTime = (error.config as any)?.startTime;
      const responseTime = requestTime ? performance.now() - requestTime : 0;
      
      console.error('❌ [API Response Error]', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        message: error.message,
        responseData: error.response?.data,
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      return Promise.reject(error);
    }
  );

  console.log('📊 API diagnostics interceptors configured');
};

// Test API connectivity with comprehensive diagnostics
export const testAPIConnectivity = async (baseUrl: string): Promise<{
  success: boolean;
  results: Array<{
    endpoint: string;
    status: 'success' | 'failure';
    statusCode?: number;
    responseTime: number;
    error?: string;
    data?: any;
  }>;
}> => {
  const testEndpoints = [
    '/health',
    '/personas',
    '/kpis',
    '/audit'
  ];

  const results = [];
  
  for (const endpoint of testEndpoints) {
    const startTime = performance.now();
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout: 10000,
        headers: {
          'Authorization': 'Bearer mock-jwt-token-for-testing'
        }
      });
      
      const responseTime = performance.now() - startTime;
      results.push({
        endpoint,
        status: 'success' as const,
        statusCode: response.status,
        responseTime,
        data: response.data
      });
    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      results.push({
        endpoint,
        status: 'failure' as const,
        statusCode: error.response?.status,
        responseTime,
        error: error.message,
        data: error.response?.data
      });
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;
  
  return {
    success: successCount === testEndpoints.length,
    results
  };
};