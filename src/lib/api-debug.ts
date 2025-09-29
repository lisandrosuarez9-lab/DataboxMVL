/**
 * API Request/Response Debugging Utility
 * 
 * Implements comprehensive logging for all API interactions as specified
 * in DIAGNOSTIC LAYER 4 of the troubleshooting protocol.
 */

// Global request/response interceptor for debugging
let debuggingEnabled = false;
const requestLog: Array<{
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}> = [];

const responseLog: Array<{
  id: string;
  timestamp: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data?: any;
  responseTime: number;
  error?: string;
}> = [];

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Original fetch function
const originalFetch = window.fetch;

// Enhanced fetch with debugging
const debugFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const requestId = generateRequestId();
  const startTime = performance.now();
  
  // Log request
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method || 'GET';
  const headers = init?.headers as Record<string, string> || {};
  
  requestLog.push({
    id: requestId,
    timestamp: new Date().toISOString(),
    method,
    url,
    headers,
    body: init?.body ? JSON.parse(init.body as string) : undefined
  });

  if (debuggingEnabled) {
    console.log(`🔵 [API Request ${requestId}]`, {
      method,
      url,
      headers,
      params: new URL(url).searchParams.toString(),
      data: init?.body
    });
  }

  try {
    const response = await originalFetch(input, init);
    const responseTime = performance.now() - startTime;
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    let responseData;
    
    try {
      responseData = await clonedResponse.json();
    } catch {
      responseData = await clonedResponse.text();
    }

    // Log response
    responseLog.push({
      id: requestId,
      timestamp: new Date().toISOString(),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      responseTime
    });

    if (debuggingEnabled) {
      console.log(`🟢 [API Response ${requestId}]`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        responseTime: `${responseTime.toFixed(2)}ms`
      });
    }

    return response;
  } catch (error: any) {
    const responseTime = performance.now() - startTime;
    
    // Log error
    responseLog.push({
      id: requestId,
      timestamp: new Date().toISOString(),
      status: 0,
      statusText: 'Network Error',
      headers: {},
      responseTime,
      error: error.message
    });

    if (debuggingEnabled) {
      console.error(`🔴 [API Error ${requestId}]`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url,
          method,
          headers,
          data: init?.body
        },
        responseTime: `${responseTime.toFixed(2)}ms`
      });
    }
    
    throw error;
  }
};

// Enable API debugging
export const enableAPIDebugging = (): void => {
  if (!debuggingEnabled) {
    debuggingEnabled = true;
    window.fetch = debugFetch;
    console.log('🔍 API debugging enabled - all requests will be logged');
  }
};

// Disable API debugging
export const disableAPIDebugging = (): void => {
  if (debuggingEnabled) {
    debuggingEnabled = false;
    window.fetch = originalFetch;
    console.log('🔍 API debugging disabled');
  }
};

// Get current debugging status
export const isAPIDebuggingEnabled = (): boolean => debuggingEnabled;

// Get request logs
export const getRequestLogs = () => [...requestLog];

// Get response logs
export const getResponseLogs = () => [...responseLog];

// Get combined logs with correlation
export const getCombinedLogs = () => {
  return requestLog.map(req => {
    const response = responseLog.find(res => res.id === req.id);
    return {
      request: req,
      response: response || null
    };
  });
};

// Clear logs
export const clearLogs = (): void => {
  requestLog.length = 0;
  responseLog.length = 0;
  console.log('🧹 API logs cleared');
};

// Generate debugging report
export const generateDebuggingReport = (): string => {
  const logs = getCombinedLogs();
  const successful = logs.filter(log => log.response && log.response.status >= 200 && log.response.status < 300);
  const failed = logs.filter(log => !log.response || log.response.status >= 400);
  
  return `
## API Debugging Report
Generated at: ${new Date().toISOString()}
Total requests: ${logs.length}
Successful: ${successful.length}
Failed: ${failed.length}
Debugging enabled: ${debuggingEnabled}

### Failed Requests:
${failed.map(log => `
- **${log.request.method} ${log.request.url}**
  - Status: ${log.response?.status || 'Network Error'}
  - Error: ${log.response?.error || 'Unknown'}
  - Response time: ${log.response?.responseTime?.toFixed(2) || 'N/A'}ms
`).join('\n')}

### Performance Summary:
${successful.map(log => `
- ${log.request.method} ${log.request.url}: ${log.response?.responseTime?.toFixed(2) || 'N/A'}ms
`).join('\n')}
  `;
};

// Auto-enable debugging in development
if (import.meta.env.DEV) {
  enableAPIDebugging();
}