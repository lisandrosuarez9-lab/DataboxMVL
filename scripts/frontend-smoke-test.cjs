#!/usr/bin/env node

/**
 * Frontend Smoke Test Script
 * 
 * CI-compatible smoke test that verifies the frontend mandate requirements.
 * Can be run in CI/CD pipeline or manually for verification.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'https://lisandrosuarez9-lab.github.io/DataboxMVL',
  timeout: 30000,
  retries: 3
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

function logTest(name, passed, message, details = null) {
  const result = {
    name,
    passed,
    message,
    timestamp: new Date().toISOString(),
    details
  };
  
  testResults.tests.push(result);
  testResults.total++;
  
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${message}`);
  }
  
  if (details) {
    console.log(`   Details: ${JSON.stringify(details)}`);
  }
}

function testFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  
  logTest(
    `File Check: ${description}`,
    exists,
    exists ? `File exists: ${filePath}` : `File missing: ${filePath}`,
    { path: filePath, fullPath }
  );
  
  return exists;
}

function testDirectoryStructure() {
  console.log('\n🏗️  Testing Directory Structure...');
  
  // Core files that must exist for frontend mandate
  const requiredFiles = [
    { path: 'src/utils/api.ts', desc: 'API Client' },
    { path: 'src/utils/verificationChecklist.ts', desc: 'Verification Checklist' },
    { path: 'src/utils/pollingConfig.ts', desc: 'Polling Configuration' },
    { path: 'src/components/ui/ConnectivityBanner.tsx', desc: 'Connectivity Banner' },
    { path: 'src/components/ui/RoleBanner.tsx', desc: 'Role Banner' },
    { path: 'src/components/dashboard/SimulationPanel.tsx', desc: 'Simulation Panel' },
    { path: 'src/pages/DashboardPage.tsx', desc: 'Dashboard Page' },
    { path: 'src/hooks/useAPI.ts', desc: 'API Hooks' }
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    if (!testFileExists(file.path, file.desc)) {
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

function testBuildArtifacts() {
  console.log('\n📦 Testing Build Artifacts...');
  
  const buildFiles = [
    { path: 'dist/index.html', desc: 'Main HTML file' },
    { path: 'package.json', desc: 'Package configuration' },
    { path: 'vite.config.ts', desc: 'Vite configuration' }
  ];
  
  let allBuildsExist = true;
  buildFiles.forEach(file => {
    if (!testFileExists(file.path, file.desc)) {
      allBuildsExist = false;
    }
  });
  
  return allBuildsExist;
}

function testCodeStructure() {
  console.log('\n🔍 Testing Code Structure...');
  
  try {
    // Test API client structure
    const apiClientPath = path.join(__dirname, '..', 'src/utils/api.ts');
    const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
    
    const requiredAPIFeatures = [
      'getPersonas',
      'getPersonaExplanation', 
      'getAuditEntries',
      'getKPIs',
      'getConnectivityStatus',
      'togglePersonaFlag',
      'simulateScore',
      'isCompliance',
      'isServiceRole',
      'isAnonymous'
    ];
    
    let missingFeatures = [];
    requiredAPIFeatures.forEach(feature => {
      if (!apiClientContent.includes(feature)) {
        missingFeatures.push(feature);
      }
    });
    
    logTest(
      'API Client Features',
      missingFeatures.length === 0,
      missingFeatures.length === 0 
        ? 'All required API methods implemented'
        : `Missing API methods: ${missingFeatures.join(', ')}`,
      { missing: missingFeatures, total: requiredAPIFeatures.length }
    );
    
    // Test verification checklist
    const checklistPath = path.join(__dirname, '..', 'src/utils/verificationChecklist.ts');
    const checklistContent = fs.readFileSync(checklistPath, 'utf8');
    
    const requiredTests = [
      'testJWTAuthentication',
      'testConnectivity', 
      'testPersonasAPI',
      'testPersonaExplanation',
      'testAuditAPI',
      'testKPIsAPI',
      'testRoleEnforcement'
    ];
    
    let missingTests = [];
    requiredTests.forEach(test => {
      if (!checklistContent.includes(test)) {
        missingTests.push(test);
      }
    });
    
    logTest(
      'Verification Tests',
      missingTests.length === 0,
      missingTests.length === 0
        ? 'All required verification tests implemented'
        : `Missing verification tests: ${missingTests.join(', ')}`,
      { missing: missingTests, total: requiredTests.length }
    );
    
    return missingFeatures.length === 0 && missingTests.length === 0;
    
  } catch (error) {
    logTest(
      'Code Structure Analysis',
      false,
      `Failed to analyze code structure: ${error.message}`,
      { error: error.message }
    );
    return false;
  }
}

function testEnvironmentConfiguration() {
  console.log('\n⚙️  Testing Environment Configuration...');
  
  // Check package.json for required scripts
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredScripts = ['build', 'preview', 'dev', 'lint'];
    let missingScripts = [];
    
    requiredScripts.forEach(script => {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        missingScripts.push(script);
      }
    });
    
    logTest(
      'Package Scripts',
      missingScripts.length === 0,
      missingScripts.length === 0
        ? 'All required npm scripts present'
        : `Missing npm scripts: ${missingScripts.join(', ')}`,
      { missing: missingScripts, available: Object.keys(packageJson.scripts || {}) }
    );
    
    // Check for security compliance (no service_role key)
    const hasServiceRoleKey = packageJson.scripts && 
      Object.values(packageJson.scripts).some(script => 
        typeof script === 'string' && script.includes('service_role')
      );
    
    logTest(
      'Security Compliance',
      !hasServiceRoleKey,
      hasServiceRoleKey 
        ? 'SECURITY ISSUE: service_role key found in package.json'
        : 'No service_role key in frontend configuration (compliant)',
      { serviceRoleKeyFound: hasServiceRoleKey }
    );
    
    return missingScripts.length === 0 && !hasServiceRoleKey;
    
  } catch (error) {
    logTest(
      'Environment Configuration',
      false,
      `Failed to check environment: ${error.message}`,
      { error: error.message }
    );
    return false;
  }
}

function generateReport() {
  console.log('\n📊 Generating Test Report...');
  
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0
    },
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: TEST_CONFIG.baseUrl,
      nodeVersion: process.version,
      platform: process.platform
    },
    tests: testResults.tests
  };
  
  // Write report to file
  const reportPath = path.join(__dirname, '..', 'frontend-smoke-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Console summary
  console.log('\n📋 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Success Rate: ${report.summary.successRate}%`);
  console.log(`Report saved to: ${reportPath}`);
  
  return report;
}

async function runSmokeTest() {
  console.log('🧪 Frontend Smoke Test Starting...');
  console.log(`Target: ${TEST_CONFIG.baseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  try {
    // Run all test categories
    const structureOk = testDirectoryStructure();
    const buildsOk = testBuildArtifacts();
    const codeOk = testCodeStructure();
    const envOk = testEnvironmentConfiguration();
    
    // Generate final report
    const report = generateReport();
    
    // Overall result
    const overallSuccess = report.summary.failed === 0;
    
    console.log('\n🎯 FINAL RESULT');
    console.log('===============');
    if (overallSuccess) {
      console.log('✅ SMOKE TEST PASSED - Frontend ready for deployment');
      process.exit(0);
    } else {
      console.log('❌ SMOKE TEST FAILED - Issues need to be addressed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 SMOKE TEST ERROR');
    console.error('===================');
    console.error(`Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSmokeTest();
}

module.exports = {
  runSmokeTest,
  TEST_CONFIG,
  testResults
};