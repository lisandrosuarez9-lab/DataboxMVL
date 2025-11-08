#!/usr/bin/env node
/**
 * generate-ed25519-jwk.mjs
 * 
 * Generates a new Ed25519 keypair as JWK for Phase 1 JWT token signing.
 * Outputs both PUBLIC_JWK and PRIVATE_JWK to stdout for easy Supabase secret configuration.
 * 
 * Usage:
 *   node scripts/generate-ed25519-jwk.mjs
 *   npm run generate-jwk
 * 
 * Default kid: score-broker-ed25519-v1
 * 
 * Output format:
 *   PRIVATE_JWK={"kty":"OKP","crv":"Ed25519","x":"...","d":"...","kid":"score-broker-ed25519-v1"}
 *   PUBLIC_JWK={"kty":"OKP","crv":"Ed25519","x":"...","kid":"score-broker-ed25519-v1"}
 */

import * as jose from 'jose';

const DEFAULT_KID = 'score-broker-ed25519-v1';

async function generateKeyPair(kid = DEFAULT_KID) {
  try {
    console.error('🔐 Generating Ed25519 keypair...\n');
    
    // Generate Ed25519 keypair
    const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { 
      crv: 'Ed25519' 
    });
    
    // Export as JWK
    const privateJWK = await jose.exportJWK(privateKey);
    const publicJWK = await jose.exportJWK(publicKey);
    
    // Add key ID
    privateJWK.kid = kid;
    publicJWK.kid = kid;
    
    // Output in format ready for Supabase secrets
    console.log('# Copy these values to your Supabase secrets:');
    console.log('#');
    console.log('# For score-broker (requires private key):');
    console.log(`SCORE_BROKER_ED25519_JWK='${JSON.stringify(privateJWK)}'`);
    console.log('');
    console.log('# For score-checker (can use public key only, or the full private key):');
    console.log(`SCORE_CHECKER_ED25519_PUBLIC_JWK='${JSON.stringify(publicJWK)}'`);
    console.log('');
    console.log('# Alternatively, store in environment file (.env.local):');
    console.log(`SCORE_BROKER_ED25519_JWK=${JSON.stringify(privateJWK)}`);
    console.log(`SCORE_CHECKER_ED25519_PUBLIC_JWK=${JSON.stringify(publicJWK)}`);
    console.log('');
    
    console.error('✅ Key generation complete!');
    console.error('');
    console.error('📝 Next steps:');
    console.error('   1. Set these secrets in Supabase:');
    console.error('      supabase secrets set SCORE_BROKER_ED25519_JWK=\'<private-jwk>\'');
    console.error('      supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK=\'<public-jwk>\'');
    console.error('');
    console.error('   2. Deploy the edge functions:');
    console.error('      supabase functions deploy score-broker');
    console.error('      supabase functions deploy score-checker');
    console.error('');
    console.error('   3. Test the deployment:');
    console.error('      npm run phase1:smoke-test');
    console.error('');
    console.error('⚠️  WARNING: Keep the PRIVATE_JWK secret and secure!');
    console.error('   Never commit it to version control.');
    
  } catch (error) {
    console.error('❌ Error generating keypair:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let kid = DEFAULT_KID;

if (args.length > 0) {
  if (args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node scripts/generate-ed25519-jwk.mjs [kid]');
    console.log('');
    console.log('Generates a new Ed25519 keypair for JWT signing.');
    console.log('');
    console.log('Arguments:');
    console.log('  kid    Key ID (default: score-broker-ed25519-v1)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/generate-ed25519-jwk.mjs');
    console.log('  node scripts/generate-ed25519-jwk.mjs score-broker-ed25519-v2');
    console.log('  npm run generate-jwk');
    process.exit(0);
  }
  kid = args[0];
}

generateKeyPair(kid);
