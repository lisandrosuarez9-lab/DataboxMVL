/**
 * API Response Validation Utilities
 * 
 * Implements strict runtime validation for all API responses using Zod schemas
 * as specified in DIAGNOSTIC LAYER 5 of the troubleshooting protocol.
 */

import { z } from 'zod';
import type {
  ScoreResponse,
  ScoreTrend,
  PersonaWithScore,
  AuditEntry,
  DashboardKPIs,
  SimulationResult,
  ToggleFlagResult,
  HealthCheckResponse,
  APIErrorResponse,
  ValidationResult
} from '../types/api-contracts';

// Install zod if not already present
// npm install zod

// Base schemas for common types
const timestampSchema = z.string().datetime();
const uuidSchema = z.string().uuid();

// Score explanation schema
const scoreExplanationSchema = z.object({
  features: z.record(z.string(), z.number()),
  weights: z.record(z.string(), z.number()),
  contributions: z.record(z.string(), z.number()),
  raw_score: z.number(),
  normalized_score: z.number(),
  risk_factors: z.array(z.string()).optional(),
  model_version: z.string().optional()
});

// Score response schema
const scoreResponseSchema = z.object({
  id: uuidSchema,
  persona_id: uuidSchema,
  model_id: uuidSchema,
  score: z.number().min(0).max(1000),
  computed_at: timestampSchema,
  explanation: scoreExplanationSchema,
  risk_band: z.string(),
  recommendation: z.string(),
  confidence_level: z.number().min(0).max(1).optional(),
  version: z.string().optional()
});

// Score trend schema
const scoreTrendSchema = z.array(z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  year: z.number().int().min(2020).max(2030),
  average_score: z.number().min(0).max(1000),
  count: z.number().int().min(0),
  min_score: z.number().min(0).max(1000).optional(),
  max_score: z.number().min(0).max(1000).optional(),
  percentile_25: z.number().min(0).max(1000).optional(),
  percentile_75: z.number().min(0).max(1000).optional()
}));

// Persona schema
const personaSchema = z.object({
  id: uuidSchema,
  nombre: z.string().min(1),
  documento_id: z.string().min(1),
  user_id_review_needed: z.boolean(),
  is_test: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.optional(),
  latest_score: z.number().min(0).max(1000).optional(),
  latest_risk_band: z.string().optional(),
  score_computed_at: timestampSchema.optional(),
  score_trend: z.enum(['up', 'down', 'stable']).optional()
});

// Audit entry schema
const auditEntrySchema = z.object({
  audit_id: uuidSchema,
  persona_id: uuidSchema,
  field_name: z.string(),
  old_value: z.any(),
  new_value: z.any(),
  changed_by: z.string(),
  changed_at: timestampSchema,
  change_type: z.enum(['create', 'update', 'delete', 'flag_toggle']),
  ip_address: z.string().optional(),
  user_agent: z.string().optional()
});

// KPI schema
const kpiSchema = z.object({
  totalPersonas: z.number().int().min(0),
  flaggedPersonas: z.number().int().min(0),
  auditEntries: z.number().int().min(0),
  lastUpdated: timestampSchema,
  averageScore: z.number().min(0).max(1000).optional(),
  scoreDistribution: z.record(z.string(), z.number()).optional(),
  recentActivity: z.number().int().min(0).optional(),
  systemHealth: z.enum(['healthy', 'warning', 'critical']).optional()
});

// Simulation result schema
const simulationResultSchema = z.object({
  persona_id: uuidSchema,
  original_score: z.number().min(0).max(1000),
  simulated_score: z.number().min(0).max(1000),
  score_change: z.number(),
  score_change_percentage: z.number(),
  explanation: scoreExplanationSchema,
  computed_at_simulation: timestampSchema,
  feature_impacts: z.record(z.string(), z.object({
    original_value: z.any(),
    simulated_value: z.any(),
    impact_on_score: z.number()
  }))
});

// Toggle flag result schema
const toggleFlagResultSchema = z.object({
  success: z.boolean(),
  persona_id: uuidSchema,
  old_flag_status: z.boolean(),
  new_flag_status: z.boolean(),
  audit_id: uuidSchema,
  timestamp: timestampSchema,
  changed_by: z.string()
});

// Health check schema
const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: timestampSchema,
  version: z.string(),
  uptime: z.number().min(0),
  database: z.object({
    connected: z.boolean(),
    response_time_ms: z.number().min(0)
  }),
  external_services: z.object({
    supabase_auth: z.boolean(),
    supabase_storage: z.boolean()
  }),
  performance: z.object({
    memory_usage_mb: z.number().min(0),
    cpu_usage_percent: z.number().min(0).max(100)
  })
});

// Error response schema
const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
  code: z.string().optional(),
  timestamp: timestampSchema.optional(),
  request_id: z.string().optional(),
  validation_errors: z.record(z.string(), z.array(z.string())).optional()
});

// Generic validation function
function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  schemaName: string
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      valid: true,
      data: validatedData,
      schema_version: '1.0'
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => 
        `${err.path.join('.')}: ${err.message}`
      );
      return {
        valid: false,
        errors,
        schema_version: '1.0'
      };
    }
    return {
      valid: false,
      errors: [`Validation failed for ${schemaName}: ${error.message}`],
      schema_version: '1.0'
    };
  }
}

