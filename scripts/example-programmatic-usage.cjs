#!/usr/bin/env node

/**
 * Example: Using the Launch Agent Programmatically
 * 
 * This example demonstrates how to use the launch agent as a module
 * in your own automation scripts or CI/CD pipelines.
 */

const { main, AGENT_CONFIG, AGENT_STATE } = require('./launch-agent.cjs');

// Example 1: Run with custom configuration
async function runWithCustomConfig() {
  console.log('Example 1: Running with custom configuration\n');
  
  // Override default config (optional)
  AGENT_CONFIG.dryRun = true;
  AGENT_CONFIG.verbose = true;
  AGENT_CONFIG.contractPath = './launch-contract.json';
  AGENT_CONFIG.skipSteps = [4, 5]; // Skip deployment and smoke test
  
  try {
    await main();
    
    // Access results
    console.log('\n--- Results ---');
    console.log('Run ID:', AGENT_CONFIG.runId);
    console.log('Status:', AGENT_STATE.errors.length === 0 ? 'SUCCESS' : 'FAILED');
    console.log('Checks passed:', Object.values(AGENT_STATE.checks).filter(Boolean).length);
    console.log('Total checks:', Object.keys(AGENT_STATE.checks).length);
    
    if (AGENT_STATE.errors.length > 0) {
      console.log('\nErrors:');
      AGENT_STATE.errors.forEach(err => {
        console.log(`  - [${err.code}] ${err.message}`);
      });
    }
    
    console.log('\nArtifacts:');
    Object.entries(AGENT_STATE.artifacts).forEach(([key, path]) => {
      console.log(`  - ${key}: ${path}`);
    });
    
  } catch (error) {
    console.error('Launch agent failed:', error.message);
    process.exit(1);
  }
}

// Example 2: Validate environment only (no deployment)
async function validateEnvironmentOnly() {
  console.log('Example 2: Environment validation only\n');
  
  AGENT_CONFIG.dryRun = true;
  AGENT_CONFIG.skipSteps = [2, 3, 4, 5]; // Skip everything after validation
  
  try {
    await main();
    
    const allValid = AGENT_STATE.checks.contract_valid && 
                     AGENT_STATE.checks.files_written;
    
    console.log('\n--- Environment Validation ---');
    console.log('Contract valid:', AGENT_STATE.checks.contract_valid ? '✅' : '❌');
    console.log('Files valid:', AGENT_STATE.checks.files_written ? '✅' : '❌');
    console.log('Overall:', allValid ? 'READY' : 'NOT READY');
    
    return allValid;
    
  } catch (error) {
    console.error('Validation failed:', error.message);
    return false;
  }
}

// Example 3: Deploy with pre-flight checks
async function deployWithPreFlightChecks() {
  console.log('Example 3: Deploy with pre-flight checks\n');
  
  // First validate
  AGENT_CONFIG.dryRun = true;
  AGENT_CONFIG.skipSteps = [2, 3, 4, 5];
  
  try {
    console.log('Running pre-flight validation...');
    await main();
    
    if (!AGENT_STATE.checks.contract_valid || !AGENT_STATE.checks.files_written) {
      throw new Error('Pre-flight validation failed');
    }
    
    console.log('✅ Pre-flight passed\n');
    
    // Now do actual deployment
    console.log('Running full deployment...');
    AGENT_CONFIG.dryRun = false;
    AGENT_CONFIG.skipSteps = [];
    
    await main();
    
    if (AGENT_STATE.errors.length === 0) {
      console.log('\n🎉 Deployment successful!');
      return true;
    } else {
      console.error('\n❌ Deployment had errors');
      return false;
    }
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    return false;
  }
}

// Example 4: Custom error handling
async function deployWithCustomErrorHandling() {
  console.log('Example 4: Deploy with custom error handling\n');
  
  try {
    await main();
    
    // Custom error handling
    for (const error of AGENT_STATE.errors) {
      switch (error.code) {
        case 'BUILD_FAILED':
          console.log('🔧 Build failed. Sending notification...');
          // Send notification to team
          break;
          
        case 'FUNCTION_AUTH_REQUIRED':
          console.log('🔐 Function requires auth. Updating configuration...');
          // Update function configuration
          break;
          
        case 'SITE_NOT_LIVE':
          console.log('⏰ Site not live yet. Will retry in 5 minutes...');
          // Schedule retry
          break;
          
        case 'SECRET_IN_REPO':
          console.log('🚨 SECRET DETECTED! Rotating keys immediately...');
          // Trigger emergency key rotation
          break;
          
        default:
          console.log(`⚠️  Unknown error: ${error.code}`);
      }
    }
    
    return AGENT_STATE.errors.length === 0;
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    return false;
  }
}

// Example 5: Integration with monitoring/telemetry
async function deployWithMonitoring() {
  console.log('Example 5: Deploy with monitoring integration\n');
  
  const startTime = Date.now();
  const deploymentId = AGENT_CONFIG.runId;
  
  try {
    console.log(`Starting deployment ${deploymentId}...`);
    
    // Send start event to monitoring
    sendMetric('deployment.started', { deploymentId });
    
    await main();
    
    const duration = Date.now() - startTime;
    const success = AGENT_STATE.errors.length === 0;
    
    // Send completion metrics
    sendMetric('deployment.completed', {
      deploymentId,
      duration,
      success,
      checks: AGENT_STATE.checks,
      errorCount: AGENT_STATE.errors.length
    });
    
    // Send individual check results
    Object.entries(AGENT_STATE.checks).forEach(([check, passed]) => {
      sendMetric(`deployment.check.${check}`, { passed });
    });
    
    return success;
    
  } catch (error) {
    sendMetric('deployment.failed', {
      deploymentId,
      error: error.message
    });
    throw error;
  }
}

// Mock function for example
function sendMetric(name, data) {
  console.log(`📊 Metric: ${name}`, JSON.stringify(data, null, 2));
}

// Run examples
async function runExamples() {
  const exampleNum = process.argv[2] || '1';
  
  console.log('=' .repeat(70));
  console.log('Launch Agent Programmatic Usage Examples');
  console.log('=' .repeat(70) + '\n');
  
  switch (exampleNum) {
    case '1':
      await runWithCustomConfig();
      break;
    case '2':
      await validateEnvironmentOnly();
      break;
    case '3':
      await deployWithPreFlightChecks();
      break;
    case '4':
      await deployWithCustomErrorHandling();
      break;
    case '5':
      await deployWithMonitoring();
      break;
    default:
      console.log('Usage: node example-programmatic-usage.cjs [1-5]');
      console.log('\nExamples:');
      console.log('  1 - Run with custom configuration');
      console.log('  2 - Validate environment only');
      console.log('  3 - Deploy with pre-flight checks');
      console.log('  4 - Custom error handling');
      console.log('  5 - Integration with monitoring');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runExamples().catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runWithCustomConfig,
  validateEnvironmentOnly,
  deployWithPreFlightChecks,
  deployWithCustomErrorHandling,
  deployWithMonitoring
};
