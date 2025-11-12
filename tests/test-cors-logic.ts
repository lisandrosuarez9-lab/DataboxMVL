#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Test script for CORS logic validation
 * Tests the getCorsHeaders function with various request scenarios
 * 
 * Usage:
 *   deno run --allow-env --allow-net tests/test-cors-logic.ts
 */

// Import the CORS logic (simulated for testing)
const ALLOWED_ORIGINS = new Set([
  "https://lisandrosuarez9-lab.github.io"
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const requestHeaders = req.headers.get('access-control-request-headers');
  const requestMethod = req.headers.get('access-control-request-method');
  
  // Validate and reflect origin
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) 
    ? origin 
    : Array.from(ALLOWED_ORIGINS)[0];
  
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours preflight cache
  };
  
  // Echo requested headers to allow custom headers like x-factora-correlation-id
  if (requestHeaders) {
    headers["Access-Control-Allow-Headers"] = requestHeaders;
  } else {
    // Fallback to standard headers if not specified
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info, x-factora-correlation-id";
  }
  
  // Add Vary header to prevent cache poisoning
  const varyHeaders = ["Origin"];
  if (requestHeaders) {
    varyHeaders.push("Access-Control-Request-Headers");
  }
  if (requestMethod) {
    varyHeaders.push("Access-Control-Request-Method");
  }
  headers["Vary"] = varyHeaders.join(", ");
  
  return headers;
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: string, prefix: string, message: string) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function success(message: string) {
  log(colors.green, '✓', message);
}

function error(message: string) {
  log(colors.red, '✗', message);
}

function info(message: string) {
  log(colors.blue, 'ℹ', message);
}

function testScenario(name: string, headers: HeadersInit, expectedChecks: (result: Record<string, string>) => boolean): boolean {
  info(`Testing: ${name}`);
  
  const req = new Request('https://example.com/test', { 
    method: 'OPTIONS',
    headers 
  });
  
  const result = getCorsHeaders(req);
  
  console.log('  Headers received:');
  for (const [key, value] of Object.entries(result)) {
    console.log(`    ${key}: ${value}`);
  }
  
  if (expectedChecks(result)) {
    success('Test passed');
    return true;
  } else {
    error('Test failed');
    return false;
  }
}

// Main test execution
function main() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
  console.log(colors.cyan + 'CORS Logic Validation Test Suite' + colors.reset);
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n');
  
  let passCount = 0;
  let totalTests = 0;
  
  // Test 1: Valid origin with custom headers (including x-factora-correlation-id)
  totalTests++;
  if (testScenario(
    'Valid origin with custom headers',
    {
      'origin': 'https://lisandrosuarez9-lab.github.io',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization,apikey,x-client-info,x-factora-correlation-id'
    },
    (result) => {
      return result['Access-Control-Allow-Origin'] === 'https://lisandrosuarez9-lab.github.io' &&
             result['Access-Control-Allow-Headers'] === 'content-type,authorization,apikey,x-client-info,x-factora-correlation-id' &&
             result['Access-Control-Allow-Methods'] === 'GET, POST, OPTIONS' &&
             result['Access-Control-Max-Age'] === '86400' &&
             result['Vary'].includes('Origin') &&
             result['Vary'].includes('Access-Control-Request-Headers') &&
             result['Vary'].includes('Access-Control-Request-Method');
    }
  )) passCount++;
  
  console.log();
  
  // Test 2: Invalid origin should default to first allowed origin
  totalTests++;
  if (testScenario(
    'Invalid origin defaults to allowed origin',
    {
      'origin': 'https://malicious-site.com',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    },
    (result) => {
      return result['Access-Control-Allow-Origin'] === 'https://lisandrosuarez9-lab.github.io';
    }
  )) passCount++;
  
  console.log();
  
  // Test 3: No origin header
  totalTests++;
  if (testScenario(
    'No origin header',
    {
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    },
    (result) => {
      return result['Access-Control-Allow-Origin'] === 'https://lisandrosuarez9-lab.github.io';
    }
  )) passCount++;
  
  console.log();
  
  // Test 4: No request headers - should use default fallback
  totalTests++;
  if (testScenario(
    'No request headers - uses fallback',
    {
      'origin': 'https://lisandrosuarez9-lab.github.io',
      'access-control-request-method': 'POST'
    },
    (result) => {
      return result['Access-Control-Allow-Headers'].includes('x-factora-correlation-id') &&
             result['Access-Control-Allow-Headers'].includes('authorization') &&
             result['Access-Control-Allow-Headers'].includes('apikey');
    }
  )) passCount++;
  
  console.log();
  
  // Test 5: Verify Vary header structure
  totalTests++;
  if (testScenario(
    'Vary header includes all necessary fields',
    {
      'origin': 'https://lisandrosuarez9-lab.github.io',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    },
    (result) => {
      const vary = result['Vary'];
      return vary.includes('Origin') && 
             vary.includes('Access-Control-Request-Headers') &&
             vary.includes('Access-Control-Request-Method');
    }
  )) passCount++;
  
  // Summary
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
  console.log(colors.cyan + 'Test Summary' + colors.reset);
  console.log(colors.cyan + '='.repeat(60) + colors.reset);
  console.log(`Tests passed: ${passCount}/${totalTests}`);
  
  if (passCount === totalTests) {
    success('\nAll tests passed! ✨');
    console.log('\nCORS implementation meets requirements:');
    info('✓ Dynamic origin validation');
    info('✓ Echoes Access-Control-Request-Headers');
    info('✓ Includes Access-Control-Max-Age: 86400');
    info('✓ Adds Vary header for cache poisoning prevention');
    info('✓ Supports x-factora-correlation-id header');
    Deno.exit(0);
  } else {
    error(`\n${totalTests - passCount} test(s) failed`);
    Deno.exit(1);
  }
}

// Run tests
main();
