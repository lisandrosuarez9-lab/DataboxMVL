#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Test script for Phase 1 JWT flow
 * Tests EdDSA (Ed25519) JWT signing in score-broker and verification in score-checker
 * 
 * Usage:
 *   deno run --allow-env --allow-net tests/test-jwt-flow.ts
 */

import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

// Test configuration
const TOKEN_TTL_SECONDS = 45;

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

function warn(message: string) {
  log(colors.yellow, '⚠', message);
}

// Generate a test Ed25519 key pair
async function generateTestKeyPair() {
  info('Generating Ed25519 key pair...');
  
  const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { crv: 'Ed25519' });
  
  const privateJWK = await jose.exportJWK(privateKey);
  privateJWK.kid = 'score-broker-ed25519-v1';
  
  const publicJWK = await jose.exportJWK(publicKey);
  publicJWK.kid = 'score-broker-ed25519-v1';
  
  success('Key pair generated');
  
  return { privateJWK, publicJWK };
}

// Hash function matching score-broker implementation
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate 128-bit nonce
function generateNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Simulate score-broker token generation
async function generateToken(privateJWK: any, testData: any) {
  info('Generating signed JWT token...');
  
  const privateKey = await jose.importJWK(privateJWK, 'EdDSA');
  
  const piiHash = await hashString(testData.national_id);
  const emailDomain = testData.email.split('@')[1] || 'unknown';
  const requesterIdHash = await hashString(emailDomain);
  
  const nonce = generateNonce();
  const jti = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;
  
  const token = await new jose.SignJWT({
    nonce,
    correlation_id: correlationId,
    requester_id: requesterIdHash,
    scope: 'score:single',
    pii_hash: piiHash,
    jti
  })
    .setProtectedHeader({ 
      alg: 'EdDSA',
      kid: 'score-broker-ed25519-v1',
      typ: 'JWT'
    })
    .setIssuer('score-broker')
    .setAudience('score-checker')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);
  
  success('Token generated');
  info(`Token length: ${token.length} bytes`);
  info(`Token preview: ${token.substring(0, 50)}...`);
  
  return {
    token,
    correlationId,
    jti,
    nonce,
    piiHash,
    requesterIdHash,
    exp
  };
}

