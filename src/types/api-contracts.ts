/**
 * API Contract Type Definitions
 * 
 * Implements strict TypeScript interfaces for API contract verification
 * as specified in DIAGNOSTIC LAYER 5 of the troubleshooting protocol.
 * 
 * These types must match the backend API exactly to ensure type safety.
 */

// Base API response wrapper
export interface BaseAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Paginated response wrapper
export interface PaginatedAPIResponse<T = any> extends BaseAPIResponse<T[]> {
  pagination: PaginationMeta;
}

// Score explanation structure (must match backend exactly)
export interface ScoreExplanation {
  features: Record<string, number>;
  weights: Record<string, number>;
  contributions: Record<string, number>;
  raw_score: number;
  normalized_score: number;
  risk_factors?: string[];
  model_version?: string;
}

// Credit score response (must match backend exactly)
export interface ScoreResponse {
  id: string;
  persona_id: string;
  model_id: string;
  score: number;
  computed_at: string;
  explanation: ScoreExplanation;
  risk_band: string;
  recommendation: string;
  confidence_level?: number;
  version?: string;
}

// Score trend data structure
export interface ScoreTrend {
  month: string;
  year: number;
  average_score: number;
  count: number;
  min_score?: number;
  max_score?: number;
  percentile_25?: number;
  percentile_75?: number;
}

// Score history entry
export interface ScoreHistoryEntry {
  id: string;
  persona_id: string;
  score: number;
  computed_at: string;
  model_id: string;
  risk_band: string;
  change_from_previous?: number;
  change_percentage?: number;
}

// Model factor definition
export interface ModelFactor {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  impact: 'positive' | 'negative' | 'neutral';
  data_type: 'numeric' | 'categorical' | 'boolean';
  min_value?: number;
  max_value?: number;
  possible_values?: string[];
}

// Risk band definition
export interface RiskBand {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  color: string;
  description: string;
  action_required: boolean;
  recommendation_template: string;
}

// Request types for API endpoints
export interface ComputeScoreRequest {
  persona_id: string;
  model_id: string;
  force_recompute?: boolean;
}

export interface ScoreSimulationRequest {
  persona_id: string;
  model_id: string;
  feature_overrides: Record<string, number | string | boolean>;
  include_explanation?: boolean;
}

export interface ScoreTrendRequest {
  persona_id?: string;
  model_id?: string;
  months?: number;
  group_by?: 'month' | 'quarter' | 'year';
}

export interface ScoreHistoryRequest {
  persona_id: string;
  limit?: number;
  offset?: number;
  include_changes?: boolean;
}

// Persona-related types (matching existing structure)
export interface PersonaBase {
  id: string;
  nombre: string;
  documento_id: string;
  user_id_review_needed: boolean;
  is_test: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PersonaWithScore extends PersonaBase {
  latest_score?: number;
  latest_risk_band?: string;
  score_computed_at?: string;
  score_trend?: 'up' | 'down' | 'stable';
}

// Audit-related types
export interface AuditEntry {
  audit_id: string;
  persona_id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  changed_at: string;
  change_type: 'create' | 'update' | 'delete' | 'flag_toggle';
  ip_address?: string;
  user_agent?: string;
}

// KPI/Dashboard metrics
export interface DashboardKPIs {
  totalPersonas: number;
  flaggedPersonas: number;
  auditEntries: number;
  lastUpdated: string;
  averageScore?: number;
  scoreDistribution?: Record<string, number>;
  recentActivity?: number;
  systemHealth?: 'healthy' | 'warning' | 'critical';
}

// Simulation result
export interface SimulationResult {
  persona_id: string;
  original_score: number;
  simulated_score: number;
  score_change: number;
  score_change_percentage: number;
  explanation: ScoreExplanation;
  computed_at_simulation: string;
  feature_impacts: Record<string, {
    original_value: any;
    simulated_value: any;
    impact_on_score: number;
  }>;
}

// Toggle flag result
export interface ToggleFlagResult {
  success: boolean;
  persona_id: string;
  old_flag_status: boolean;
  new_flag_status: boolean;
  audit_id: string;
  timestamp: string;
  changed_by: string;
}

// Error response structure (standardized across all endpoints)
export interface APIErrorResponse {
  error: string;
  message?: string;
  details?: any;
  code?: string;
  timestamp?: string;
  request_id?: string;
  validation_errors?: Record<string, string[]>;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  database: {
    connected: boolean;
    response_time_ms: number;
  };
  external_services: {
    supabase_auth: boolean;
    supabase_storage: boolean;
  };
  performance: {
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
}

// Connectivity status for frontend
export interface ConnectivityStatus {
  connected: boolean;
  lastHandshake: string;
  baseUrl: string;
  responseTime?: number;
  error?: string;
  authenticated: boolean;
  userRole?: string;
}

// Generic API call options
export interface APICallOptions {
  timeout?: number;
  retries?: number;
  validateResponse?: boolean;
  skipAuth?: boolean;
  customHeaders?: Record<string, string>;
}

// Response validation metadata
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  schema_version?: string;
}

// Batch operation types
export interface BatchOperationRequest {
  operations: Array<{
    type: 'compute_score' | 'simulate' | 'toggle_flag';
    persona_id: string;
    parameters?: any;
  }>;
  continue_on_error?: boolean;
}

export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    persona_id: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
}

// Export utility type for API endpoint responses
export type APIEndpointResponse<T> = BaseAPIResponse<T> | PaginatedAPIResponse<T>;

// Type guards for runtime validation
export const isBaseAPIResponse = (obj: any): obj is BaseAPIResponse => {
  return typeof obj === 'object' && obj !== null && typeof obj.success === 'boolean';
};

export const isPaginatedAPIResponse = (obj: any): obj is PaginatedAPIResponse => {
  return isBaseAPIResponse(obj) && 
         typeof (obj as any).pagination === 'object' && 
         (obj as any).pagination !== null &&
         typeof (obj as any).pagination.page === 'number';
};

export const isAPIErrorResponse = (obj: any): obj is APIErrorResponse => {
  return typeof obj === 'object' && obj !== null && typeof obj.error === 'string';
};