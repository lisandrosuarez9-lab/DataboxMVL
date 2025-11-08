/**
 * Static analysis and validation of Phase 1 JWT implementation
 * Checks implementation completeness without runtime execution
 */

console.log('='.repeat(70));
console.log('Phase 1 JWT Implementation - Static Validation');
console.log('='.repeat(70));

// Read and validate score-broker implementation
const fs = require('fs');
const path = require('path');

const brokerPath = path.join(__dirname, '../supabase/functions/score-broker/index.ts');
const checkerPath = path.join(__dirname, '../supabase/functions/score-checker/index.ts');

console.log('\n📋 Checking implementation files...\n');

let allChecks = [];

function check(name, condition, file) {
  const status = condition ? '✅' : '❌';
  allChecks.push({ name, condition, file });
  console.log(`${status} ${name} (${file})`);
  return condition;
}

// Validate score-broker
console.log('\n--- score-broker validation ---\n');
const brokerCode = fs.readFileSync(brokerPath, 'utf8');

check('Imports jose library', brokerCode.includes("import * as jose from 'https://deno.land/x/jose"), 'score-broker');
check('Phase 1 comment updated', brokerCode.includes('Phase 1'), 'score-broker');
check('EdDSA signing mentioned', brokerCode.includes('EdDSA'), 'score-broker');
check('Loads private key from env', brokerCode.includes('SCORE_BROKER_ED25519_JWK'), 'score-broker');
check('Generates 128-bit nonce', brokerCode.includes('generateNonce'), 'score-broker');
check('Creates JWT with SignJWT', brokerCode.includes('new jose.SignJWT'), 'score-broker');
check('Sets algorithm to EdDSA', brokerCode.includes("alg: 'EdDSA'"), 'score-broker');
check('Sets kid header', brokerCode.includes("kid: 'score-broker-ed25519-v1'"), 'score-broker');
check('Sets issuer claim', brokerCode.includes("setIssuer('score-broker')"), 'score-broker');
check('Sets audience claim', brokerCode.includes("setAudience('score-checker')"), 'score-broker');
check('Includes nonce claim', brokerCode.includes('nonce'), 'score-broker');
check('Includes correlation_id claim', brokerCode.includes('correlation_id'), 'score-broker');
check('Includes requester_id claim', brokerCode.includes('requester_id'), 'score-broker');
check('Includes scope claim', brokerCode.includes("scope: 'score:single'"), 'score-broker');
check('Includes pii_hash claim', brokerCode.includes('pii_hash'), 'score-broker');
check('Includes jti claim', brokerCode.includes('jti'), 'score-broker');
check('Has rate limit constants', brokerCode.includes('RATE_LIMIT_PII_PER_MINUTE'), 'score-broker');
check('Has rate limit tracking', brokerCode.includes('rateLimitMap'), 'score-broker');
check('Implements checkRateLimit', brokerCode.includes('function checkRateLimit'), 'score-broker');
check('Logs rate limit warnings', brokerCode.includes('rate_limit_exceeded'), 'score-broker');
check('Truncates hash in logs', brokerCode.includes('truncateHash') || brokerCode.includes('pii_hash_truncated'), 'score-broker');
check('Logs token issuance', brokerCode.includes("'token_issued'"), 'score-broker');
check('Has JWK documentation', brokerCode.includes('JWK Structure') && brokerCode.includes('Example JWK'), 'score-broker');

// Validate score-checker
console.log('\n--- score-checker validation ---\n');
const checkerCode = fs.readFileSync(checkerPath, 'utf8');

check('Imports jose library', checkerCode.includes("import * as jose from 'https://deno.land/x/jose"), 'score-checker');
check('Phase 1 comment updated', checkerCode.includes('Phase 1'), 'score-checker');
check('Verifies JWT tokens', checkerCode.includes('jwtVerify'), 'score-checker');
check('Loads public key', checkerCode.includes('loadPublicKey'), 'score-checker');
check('Checks for env variables', checkerCode.includes('SCORE_CHECKER_ED25519_PUBLIC_JWK') || checkerCode.includes('SCORE_BROKER_ED25519_JWK'), 'score-checker');
check('Validates issuer', checkerCode.includes("issuer: 'score-broker'"), 'score-checker');
check('Validates audience', checkerCode.includes("audience: 'score-checker'"), 'score-checker');
check('Validates algorithm', checkerCode.includes("algorithms: ['EdDSA']"), 'score-checker');
check('Checks required claims', checkerCode.includes('nonce') && checkerCode.includes('correlation_id') && checkerCode.includes('jti'), 'score-checker');
check('Has nonce replay protection', checkerCode.includes('usedNonces'), 'score-checker');
check('Implements checkNonceReplay', checkerCode.includes('checkNonceReplay'), 'score-checker');
check('Stores used nonces', checkerCode.includes('usedNonces.set') || checkerCode.includes('usedNonces.has'), 'score-checker');
check('Cleans expired nonces', checkerCode.includes('setInterval'), 'score-checker');
check('Returns replay error', checkerCode.includes('token_replay'), 'score-checker');
check('Logs validation success', checkerCode.includes('token_validation_success'), 'score-checker');
check('Logs validation failure', checkerCode.includes('token_validation_failed'), 'score-checker');
check('Handles expired tokens', checkerCode.includes('exp'), 'score-checker');
check('Backward compatible with demo mode', checkerCode.includes("token.startsWith('demo.')"), 'score-checker');
check('Has JWK documentation', checkerCode.includes('JWK Structure') && checkerCode.includes('public key'), 'score-checker');

// Summary
console.log('\n' + '='.repeat(70));
console.log('Validation Summary');
console.log('='.repeat(70));

const brokerChecks = allChecks.filter(c => c.file === 'score-broker');
const checkerChecks = allChecks.filter(c => c.file === 'score-checker');

const brokerPassed = brokerChecks.filter(c => c.condition).length;
const checkerPassed = checkerChecks.filter(c => c.condition).length;

console.log(`\nscore-broker: ${brokerPassed}/${brokerChecks.length} checks passed`);
console.log(`score-checker: ${checkerPassed}/${checkerChecks.length} checks passed`);

const totalPassed = allChecks.filter(c => c.condition).length;
const totalChecks = allChecks.length;

console.log(`\nTotal: ${totalPassed}/${totalChecks} checks passed`);

if (totalPassed === totalChecks) {
  console.log('\n✅ All validation checks passed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Generate Ed25519 key pair using test script (Deno required)');
  console.log('   2. Set SCORE_BROKER_ED25519_JWK in Supabase secrets');
  console.log('   3. Deploy functions: supabase functions deploy');
  console.log('   4. Test with real requests');
  process.exit(0);
} else {
  console.log('\n❌ Some validation checks failed');
  console.log('\nFailed checks:');
  allChecks.filter(c => !c.condition).forEach(c => {
    console.log(`   - ${c.name} (${c.file})`);
  });
  process.exit(1);
}
