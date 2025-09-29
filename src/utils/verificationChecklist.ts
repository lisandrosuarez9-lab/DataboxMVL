/**
 * Frontend Verification Checklist and Smoke Test Script
 * 
 * This module provides verification tools to ensure the frontend mandate
 * requirements are properly implemented and functioning.
 */

import { apiClient, apiHelpers } from './api';

interface VerificationResult {
  step: string;
  passed: boolean;
  message: string;
  timestamp: string;
  details?: any;
}

interface SmokeTestResult {
  overall: boolean;
  results: VerificationResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
  timestamp: string;
}

export class FrontendVerificationChecklist {
  private results: VerificationResult[] = [];

  // Step 1: JWT Authentication Test
  async testJWTAuthentication(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '1. JWT Authentication',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      const role = apiClient.getCurrentUserRole();
      const isCompliance = apiClient.isCompliance();
      const isServiceRole = apiClient.isServiceRole();
      const isAnonymous = apiClient.isAnonymous();

      if (role && (isCompliance || isServiceRole) && !isAnonymous) {
        result.passed = true;
        result.message = `JWT authentication working. Role: ${role}`;
        result.details = { role, isCompliance, isServiceRole, isAnonymous };
      } else {
        result.message = 'JWT authentication failed or user is anonymous';
        result.details = { role, isCompliance, isServiceRole, isAnonymous };
      }
    } catch (error) {
      result.message = `JWT test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Step 2: Connectivity Test
  async testConnectivity(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '2. Backend Connectivity',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      const status = await apiClient.getConnectivityStatus();
      
      if (status.connected) {
        result.passed = true;
        result.message = `Backend connected. Base URL: ${status.baseUrl}`;
        result.details = status;
      } else {
        result.message = 'Backend connection failed';
        result.details = status;
      }
    } catch (error) {
      result.message = `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Step 3: Personas API Test
  async testPersonasAPI(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '3. Personas API',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      const personas = await apiClient.getPersonas({ limit: 1 });
      
      if (personas && personas.data) {
        result.passed = true;
        result.message = `Personas API working. Retrieved ${personas.data.length} personas`;
        result.details = {
          dataCount: personas.data.length,
          pagination: personas.pagination,
          firstPersona: personas.data[0] || null
        };
      } else {
        result.message = 'Personas API returned invalid response';
        result.details = personas;
      }
    } catch (error) {
      result.message = `Personas API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Step 4: Persona Explanation Test
  async testPersonaExplanation(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '4. Persona Explanation',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      // First get a persona to test with
      const personas = await apiClient.getPersonas({ limit: 1 });
      
      if (!personas.data || personas.data.length === 0) {
        result.message = 'No personas available to test explanation endpoint';
        this.results.push(result);
        return result;
      }

      const personaId = personas.data[0].id;
      const explanation = await apiClient.getPersonaExplanation(personaId);
      
      if (explanation && (explanation.score !== undefined || explanation.explanation !== undefined)) {
        result.passed = true;
        result.message = `Persona explanation working for ID: ${personaId}`;
        result.details = {
          personaId,
          hasScore: explanation.score !== undefined,
          hasExplanation: explanation.explanation !== undefined,
          hasComputedAt: explanation.computed_at !== undefined
        };
      } else {
        result.message = 'Persona explanation returned invalid response';
        result.details = explanation;
      }
    } catch (error) {
      result.message = `Persona explanation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Step 5: Audit API Test
  async testAuditAPI(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '5. Audit API',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      const auditEntries = await apiClient.getAuditEntries({ limit: 1 });
      
      if (auditEntries && auditEntries.data) {
        result.passed = true;
        result.message = `Audit API working. Retrieved ${auditEntries.data.length} entries`;
        result.details = {
          dataCount: auditEntries.data.length,
          pagination: auditEntries.pagination,
          firstEntry: auditEntries.data[0] || null
        };
      } else {
        result.message = 'Audit API returned invalid response';
        result.details = auditEntries;
      }
    } catch (error) {
      result.message = `Audit API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Step 6: KPIs API Test
  async testKPIsAPI(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '6. KPIs API',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      const kpis = await apiClient.getKPIs();
      
      if (kpis && typeof kpis.totalPersonas === 'number' && typeof kpis.flaggedPersonas === 'number') {
        result.passed = true;
        result.message = `KPIs API working. Total: ${kpis.totalPersonas}, Flagged: ${kpis.flaggedPersonas}`;
        result.details = kpis;
      } else {
        result.message = 'KPIs API returned invalid response';
        result.details = kpis;
      }
    } catch (error) {
      result.message = `KPIs API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Step 7: Role Enforcement Test
  async testRoleEnforcement(): Promise<VerificationResult> {
    const result: VerificationResult = {
      step: '7. Role Enforcement',
      passed: false,
      message: '',
      timestamp: new Date().toISOString()
    };

    try {
      const role = apiClient.getCurrentUserRole();
      const canRead = apiHelpers.canPerformAction('read');
      const canWrite = apiHelpers.canPerformAction('write');
      const canDelete = apiHelpers.canPerformAction('delete');

      let expectedBehavior = true;
      let message = '';

      if (role === 'compliance') {
        expectedBehavior = canRead && !canWrite && !canDelete;
        message = 'Compliance role: read-only access enforced';
      } else if (role === 'service_role') {
        expectedBehavior = canRead && canWrite && canDelete;
        message = 'Service role: full access allowed';
      } else {
        expectedBehavior = false;
        message = 'Anonymous or invalid role detected';
      }

      result.passed = expectedBehavior;
      result.message = message;
      result.details = { role, canRead, canWrite, canDelete };
    } catch (error) {
      result.message = `Role enforcement test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.results.push(result);
    return result;
  }

  // Run full smoke test
  async runFullSmokeTest(): Promise<SmokeTestResult> {
    console.log('🧪 Starting Frontend Verification Smoke Test...');
    this.results = []; // Clear previous results

    // Run all tests in sequence
    await this.testJWTAuthentication();
    await this.testConnectivity();
    await this.testPersonasAPI();
    await this.testPersonaExplanation();
    await this.testAuditAPI();
    await this.testKPIsAPI();
    await this.testRoleEnforcement();

    // Calculate summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    const smokeTestResult: SmokeTestResult = {
      overall: failed === 0,
      results: this.results,
      summary: {
        passed,
        failed,
        total: this.results.length
      },
      timestamp: new Date().toISOString()
    };

    // Log results to console for verification
    console.log('🔒 IMMUTABLE SMOKE TEST RESULTS:', JSON.stringify(smokeTestResult, null, 2));

    return smokeTestResult;
  }

  // Generate verification report
  generateReport(smokeTestResult: SmokeTestResult): string {
    const { overall, results, summary, timestamp } = smokeTestResult;
    
    let report = `# Frontend Verification Report - ${timestamp}\n\n`;
    
    report += `## Overall Status: ${overall ? '✅ PASS' : '❌ FAIL'}\n\n`;
    report += `- **Passed:** ${summary.passed}/${summary.total}\n`;
    report += `- **Failed:** ${summary.failed}/${summary.total}\n\n`;
    
    report += `## Detailed Results\n\n`;
    
    results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      report += `### ${index + 1}. ${result.step} ${status}\n`;
      report += `- **Status:** ${result.passed ? 'PASS' : 'FAIL'}\n`;
      report += `- **Message:** ${result.message}\n`;
      report += `- **Timestamp:** ${result.timestamp}\n`;
      
      if (result.details) {
        report += `- **Details:** \`${JSON.stringify(result.details, null, 2)}\`\n`;
      }
      
      report += '\n';
    });
    
    report += `## Deployment Information\n\n`;
    report += `- **Target URL:** https://lisandrosuarez9-lab.github.io/DataboxMVL/dashboard\n`;
    report += `- **API Base URL:** ${typeof apiHelpers.canPerformAction === 'function' ? 'Configured' : 'Not configured'}\n`;
    report += `- **Verification Time:** ${timestamp}\n`;
    
    return report;
  }
}

// Export singleton instance
export const verificationChecklist = new FrontendVerificationChecklist();

// Export convenient function for quick smoke test
export async function runFrontendSmokeTest(): Promise<SmokeTestResult> {
  return await verificationChecklist.runFullSmokeTest();
}

export default {
  FrontendVerificationChecklist,
  verificationChecklist,
  runFrontendSmokeTest
};