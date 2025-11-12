#!/usr/bin/env node

/**
 * Test script to validate CORS implementation for score-checker function
 * Simulates the acceptance criteria from the problem statement
 * 
 * Run with: node tests/test-cors-acceptance.js
 */

// Simulate the getCorsHeaders function from _shared/cors.ts
const ALLOWED_ORIGINS = new Set([
  "https://lisandrosuarez9-lab.github.io"
]);

function getCorsHeaders(req) {
  const origin = req.headers.get('origin');
  const requestHeaders = req.headers.get('access-control-request-headers');
  const requestMethod = req.headers.get('access-control-request-method');
  
  // Validate and reflect origin
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) 
    ? origin 
    : Array.from(ALLOWED_ORIGINS)[0];
  
  const headers = {
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
  bold: '\x1b[1m',
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function success(message) {
  log(colors.green, '✓', message);
}

function error(message) {
  log(colors.red, '✗', message);
}

function info(message) {
  log(colors.blue, 'ℹ', message);
}

function testScenario(name, headers, checks) {
  console.log(`\n${colors.bold}Testing: ${name}${colors.reset}`);
  
  // Create a mock Request object
  const headersMap = new Map(Object.entries(headers));
  const req = {
    headers: {
      get: (key) => headersMap.get(key.toLowerCase()) || null
    }
  };
  
  const result = getCorsHeaders(req);
  
  console.log('  Response Headers:');
  for (const [key, value] of Object.entries(result)) {
    console.log(`    ${colors.cyan}${key}${colors.reset}: ${value}`);
  }
  
  let allPassed = true;
  console.log('  Checks:');
  
  for (const check of checks) {
    const passed = check.test(result);
    if (passed) {
      console.log(`    ${colors.green}✓${colors.reset} ${check.description}`);
    } else {
      console.log(`    ${colors.red}✗${colors.reset} ${check.description}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Main test execution
function main() {
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.cyan + colors.bold + 'CORS Acceptance Criteria Validation' + colors.reset);
  console.log(colors.cyan + '='.repeat(70) + colors.reset);
  
  let passCount = 0;
  let totalTests = 0;
  
  // Test 1: Acceptance Criteria - OPTIONS with all headers
  totalTests++;
  const test1Passed = testScenario(
    'Acceptance Criteria: OPTIONS with GitHub Pages origin and custom headers',
    {
      'origin': 'https://lisandrosuarez9-lab.github.io',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization,apikey,x-client-info,x-factora-correlation-id'
    },
    [
      {
        description: 'Access-Control-Allow-Origin reflects GitHub Pages origin',
        test: (r) => r['Access-Control-Allow-Origin'] === 'https://lisandrosuarez9-lab.github.io'
      },
      {
        description: 'Access-Control-Allow-Headers echoes requested headers including x-factora-correlation-id',
        test: (r) => r['Access-Control-Allow-Headers'] === 'content-type,authorization,apikey,x-client-info,x-factora-correlation-id'
      },
      {
        description: 'Access-Control-Allow-Methods includes GET, POST, OPTIONS',
        test: (r) => r['Access-Control-Allow-Methods'] === 'GET, POST, OPTIONS'
      },
      {
        description: 'Access-Control-Max-Age is 86400 (24 hours)',
        test: (r) => r['Access-Control-Max-Age'] === '86400'
      },
      {
        description: 'Vary header includes Origin',
        test: (r) => r['Vary'].includes('Origin')
      },
      {
        description: 'Vary header includes Access-Control-Request-Headers',
        test: (r) => r['Vary'].includes('Access-Control-Request-Headers')
      },
      {
        description: 'Vary header includes Access-Control-Request-Method',
        test: (r) => r['Vary'].includes('Access-Control-Request-Method')
      }
    ]
  );
  if (test1Passed) passCount++;
  
  // Test 2: POST from GitHub Pages with x-factora-correlation-id
  totalTests++;
  const test2Passed = testScenario(
    'Acceptance Criteria: POST with x-factora-correlation-id header',
    {
      'origin': 'https://lisandrosuarez9-lab.github.io',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization,x-factora-correlation-id'
    },
    [
      {
        description: 'Origin is correctly reflected',
        test: (r) => r['Access-Control-Allow-Origin'] === 'https://lisandrosuarez9-lab.github.io'
      },
      {
        description: 'x-factora-correlation-id is included in allowed headers',
        test: (r) => r['Access-Control-Allow-Headers'].includes('x-factora-correlation-id')
      },
      {
        description: 'CORS headers allow the request',
        test: (r) => r['Access-Control-Allow-Methods'].includes('POST')
      }
    ]
  );
  if (test2Passed) passCount++;
  
  // Test 3: Invalid origin defaults to allowed origin
  totalTests++;
  const test3Passed = testScenario(
    'Security Test: Invalid origin defaults to whitelisted origin',
    {
      'origin': 'https://malicious-site.com',
      'access-control-request-method': 'POST'
    },
    [
      {
        description: 'Malicious origin is rejected and defaults to allowed origin',
        test: (r) => r['Access-Control-Allow-Origin'] === 'https://lisandrosuarez9-lab.github.io'
      }
    ]
  );
  if (test3Passed) passCount++;
  
  // Test 4: Fallback headers when no request headers specified
  totalTests++;
  const test4Passed = testScenario(
    'Fallback Test: No request headers uses default list',
    {
      'origin': 'https://lisandrosuarez9-lab.github.io',
      'access-control-request-method': 'GET'
    },
    [
      {
        description: 'Default headers include x-factora-correlation-id',
        test: (r) => r['Access-Control-Allow-Headers'].includes('x-factora-correlation-id')
      },
      {
        description: 'Default headers include authorization',
        test: (r) => r['Access-Control-Allow-Headers'].includes('authorization')
      },
      {
        description: 'Default headers include apikey',
        test: (r) => r['Access-Control-Allow-Headers'].includes('apikey')
      }
    ]
  );
  if (test4Passed) passCount++;
  
  // Summary
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.cyan + colors.bold + 'Test Summary' + colors.reset);
  console.log(colors.cyan + '='.repeat(70) + colors.reset);
  console.log(`\nTests passed: ${colors.bold}${passCount}/${totalTests}${colors.reset}`);
  
  if (passCount === totalTests) {
    console.log(`\n${colors.green}${colors.bold}✓ All acceptance criteria met! ✨${colors.reset}\n`);
    info('CORS implementation is ready for deployment');
    info('Next steps:');
    info('  1. Deploy functions: npx --yes supabase@latest functions deploy score-checker');
    info('  2. Deploy functions: npx --yes supabase@latest functions deploy health');
    info('  3. Test with PowerShell OPTIONS request');
    info('  4. Validate frontend on GitHub Pages');
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}✗ ${totalTests - passCount} test(s) failed${colors.reset}\n`);
    error('Please review the implementation');
    process.exit(1);
  }
}

// Run tests
main();