// Verify token like score-checker
async function verifyToken(publicJWK: any, token: string) {
  info('Verifying JWT token...');
  
  const publicKey = await jose.importJWK(publicJWK, 'EdDSA');
  
  try {
    const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
      issuer: 'score-broker',
      audience: 'score-checker',
      algorithms: ['EdDSA']
    });
    
    success('Token signature verified');
    
    // Check required claims
    const requiredClaims = ['nonce', 'correlation_id', 'jti', 'scope', 'pii_hash', 'requester_id'];
    for (const claim of requiredClaims) {
      if (!payload[claim]) {
        error(`Missing required claim: ${claim}`);
        return false;
      }
    }
    success('All required claims present');
    
    // Check TTL
    const now = Math.floor(Date.now() / 1000);
    const ttlRemaining = (payload.exp as number) - now;
    if (ttlRemaining > 0) {
      success(`TTL valid: ${ttlRemaining} seconds remaining`);
    } else {
      error('Token expired');
      return false;
    }
    
    // Log claims
    info('\nToken Claims:');
    console.log(JSON.stringify(payload, null, 2));
    info('\nProtected Header:');
    console.log(JSON.stringify(protectedHeader, null, 2));
    
    return true;
  } catch (err) {
    error(`Verification failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// Test replay protection
async function testReplayProtection(publicJWK: any, token: string) {
  info('\nTesting replay protection...');
  
  const nonces = new Map<string, number>();
  
  const publicKey = await jose.importJWK(publicJWK, 'EdDSA');
  const { payload } = await jose.jwtVerify(token, publicKey);
  
  const nonce = payload.nonce as string;
  const exp = payload.exp as number;
  
  // First use - should succeed
  if (!nonces.has(nonce)) {
    nonces.set(nonce, exp * 1000);
    success('First token use: allowed');
  } else {
    error('First use failed - nonce already tracked');
    return false;
  }
  
  // Second use - should be blocked (replay)
  if (nonces.has(nonce)) {
    success('Replay detected: token reuse blocked');
    return true;
  } else {
    error('Replay protection failed - reuse not detected');
    return false;
  }
}

// Test expired token
async function testExpiredToken(privateJWK: any, publicJWK: any) {
  info('\nTesting expired token handling...');
  
  const privateKey = await jose.importJWK(privateJWK, 'EdDSA');
  const publicKey = await jose.importJWK(publicJWK, 'EdDSA');
  
  // Create token that's already expired
  const now = Math.floor(Date.now() / 1000);
  const expiredToken = await new jose.SignJWT({
    nonce: generateNonce(),
    correlation_id: crypto.randomUUID(),
    requester_id: 'test',
    scope: 'score:single',
    pii_hash: 'test',
    jti: crypto.randomUUID()
  })
    .setProtectedHeader({ 
      alg: 'EdDSA',
      kid: 'score-broker-ed25519-v1',
      typ: 'JWT'
    })
    .setIssuer('score-broker')
    .setAudience('score-checker')
    .setIssuedAt(now - 100)
    .setExpirationTime(now - 10) // Expired 10 seconds ago
    .sign(privateKey);
  
  try {
    await jose.jwtVerify(expiredToken, publicKey, {
      issuer: 'score-broker',
      audience: 'score-checker',
      algorithms: ['EdDSA']
    });
    error('Expired token was accepted (should have been rejected)');
    return false;
  } catch (err) {
    if (err instanceof Error && err.message.includes('exp')) {
      success('Expired token correctly rejected');
      return true;
    } else {
      error(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}

// Test invalid signature
async function testInvalidSignature(publicJWK: any, token: string) {
  info('\nTesting invalid signature detection...');
  
  // Tamper with the token
  const parts = token.split('.');
  if (parts.length !== 3) {
    error('Invalid token format');
    return false;
  }
  
  // Modify the payload slightly
  const tamperedToken = parts[0] + '.' + parts[1].slice(0, -1) + 'X' + '.' + parts[2];
  
  const publicKey = await jose.importJWK(publicJWK, 'EdDSA');
  
  try {
    await jose.jwtVerify(tamperedToken, publicKey, {
      issuer: 'score-broker',
      audience: 'score-checker',
      algorithms: ['EdDSA']
    });
    error('Tampered token was accepted (should have been rejected)');
    return false;
  } catch (err) {
    success('Tampered token correctly rejected');
    return true;
  }
}

// Main test execution
async function main() {
  console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
  console.log(colors.cyan + 'Phase 1 JWT Flow Test Suite' + colors.reset);
  console.log(colors.cyan + '='.repeat(60) + colors.reset + '\n');
  
  let passCount = 0;
  let totalTests = 0;
  
  try {
    // Generate test keys
    const { privateJWK, publicJWK } = await generateTestKeyPair();
    
    console.log(colors.cyan + '\n--- Private JWK (for SCORE_BROKER_ED25519_JWK) ---' + colors.reset);
    console.log(JSON.stringify(privateJWK, null, 2));
    
    console.log(colors.cyan + '\n--- Public JWK (for SCORE_CHECKER_ED25519_PUBLIC_JWK) ---' + colors.reset);
    console.log(JSON.stringify(publicJWK, null, 2));
    
    // Test data
    const testData = {
      full_name: 'Test User',
      email: 'test@example.com',
      national_id: '12345678'
    };
    
    console.log(colors.cyan + '\n--- Test 1: Token Generation ---' + colors.reset);
    const tokenData = await generateToken(privateJWK, testData);
    totalTests++;
    if (tokenData.token) passCount++;
    
    console.log(colors.cyan + '\n--- Test 2: Token Verification ---' + colors.reset);
    totalTests++;
    if (await verifyToken(publicJWK, tokenData.token)) passCount++;
    
    console.log(colors.cyan + '\n--- Test 3: Replay Protection ---' + colors.reset);
    totalTests++;
    if (await testReplayProtection(publicJWK, tokenData.token)) passCount++;
    
    console.log(colors.cyan + '\n--- Test 4: Expired Token ---' + colors.reset);
    totalTests++;
    if (await testExpiredToken(privateJWK, publicJWK)) passCount++;
    
    console.log(colors.cyan + '\n--- Test 5: Invalid Signature ---' + colors.reset);
    totalTests++;
    if (await testInvalidSignature(publicJWK, tokenData.token)) passCount++;
    
    // Summary
    console.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
    console.log(colors.cyan + 'Test Summary' + colors.reset);
    console.log(colors.cyan + '='.repeat(60) + colors.reset);
    console.log(`Tests passed: ${passCount}/${totalTests}`);
    
    if (passCount === totalTests) {
      success('\nAll tests passed! ✨');
      console.log('\nNext steps:');
      info('1. Copy the Private JWK above and set as SCORE_BROKER_ED25519_JWK in Supabase');
      info('2. Copy the Public JWK above and set as SCORE_CHECKER_ED25519_PUBLIC_JWK in Supabase');
      info('   (Or just use the Private JWK for both - it contains the public key)');
      info('3. Deploy the edge functions: supabase functions deploy');
      Deno.exit(0);
    } else {
      error(`\n${totalTests - passCount} test(s) failed`);
      Deno.exit(1);
    }
    
  } catch (err) {
    error(`\nFatal error: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    Deno.exit(1);
  }
}

// Run tests
main();
