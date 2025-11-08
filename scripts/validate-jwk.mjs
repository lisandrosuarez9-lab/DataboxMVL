#!/usr/bin/env node
/**
 * validate-jwk.mjs
 * 
 * Simple validator to check if a JWK string is valid for Ed25519.
 * Used for testing and validation of generated keys.
 * 
 * Usage:
 *   node scripts/validate-jwk.mjs '<jwk-string>'
 *   
 * Example:
 *   node scripts/validate-jwk.mjs '{"kty":"OKP","crv":"Ed25519","x":"...","d":"...","kid":"..."}'
 */

import * as jose from 'jose';

async function validateJWK(jwkString) {
  try {
    console.log('🔍 Validating JWK...\n');
    
    // Parse JSON
    let jwk;
    try {
      jwk = JSON.parse(jwkString);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
    
    // Check required fields
    if (jwk.kty !== 'OKP') {
      throw new Error(`Invalid kty: expected "OKP", got "${jwk.kty}"`);
    }
    
    if (jwk.crv !== 'Ed25519') {
      throw new Error(`Invalid crv: expected "Ed25519", got "${jwk.crv}"`);
    }
    
    if (!jwk.x) {
      throw new Error('Missing required field: x (public key)');
    }
    
    if (!jwk.kid) {
      console.warn('⚠️  Warning: kid (key ID) is not set');
    }
    
    // Check if it's a private or public key
    const isPrivate = !!jwk.d;
    console.log(`Key type: ${isPrivate ? 'Private' : 'Public'}`);
    console.log(`Key ID: ${jwk.kid || '(not set)'}`);
    console.log('');
    
    // Try to import the key
    const key = await jose.importJWK(jwk, 'EdDSA');
    console.log('✅ JWK is valid and can be imported');
    
    // If private key, test signing
    if (isPrivate) {
      console.log('\n🔐 Testing signing capability...');
      const jwt = await new jose.SignJWT({ test: true })
        .setProtectedHeader({ alg: 'EdDSA', kid: jwk.kid })
        .setIssuedAt()
        .setExpirationTime('1m')
        .sign(key);
      console.log('✅ Signing test passed');
      console.log(`   Token sample: ${jwt.substring(0, 50)}...`);
      
      // Test verification
      console.log('\n🔍 Testing verification...');
      const publicKey = await jose.importJWK({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, kid: jwk.kid }, 'EdDSA');
      const { payload } = await jose.jwtVerify(jwt, publicKey);
      console.log('✅ Verification test passed');
    } else {
      console.log('\nℹ️  Public key only - cannot test signing');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ JWK Validation PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ JWK Validation FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Make sure the JWK:');
    console.error('  - Is valid JSON');
    console.error('  - Has kty: "OKP"');
    console.error('  - Has crv: "Ed25519"');
    console.error('  - Has x (public key)');
    console.error('  - Has d (private key) if signing is needed');
    console.error('  - Has kid (key ID) for identification');
    
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: node scripts/validate-jwk.mjs <jwk-string>');
  console.log('');
  console.log('Validates an Ed25519 JWK for correctness.');
  console.log('');
  console.log('Arguments:');
  console.log('  jwk-string    JSON string of the JWK to validate');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/validate-jwk.mjs \'{"kty":"OKP","crv":"Ed25519","x":"...","kid":"..."}\'');
  console.log('');
  console.log('What this validates:');
  console.log('  - JSON format');
  console.log('  - Required JWK fields');
  console.log('  - Ed25519 algorithm parameters');
  console.log('  - Key import capability');
  console.log('  - Signing/verification (if private key)');
  process.exit(0);
}

const jwkString = args[0];
validateJWK(jwkString);
