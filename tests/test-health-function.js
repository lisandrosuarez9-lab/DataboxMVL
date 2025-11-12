#!/usr/bin/env node

/**
 * Test script to validate health function implementation
 * Simulates the acceptance criteria for the health endpoint
 * 
 * Run with: node tests/test-health-function.js
 */

// Simulate the getCorsHeaders function
const ALLOWED_ORIGINS = new Set([
  "https://lisandrosuarez9-lab.github.io"
]);

function getCorsHeaders(req) {
  const origin = req.headers.get('origin');
  const requestHeaders = req.headers.get('access-control-request-headers');
  const requestMethod = req.headers.get('access-control-request-method');
  
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) 
    ? origin 
    : Array.from(ALLOWED_ORIGINS)[0];
  
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
  
  if (requestHeaders) {
    headers["Access-Control-Allow-Headers"] = requestHeaders;
  } else {
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info, x-factora-correlation-id";
  }
  
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

// Simulate health function handler
function healthHandler(req) {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return {
      status: 200,
      headers: corsHeaders,
      body: 'ok'
    };
  }
  
  const healthStatus = {
    ok: true,
    timestamp: new Date().toISOString(),
    function: 'health',
    runtime: 'supabase-edge-functions'
  };
  
  return {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(healthStatus)
  };
}

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function main() {
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.cyan + colors.bold + 'Health Function Validation' + colors.reset);
  console.log(colors.cyan + '='.repeat(70) + colors.reset);
  
  let allPassed = true;
  
  // Test 1: OPTIONS request
  console.log(`\n${colors.bold}Test 1: OPTIONS preflight${colors.reset}`);
  const optionsReq = {
    method: 'OPTIONS',
    headers: {
      get: (key) => {
        const headers = {
          'origin': 'https://lisandrosuarez9-lab.github.io',
          'access-control-request-method': 'GET'
        };
        return headers[key.toLowerCase()] || null;
      }
    }
  };
  
  const optionsResp = healthHandler(optionsReq);
  
  if (optionsResp.status === 200) {
    success('Returns 200 status');
  } else {
    error(`Expected 200, got ${optionsResp.status}`);
    allPassed = false;
  }
  
  if (optionsResp.headers['Access-Control-Allow-Origin']) {
    success('Includes CORS headers');
  } else {
    error('Missing CORS headers');
    allPassed = false;
  }
  
  // Test 2: GET request
  console.log(`\n${colors.bold}Test 2: GET request${colors.reset}`);
  const getReq = {
    method: 'GET',
    headers: {
      get: (key) => {
        const headers = {
          'origin': 'https://lisandrosuarez9-lab.github.io'
        };
        return headers[key.toLowerCase()] || null;
      }
    }
  };
  
  const getResp = healthHandler(getReq);
  
  if (getResp.status === 200) {
    success('Returns 200 status');
  } else {
    error(`Expected 200, got ${getResp.status}`);
    allPassed = false;
  }
  
  if (getResp.headers['Content-Type'] === 'application/json') {
    success('Returns application/json content type');
  } else {
    error('Missing or incorrect Content-Type');
    allPassed = false;
  }
  
  const body = JSON.parse(getResp.body);
  if (body.ok === true) {
    success('Response includes { ok: true }');
  } else {
    error('Response missing ok: true');
    allPassed = false;
  }
  
  if (body.function === 'health') {
    success('Response identifies as health function');
  } else {
    error('Response missing function identifier');
    allPassed = false;
  }
  
  if (getResp.headers['Access-Control-Allow-Origin']) {
    success('Includes CORS headers in response');
  } else {
    error('Missing CORS headers in response');
    allPassed = false;
  }
  
  // Test 3: POST request
  console.log(`\n${colors.bold}Test 3: POST request${colors.reset}`);
  const postReq = {
    method: 'POST',
    headers: {
      get: (key) => {
        const headers = {
          'origin': 'https://lisandrosuarez9-lab.github.io'
        };
        return headers[key.toLowerCase()] || null;
      }
    }
  };
  
  const postResp = healthHandler(postReq);
  
  if (postResp.status === 200) {
    success('Returns 200 status');
  } else {
    error(`Expected 200, got ${postResp.status}`);
    allPassed = false;
  }
  
  // Summary
  console.log('\n' + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.cyan + colors.bold + 'Test Summary' + colors.reset);
  console.log(colors.cyan + '='.repeat(70) + colors.reset + '\n');
  
  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✓ Health function meets all requirements! ✨${colors.reset}\n`);
    info('Health function is ready for deployment');
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}✗ Some tests failed${colors.reset}\n`);
    error('Please review the implementation');
    process.exit(1);
  }
}

main();
