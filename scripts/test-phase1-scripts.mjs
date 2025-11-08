#!/usr/bin/env node
/**
 * test-phase1-scripts.mjs
 * 
 * Comprehensive test suite for Phase 1 operator scripts.
 * Tests all scripts and verifies their functionality.
 * 
 * Usage:
 *   node scripts/test-phase1-scripts.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function runTests() {
  console.log('🧪 Phase 1 Scripts Test Suite\n');
  console.log(`Running ${tests.length} tests...\n`);
  
  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (failed > 0) {
    console.error('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Test 1: generate-ed25519-jwk.mjs exists and is executable
test('generate-ed25519-jwk.mjs exists', () => {
  const script = 'scripts/generate-ed25519-jwk.mjs';
  const content = readFileSync(script, 'utf8');
  if (!content.includes('jose')) {
    throw new Error('Script does not import jose');
  }
  if (!content.includes('generateKeyPair')) {
    throw new Error('Script does not use generateKeyPair');
  }
});

// Test 2: generate-ed25519-jwk.mjs generates valid output
test('generate-ed25519-jwk.mjs generates valid output', () => {
  const output = execSync('node scripts/generate-ed25519-jwk.mjs 2>/dev/null', { encoding: 'utf8' });
  
  if (!output.includes('SCORE_BROKER_ED25519_JWK=')) {
    throw new Error('Output missing SCORE_BROKER_ED25519_JWK');
  }
  if (!output.includes('SCORE_CHECKER_ED25519_PUBLIC_JWK=')) {
    throw new Error('Output missing SCORE_CHECKER_ED25519_PUBLIC_JWK');
  }
  if (!output.includes('"kty":"OKP"')) {
    throw new Error('Output missing OKP key type');
  }
  if (!output.includes('"crv":"Ed25519"')) {
    throw new Error('Output missing Ed25519 curve');
  }
});

// Test 3: generate-ed25519-jwk.mjs accepts custom kid
test('generate-ed25519-jwk.mjs accepts custom kid', () => {
  const output = execSync('node scripts/generate-ed25519-jwk.mjs test-kid-xyz 2>/dev/null', { encoding: 'utf8' });
  
  if (!output.includes('"kid":"test-kid-xyz"')) {
    throw new Error('Custom kid not in output');
  }
});

// Test 4: generate-ed25519-jwk.mjs --help works
test('generate-ed25519-jwk.mjs --help works', () => {
  const output = execSync('node scripts/generate-ed25519-jwk.mjs --help', { encoding: 'utf8' });
  
  if (!output.includes('Usage:')) {
    throw new Error('Help output missing Usage section');
  }
});

// Test 5: rotate-ed25519-key.mjs exists and is executable
test('rotate-ed25519-key.mjs exists', () => {
  const script = 'scripts/rotate-ed25519-key.mjs';
  const content = readFileSync(script, 'utf8');
  if (!content.includes('jose')) {
    throw new Error('Script does not import jose');
  }
  if (!content.includes('rotateKey')) {
    throw new Error('Script does not have rotateKey function');
  }
});

// Test 6: rotate-ed25519-key.mjs generates timestamp kid by default
test('rotate-ed25519-key.mjs generates timestamp kid', () => {
  const output = execSync('node scripts/rotate-ed25519-key.mjs 2>&1', { encoding: 'utf8' });
  
  if (!output.includes('score-broker-ed25519-')) {
    throw new Error('Output missing kid prefix');
  }
  if (!output.includes('Key ID: score-broker-ed25519-')) {
    throw new Error('stderr missing Key ID');
  }
});

// Test 7: rotate-ed25519-key.mjs accepts custom kid
test('rotate-ed25519-key.mjs accepts custom kid', () => {
  const output = execSync('node scripts/rotate-ed25519-key.mjs test-v2 2>/dev/null', { encoding: 'utf8' });
  
  if (!output.includes('"kid":"test-v2"')) {
    throw new Error('Custom kid not in output');
  }
});

// Test 8: validate-jwk.mjs exists
test('validate-jwk.mjs exists', () => {
  const script = 'scripts/validate-jwk.mjs';
  const content = readFileSync(script, 'utf8');
  if (!content.includes('jose')) {
    throw new Error('Script does not import jose');
  }
  if (!content.includes('validateJWK')) {
    throw new Error('Script does not have validateJWK function');
  }
});

// Test 9: validate-jwk.mjs validates generated key
test('validate-jwk.mjs validates generated key', () => {
  // Generate a key
  const genOutput = execSync('node scripts/generate-ed25519-jwk.mjs 2>/dev/null', { encoding: 'utf8' });
  const keyMatch = genOutput.match(/SCORE_BROKER_ED25519_JWK='([^']+)'/);
  
  if (!keyMatch) {
    throw new Error('Could not extract key from generate output');
  }
  
  const key = keyMatch[1];
  
  // Validate it
  const valOutput = execSync(`node scripts/validate-jwk.mjs '${key}'`, { encoding: 'utf8' });
  
  if (!valOutput.includes('JWK Validation PASSED')) {
    throw new Error('Validation did not pass');
  }
  if (!valOutput.includes('Signing test passed')) {
    throw new Error('Signing test not in output');
  }
});

// Test 10: phase1-smoke-test.mjs exists
test('phase1-smoke-test.mjs exists', () => {
  const script = 'scripts/phase1-smoke-test.mjs';
  const content = readFileSync(script, 'utf8');
  if (!content.includes('smokeTest')) {
    throw new Error('Script does not have smokeTest function');
  }
  if (!content.includes('fetch')) {
    throw new Error('Script does not use fetch');
  }
});

// Test 11: phase1-smoke-test.mjs requires SUPABASE_URL
test('phase1-smoke-test.mjs requires SUPABASE_URL', () => {
  try {
    execSync('node scripts/phase1-smoke-test.mjs 2>&1', { encoding: 'utf8', env: { ...process.env, SUPABASE_URL: '' } });
    throw new Error('Script should exit with error when SUPABASE_URL not set');
  } catch (error) {
    if (error.stdout && error.stdout.includes('SUPABASE_URL environment variable is not set')) {
      // Expected error
      return;
    }
    throw error;
  }
});

// Test 12: package.json has all npm scripts
test('package.json has all npm scripts', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  
  const requiredScripts = [
    'generate-jwk',
    'rotate-key',
    'validate-jwk',
    'phase1:smoke-test'
  ];
  
  for (const script of requiredScripts) {
    if (!pkg.scripts[script]) {
      throw new Error(`Missing npm script: ${script}`);
    }
  }
});

// Test 13: package.json has jose dependency
test('package.json has jose dependency', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  
  if (!pkg.devDependencies || !pkg.devDependencies.jose) {
    throw new Error('jose not in devDependencies');
  }
});

// Test 14: Documentation files exist
test('Documentation files exist', () => {
  const docs = [
    'docs/PHASE_1_DEPLOYMENT_RUNBOOK.md',
    'docs/PHASE_1_QUICK_REFERENCE.md',
    'scripts/README.md'
  ];
  
  for (const doc of docs) {
    try {
      readFileSync(doc, 'utf8');
    } catch {
      throw new Error(`Documentation file missing: ${doc}`);
    }
  }
});

// Test 15: scripts/README.md documents all scripts
test('scripts/README.md documents all scripts', () => {
  const readme = readFileSync('scripts/README.md', 'utf8');
  
  const scripts = [
    'generate-ed25519-jwk.mjs',
    'rotate-ed25519-key.mjs',
    'validate-jwk.mjs',
    'phase1-smoke-test.mjs'
  ];
  
  for (const script of scripts) {
    if (!readme.includes(script)) {
      throw new Error(`README missing documentation for: ${script}`);
    }
  }
});

runTests();
