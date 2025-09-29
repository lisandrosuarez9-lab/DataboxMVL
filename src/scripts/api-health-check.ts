#!/usr/bin/env node

/**
 * API Health Check Script
 * 
 * Implements curl-like functionality to test API endpoints
 * as specified in PHASE 2 of the troubleshooting protocol.
 */

import { apiClient } from '../frontend/lib/api-client';

interface HealthCheckResult {
  endpoint: string;
  status: 'success' | 'failure';
  statusCode: number;
  responseTime: number;
  responseSize: number;
  headers: Record<string, string>;
  data?: any;
  error?: string;
}

async function performHealthCheck(endpoint: string): Promise<HealthCheckResult> {
  const startTime = performance.now();
  
  try {
    console.log(`🔍 Testing endpoint: ${endpoint}`);
    
    const response = await apiClient.get(endpoint, {
      timeout: 10000,
      validateStatus: () => true // Don't throw on HTTP error codes
    });
    
    const responseTime = performance.now() - startTime;
    const responseData = response.data;
    const responseSize = JSON.stringify(responseData).length;
    
    const result: HealthCheckResult = {
      endpoint,
      status: response.status >= 200 && response.status < 300 ? 'success' : 'failure',
      statusCode: response.status,
      responseTime,
      responseSize,
      headers: response.headers as Record<string, string>,
      data: responseData
    };
    
    // Log curl-like output
    console.log(`> GET ${endpoint} HTTP/1.1`);
    console.log(`> Host: ${new URL(apiClient.defaults.baseURL!).host}`);
    console.log(`> User-Agent: DataboxMVL-HealthCheck/1.0`);
    console.log(`> Accept: application/json`);
    console.log('> ');
    console.log(`< HTTP/1.1 ${response.status} ${response.statusText}`);
    
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`< ${key}: ${value}`);
    });
    
    console.log('< ');
    console.log(`📊 Response time: ${responseTime.toFixed(2)}ms`);
    console.log(`📦 Response size: ${responseSize} bytes`);
    
    if (result.status === 'success') {
      console.log(`✅ ${endpoint} - OK (${response.status})`);
    } else {
      console.log(`❌ ${endpoint} - FAILED (${response.status})`);
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }
    
    console.log('─'.repeat(50));
    
    return result;
    
  } catch (error: any) {
    const responseTime = performance.now() - startTime;
    
    console.log(`💥 ${endpoint} - ERROR: ${error.message}`);
    console.log(`📊 Time before error: ${responseTime.toFixed(2)}ms`);
    console.log('─'.repeat(50));
    
    return {
      endpoint,
      status: 'failure',
      statusCode: 0,
      responseTime,
      responseSize: 0,
      headers: {},
      error: error.message
    };
  }
}

async function runHealthCheckSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
  results: HealthCheckResult[];
  summary: string;
}> {
  console.log('🚀 Starting API Health Check Suite');
  console.log('━'.repeat(50));
  
  const endpoints = [
    '/health',
    '/personas',
    '/personas/explain',
    '/audit',
    '/kpis',
    '/models/factors',
    '/models/risk-bands'
  ];
  
  const results: HealthCheckResult[] = [];
  
  for (const endpoint of endpoints) {
    const result = await performHealthCheck(endpoint);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failure').length;
  const total = results.length;
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;
  const totalResponseSize = results.reduce((sum, r) => sum + r.responseSize, 0);
  
  const summary = `
🏁 Health Check Complete!

📈 SUMMARY:
  Total Endpoints: ${total}
  Passed: ✅ ${passed}
  Failed: ❌ ${failed}
  Success Rate: ${((passed / total) * 100).toFixed(1)}%
  
📊 PERFORMANCE:
  Average Response Time: ${avgResponseTime.toFixed(2)}ms
  Total Data Transferred: ${totalResponseSize} bytes
  Fastest Endpoint: ${results.reduce((min, r) => r.responseTime < min.responseTime ? r : min).endpoint} (${results.reduce((min, r) => r.responseTime < min.responseTime ? r : min).responseTime.toFixed(2)}ms)
  Slowest Endpoint: ${results.reduce((max, r) => r.responseTime > max.responseTime ? r : max).endpoint} (${results.reduce((max, r) => r.responseTime > max.responseTime ? r : max).responseTime.toFixed(2)}ms)

🔍 FAILED ENDPOINTS:
${results.filter(r => r.status === 'failure').map(r => `  - ${r.endpoint}: ${r.error || `HTTP ${r.statusCode}`}`).join('\n') || '  None - All endpoints are healthy! 🎉'}

🔧 TROUBLESHOOTING:
${failed > 0 ? `
  1. Check if Supabase Edge Function is deployed: npx supabase functions deploy api-v1
  2. Verify environment variables in .env.local
  3. Check Supabase project status and billing
  4. Review function logs: npx supabase functions logs api-v1
` : `  All systems operational! 🚀`}
`;
  
  console.log(summary);
  
  return {
    passed,
    failed,
    total,
    results,
    summary
  };
}

// Export for use in other modules
export { performHealthCheck, runHealthCheckSuite };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes('api-health-check')) {
  runHealthCheckSuite().catch(console.error);
}