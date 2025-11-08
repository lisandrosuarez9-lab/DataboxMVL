#!/usr/bin/env node
/**
 * rotate-ed25519-key.mjs
 * 
 * Generates a new Ed25519 keypair with a custom kid (key ID) for key rotation.
 * Use this when rotating keys to a new version.
 * 
 * Usage:
 *   node scripts/rotate-ed25519-key.mjs [kid]
 *   npm run rotate-key -- score-broker-ed25519-v2
 * 
 * Arguments:
 *   kid    Key ID for the new keypair (default: score-broker-ed25519-v{timestamp})
 * 
 * Output format:
 *   PRIVATE_JWK={"kty":"OKP","crv":"Ed25519","x":"...","d":"...","kid":"..."}
 *   PUBLIC_JWK={"kty":"OKP","crv":"Ed25519","x":"...","kid":"..."}
 * 
 * Key Rotation Process:
 *   1. Generate new keypair with this script
 *   2. Add new keys to Supabase secrets (keep old keys for now)
 *   3. Update functions to use new kid
 *   4. Deploy updated functions
 *   5. Verify new tokens work
 *   6. Remove old keys from secrets
 */

import * as jose from 'jose';

function generateDefaultKid() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  return `score-broker-ed25519-${timestamp}`;
}

async function rotateKey(kid) {
  try {
    console.error('🔄 Generating new Ed25519 keypair for rotation...');
    console.error(`   Key ID: ${kid}\n`);
    
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
    console.log('# New keypair for key rotation:');
    console.log('#');
    console.log('# Step 1: Add new keys to Supabase secrets (keep old keys):');
    console.log(`SCORE_BROKER_ED25519_JWK='${JSON.stringify(privateJWK)}'`);
    console.log(`SCORE_CHECKER_ED25519_PUBLIC_JWK='${JSON.stringify(publicJWK)}'`);
    console.log('');
    console.log('# Or for environment file (.env.local):');
    console.log(`SCORE_BROKER_ED25519_JWK=${JSON.stringify(privateJWK)}`);
    console.log(`SCORE_CHECKER_ED25519_PUBLIC_JWK=${JSON.stringify(publicJWK)}`);
    console.log('');
    
    console.error('✅ New keypair generated!');
    console.error('');
    console.error('📝 Key Rotation Steps:');
    console.error('');
    console.error('   1. Add new keys to Supabase (keep old keys temporarily):');
    console.error(`      supabase secrets set SCORE_BROKER_ED25519_JWK='<new-private-jwk>'`);
    console.error(`      supabase secrets set SCORE_CHECKER_ED25519_PUBLIC_JWK='<new-public-jwk>'`);
    console.error('');
    console.error('   2. Update function code to use new kid:');
    console.error(`      - Update kid in score-broker: "${kid}"`);
    console.error(`      - Update kid validation in score-checker: "${kid}"`);
    console.error('');
    console.error('   3. Deploy updated functions:');
    console.error('      supabase functions deploy score-broker');
    console.error('      supabase functions deploy score-checker');
    console.error('');
    console.error('   4. Verify new tokens work:');
    console.error('      npm run phase1:smoke-test');
    console.error('');
    console.error('   5. After verification, remove old keys from Supabase:');
    console.error('      supabase secrets unset SCORE_BROKER_ED25519_JWK_OLD');
    console.error('');
    console.error('⚠️  Key Rotation Best Practices:');
    console.error('   - Keep old keys active during transition period');
    console.error('   - Monitor logs for validation errors');
    console.error('   - Have rollback plan ready');
    console.error('   - Rotate keys regularly (e.g., every 90 days)');
    console.error('   - Document rotation dates in your runbook');
    
  } catch (error) {
    console.error('❌ Error generating keypair:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let kid;

if (args.length > 0) {
  if (args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node scripts/rotate-ed25519-key.mjs [kid]');
    console.log('');
    console.log('Generates a new Ed25519 keypair for key rotation.');
    console.log('');
    console.log('Arguments:');
    console.log('  kid    Key ID for the new keypair (optional)');
    console.log('         Default: score-broker-ed25519-{timestamp}');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/rotate-ed25519-key.mjs');
    console.log('  node scripts/rotate-ed25519-key.mjs score-broker-ed25519-v2');
    console.log('  npm run rotate-key');
    console.log('  npm run rotate-key -- score-broker-ed25519-v2');
    console.log('');
    console.log('Key Rotation Process:');
    console.log('  1. Generate new keypair with this script');
    console.log('  2. Add new keys to Supabase (keep old keys)');
    console.log('  3. Update functions to use new kid');
    console.log('  4. Deploy and verify');
    console.log('  5. Remove old keys');
    process.exit(0);
  }
  kid = args[0];
} else {
  kid = generateDefaultKid();
}

rotateKey(kid);
