import { creditScoringAPI, checkAPIConnection } from '../frontend/lib/api-client';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  data?: any;
}

class CreditScoringTester {
  private results: TestResult[] = [];
  
  private async runTest(
    testName: string, 
    testFn: () => Promise<any>,
    skipCondition?: boolean
  ): Promise<TestResult> {
    if (skipCondition) {
      const result: TestResult = {
        testName,
        status: 'SKIP',
        duration: 0,
        error: 'Test skipped due to condition'
      };
      this.results.push(result);
      return result;
    }

    const startTime = performance.now();
    
    try {
      const data = await testFn();
      const duration = performance.now() - startTime;
      
      const result: TestResult = {
        testName,
        status: 'PASS',
        duration,
        data
      };
      
      this.results.push(result);
      console.log(`✅ ${testName} - ${duration.toFixed(2)}ms`);
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      
      const result: TestResult = {
        testName,
        status: 'FAIL',
        duration,
        error: error.message
      };
      
      this.results.push(result);
      console.error(`❌ ${testName} - ${error.message}`);
      return result;
    }
  }

  async testAPIConnection(): Promise<TestResult> {
    return this.runTest('API Connection', async () => {
      const result = await checkAPIConnection();
      
      if (!result.connected) {
        throw new Error(`API not accessible: ${result.error}`);
      }
      
      return {
        url: result.url,
        responseTime: result.responseTime,
        workingEndpoints: result.endpoints.filter(e => e.status === 'success').length,
        totalEndpoints: result.endpoints.length
      };
    });
  }

  async testHealthEndpoint(): Promise<TestResult> {
    return this.runTest('Health Check', async () => {
      const health = await creditScoringAPI.healthCheck();
      
      if (health.status !== 'healthy') {
        throw new Error(`API unhealthy: ${health.status}`);
      }
      
      return health;
    });
  }

  async testPersonasEndpoint(): Promise<TestResult> {
    return this.runTest('Personas List', async () => {
      const personas = await creditScoringAPI.getPersonas();
      
      if (!Array.isArray(personas.data)) {
        throw new Error('Personas data is not an array');
      }
      
      return {
        count: personas.data.length,
        sample: personas.data.slice(0, 2)
      };
    });
  }

  async testKPIsEndpoint(): Promise<TestResult> {
    return this.runTest('KPIs', async () => {
      const kpis = await creditScoringAPI.getKPIs();
      
      const requiredFields = ['totalPersonas', 'flaggedPersonas', 'auditEntries', 'lastUpdated'];
      const missingFields = requiredFields.filter(field => !(field in kpis.data));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing KPI fields: ${missingFields.join(', ')}`);
      }
      
      return kpis.data;
    });
  }

  async testScoreComputation(): Promise<TestResult> {
    // This test requires a valid persona ID, so we'll get it from the personas list first
    const personasResult = this.results.find(r => r.testName === 'Personas List');
    const hasPersonas = personasResult?.status === 'PASS' && personasResult.data?.count > 0;
    
    return this.runTest('Score Computation', async () => {
      if (!hasPersonas) {
        throw new Error('No personas available for testing');
      }
      
      const testPersonaId = personasResult.data.sample[0]?.id;
      if (!testPersonaId) {
        throw new Error('No valid persona ID found');
      }
      
      // Test score computation with mock data
      const scoreData = {
        income: 50000,
        debt: 10000,
        credit_history_length: 5,
        payment_history: 0.95
      };
      
      const result = await creditScoringAPI.computeScore(testPersonaId, scoreData);
      
      if (typeof result.data.score !== 'number') {
        throw new Error('Score is not a number');
      }
      
      if (result.data.score < 0 || result.data.score > 1000) {
        throw new Error('Score is out of valid range (0-1000)');
      }
      
      return {
        personaId: testPersonaId,
        score: result.data.score,
        riskBand: result.data.risk_band
      };
    }, !hasPersonas);
  }

  async testScoreExplanation(): Promise<TestResult> {
    const scoreResult = this.results.find(r => r.testName === 'Score Computation');
    const hasScore = scoreResult?.status === 'PASS';
    
    return this.runTest('Score Explanation', async () => {
      if (!hasScore) {
        throw new Error('Score computation must pass first');
      }
      
      const personaId = scoreResult.data.personaId;
      const explanation = await creditScoringAPI.getScoreExplanation(personaId);
      
      const requiredFields = ['score', 'explanation', 'computed_at'];
      const missingFields = requiredFields.filter(field => !(field in explanation.data));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing explanation fields: ${missingFields.join(', ')}`);
      }
      
      return {
        personaId,
        hasExplanation: !!explanation.data.explanation,
        fieldsCount: Object.keys(explanation.data.explanation.features || {}).length
      };
    }, !hasScore);
  }

  async testScoreTrend(): Promise<TestResult> {
    const scoreResult = this.results.find(r => r.testName === 'Score Computation');
    const hasScore = scoreResult?.status === 'PASS';
    
    return this.runTest('Score Trend', async () => {
      if (!hasScore) {
        throw new Error('Score computation must pass first');
      }
      
      const personaId = scoreResult.data.personaId;
      const trend = await creditScoringAPI.getScoreTrend(personaId, 6);
      
      if (!Array.isArray(trend.data)) {
        throw new Error('Trend data is not an array');
      }
      
      return {
        personaId,
        dataPoints: trend.data.length,
        timeRange: trend.data.length > 0 ? {
          from: trend.data[0]?.month,
          to: trend.data[trend.data.length - 1]?.month
        } : null
      };
    }, !hasScore);
  }

  async testModelFactors(): Promise<TestResult> {
    return this.runTest('Model Factors', async () => {
      const factors = await creditScoringAPI.getModelFactors();
      
      if (!Array.isArray(factors.data)) {
        throw new Error('Model factors data is not an array');
      }
      
      return {
        factorsCount: factors.data.length,
        sampleFactors: factors.data.slice(0, 3).map((f: any) => ({
          name: f.factor_name,
          weight: f.weight
        }))
      };
    });
  }

  generateReport(): string {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    let report = `
# Credit Scoring API Test Report
Generated at: ${new Date().toISOString()}

## Summary
- **Total Tests**: ${total}
- **Passed**: ✅ ${passed}
- **Failed**: ❌ ${failed}
- **Skipped**: ⏸️ ${skipped}
- **Success Rate**: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%
- **Total Duration**: ${totalDuration.toFixed(2)}ms

## Test Results
`;

    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏸️';
      report += `
### ${status} ${result.testName}
- **Status**: ${result.status}
- **Duration**: ${result.duration.toFixed(2)}ms
${result.error ? `- **Error**: ${result.error}` : ''}
${result.data ? `- **Data**: \`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`` : ''}
`;
    });

    return report;
  }
}

async function testCreditScoring() {
  try {
    console.log('🚀 Starting credit scoring API test...');
    
    const tester = new CreditScoringTester();
    
    // Run tests in sequence
    await tester.testAPIConnection();
    await tester.testHealthEndpoint();
    await tester.testPersonasEndpoint();
    await tester.testKPIsEndpoint();
    await tester.testScoreComputation();
    await tester.testScoreExplanation();
    await tester.testScoreTrend();
    await tester.testModelFactors();
    
    console.log('\n📊 Test Summary:');
    const report = tester.generateReport();
    console.log(report);
    
    return report;
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    throw error;
  }
}

// Export for use in other modules
export { testCreditScoring, CreditScoringTester };

// Run if called directly
if (import.meta.url === new URL(import.meta.resolve('./test-credit-scoring.ts')).href) {
  testCreditScoring();
}