// Specific validation functions for each API endpoint
export function validateScoreResponse(data: unknown): ValidationResult<ScoreResponse> {
  return validateWithSchema(scoreResponseSchema, data, 'ScoreResponse');
}

export function validateScoreTrend(data: unknown): ValidationResult<ScoreTrend[]> {
  return validateWithSchema(scoreTrendSchema, data, 'ScoreTrend');
}

export function validatePersonaList(data: unknown): ValidationResult<PersonaWithScore[]> {
  const arraySchema = z.array(personaSchema);
  return validateWithSchema(arraySchema, data, 'PersonaList');
}

export function validateAuditEntries(data: unknown): ValidationResult<AuditEntry[]> {
  const arraySchema = z.array(auditEntrySchema);
  return validateWithSchema(arraySchema, data, 'AuditEntries');
}

export function validateKPIs(data: unknown): ValidationResult<DashboardKPIs> {
  return validateWithSchema(kpiSchema, data, 'DashboardKPIs');
}

export function validateSimulationResult(data: unknown): ValidationResult<SimulationResult> {
  return validateWithSchema(simulationResultSchema, data, 'SimulationResult');
}

export function validateToggleFlagResult(data: unknown): ValidationResult<ToggleFlagResult> {
  return validateWithSchema(toggleFlagResultSchema, data, 'ToggleFlagResult');
}

export function validateHealthCheck(data: unknown): ValidationResult<HealthCheckResponse> {
  return validateWithSchema(healthCheckSchema, data, 'HealthCheck');
}

export function validateErrorResponse(data: unknown): ValidationResult<APIErrorResponse> {
  return validateWithSchema(errorResponseSchema, data, 'ErrorResponse');
}

// Comprehensive API response validator
export function validateAPIResponse(
  data: unknown,
  expectedType: string
): ValidationResult<any> {
  // First check if it's an error response
  if (typeof data === 'object' && data !== null && 'error' in data) {
    return validateErrorResponse(data);
  }

  // Route to specific validator based on expected type
  switch (expectedType.toLowerCase()) {
    case 'score':
    case 'score_response':
      return validateScoreResponse(data);
    
    case 'trend':
    case 'score_trend':
      return validateScoreTrend(data);
    
    case 'personas':
    case 'persona_list':
      return validatePersonaList(data);
    
    case 'audit':
    case 'audit_entries':
      return validateAuditEntries(data);
    
    case 'kpis':
    case 'dashboard_kpis':
      return validateKPIs(data);
    
    case 'simulation':
    case 'simulation_result':
      return validateSimulationResult(data);
    
    case 'toggle':
    case 'toggle_result':
      return validateToggleFlagResult(data);
    
    case 'health':
    case 'health_check':
      return validateHealthCheck(data);
    
    default:
      return {
        valid: false,
        errors: [`Unknown expected type: ${expectedType}`],
        warnings: ['Skipping validation for unknown type'],
        schema_version: '1.0'
      };
  }
}

// Validation statistics tracking
let validationStats = {
  total: 0,
  successful: 0,
  failed: 0,
  byType: {} as Record<string, { success: number; failure: number }>
};

// Enhanced validator with statistics
export function validateAPIResponseWithStats(
  data: unknown,
  expectedType: string
): ValidationResult<any> {
  const result = validateAPIResponse(data, expectedType);
  
  // Update statistics
  validationStats.total++;
  if (result.valid) {
    validationStats.successful++;
  } else {
    validationStats.failed++;
  }
  
  if (!validationStats.byType[expectedType]) {
    validationStats.byType[expectedType] = { success: 0, failure: 0 };
  }
  
  if (result.valid) {
    validationStats.byType[expectedType].success++;
  } else {
    validationStats.byType[expectedType].failure++;
  }
  
  return result;
}

// Get validation statistics
export function getValidationStats() {
  return { ...validationStats };
}

// Reset validation statistics
export function resetValidationStats() {
  validationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    byType: {}
  };
}

// Generate validation report
export function generateValidationReport(): string {
  const stats = getValidationStats();
  const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0';
  
  return `
## API Response Validation Report
Generated at: ${new Date().toISOString()}

### Overall Statistics
- **Total Validations**: ${stats.total}
- **Successful**: ${stats.successful}
- **Failed**: ${stats.failed}
- **Success Rate**: ${successRate}%

### By Response Type
${Object.entries(stats.byType).map(([type, typeStats]) => {
  const typeTotal = typeStats.success + typeStats.failure;
  const typeSuccessRate = typeTotal > 0 ? ((typeStats.success / typeTotal) * 100).toFixed(1) : '0';
  return `
#### ${type}
- Total: ${typeTotal}
- Success: ${typeStats.success}
- Failure: ${typeStats.failure}
- Success Rate: ${typeSuccessRate}%`;
}).join('\n')}

### Recommendations
${stats.failed > 0 ? `
- ${stats.failed} validation failures detected
- Review API response structures for consistency
- Check backend implementation against TypeScript contracts
- Consider updating schemas if API has changed
` : `
- All validations passing ✅
- API responses are consistent with contracts
- Continue monitoring for any changes
`}
  `;
}