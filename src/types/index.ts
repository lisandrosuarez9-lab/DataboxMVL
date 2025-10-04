import React from 'react';

// Core types for the application
export interface User {
  id: string;
  email: string;
  role: 'compliance' | 'service_role';
  permissions: string[];
}

// Enhanced Persona type with all required fields per specifications
export interface Persona {
  id: string; // UUID with copy-to-clipboard functionality
  user_id_review_needed: boolean; // Boolean with visual indicator (red/green)
  is_test: boolean; // Boolean with visual badge (blue "TEST" for true)
  created_at: string; // ISO8601 timestamp with localized display
  updated_at: string; // ISO8601 timestamp with relative time display
  risk_score: number; // Numeric with color-coded threshold indicators
  trust_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED'; // Enumeration with corresponding icon set
  verification_status: 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED'; // State machine visualization
  // Additional operational attributes
  email?: string;
  phone?: string;
  document_id?: string;
  full_name?: string;
  birth_date?: string;
  address?: string;
  employment_status?: string;
  income_level?: number;
  credit_score?: number;
  last_activity?: string;
  created_by: string;
  updated_by?: string;
}

export interface PersonaFlag {
  id: string;
  persona_id: string;
  flag_type: string;
  flag_value: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Enhanced Audit Entry type for comprehensive audit log visualization
export interface AuditEntry {
  audit_id: string;
  persona_id: string; // UUID with hyperlink to persona detail view
  field_name: string; // String with human-readable field name mapping
  old_value: string | null; // Formatted based on field type with diff visualization
  new_value: string; // Formatted based on field type with diff visualization
  changed_by: string; // String with user profile tooltip on hover
  changed_at: string; // ISO8601 timestamp with absolute and relative display
  change_reason?: string; // String with category tag and full text on expansion
  client_metadata?: Record<string, any>; // JSON object with expandable inspector view
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  change_magnitude?: 'MINOR' | 'MAJOR' | 'CRITICAL'; // For color-coded categorization
}

export interface ProtocolData {
  id: string;
  protocol_type: 'microcredito' | 'empleo' | 'ingreso' | 'educacion';
  documento_id: string;
  fecha: string;
  monto?: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Dashboard related types
export interface DashboardMetrics {
  totalPersonas: number;
  reviewNeeded?: number; // Legacy field name
  flaggedPersonas: number; // New field name for consistency with API
  auditEntries: number;
  lastUpdated: string;
  // Enhanced KPI metrics
  growthRate?: number; // 7-day growth rate
  flaggedPercentage?: number; // Percentage of flagged personas
  dailyAverageActivity?: number; // Daily average audit activity
  unusualActivityDetected?: boolean; // Alert for unusual patterns
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  category?: string; // For segmented data
  metadata?: Record<string, any>; // Additional context
}

export interface ChartProps {
  data: ChartDataPoint[];
  title?: string;
  className?: string;
  height?: number;
  loading?: boolean;
  interactive?: boolean; // Enable hover/click interactions
  showTrends?: boolean; // Show trend lines
  colorScheme?: 'default' | 'semantic' | 'risk'; // Color palette
}

// Table functionality types
export interface TableColumn<T> {
  id: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  width?: number;
  minWidth?: number;
  render?: (value: any, row: T) => React.ReactNode;
  filterType?: 'text' | 'select' | 'date' | 'number' | 'boolean' | 'range';
  filterOptions?: Array<{ value: any; label: string }>;
}

export interface TableFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between';
  value: any;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
}

export interface TableSort {
  field: string;
  direction: 'asc' | 'desc';
  priority?: number; // For multi-column sorting
}

export interface TableState {
  page: number;
  pageSize: 10 | 25 | 50 | 100;
  filters: TableFilter[];
  sorts: TableSort[];
  selectedRows: string[];
  visibleColumns: string[];
  searchTerm?: string;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onStateChange?: (state: TableState) => void;
  onRowClick?: (row: T) => void;
  onRowSelect?: (selectedIds: string[]) => void;
  onExport?: (format: 'csv' | 'excel', selectedRows?: T[]) => void;
  bulkActions?: Array<{
    id: string;
    label: string;
    icon?: string;
    action: (selectedRows: T[]) => void;
    disabled?: (selectedRows: T[]) => boolean;
  }>;
  enableInlineEdit?: boolean;
  enableKeyboardNavigation?: boolean;
  enableRowExpansion?: boolean;
  rowHeight?: number;
  overscan?: number;
}

// Form types
export interface FormField {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: any;
}

export interface FormProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  loading?: boolean;
  className?: string;
}

// Navigation types
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: NavigationItem[];
}

// State management types
export interface AppState {
  user: User | null;
  dashboard: DashboardState;
  ui: UIState;
}

export interface DashboardState {
  metrics: DashboardMetrics | null;
  personas: Persona[];
  personaFlags: PersonaFlag[];
  auditEntries: AuditEntry[];
  loading: boolean;
  error: string | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  onClick?: () => void;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// API types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Partial<Pick<T, K>>;

// Credit Scoring System Types
export interface ScoreFactor {
  id: string;
  model_id: number;
  feature_key: string;
  weight: number;
  description?: string;
  created_at: string;
}

export interface RiskBand {
  id: string;
  model_id: number;
  band: string;
  min_score: number;
  max_score: number;
  recommendation: string;
  created_at: string;
}

export interface CreditScore {
  id: string;
  persona_id: string;
  model_id: number;
  score: number;
  explanation: CreditScoreExplanation;
  computed_at: string;
}

export interface CreditScoreExplanation {
  features: Record<string, any>;
  weighted_result: {
    raw_score: number;
    contributions: Record<string, number>;
  };
  normalized_score: number;
  risk_band?: {
    band: string;
    recommendation: string;
  };
  simulation?: boolean;
}

export interface ScoreTrendPoint {
  month: string;
  avg_score: number;
}

export interface CreditScoreRequest {
  persona_id: string;
  model_id: number;
}

export interface ScoreSimulationRequest extends CreditScoreRequest {
  feature_overrides?: Record<string, any>;
}

export interface ScoreTrendRequest extends CreditScoreRequest {
  months?: number;
}

export interface CreditScoreResponse {
  success: boolean;
  data: CreditScore | CreditScore[] | ScoreTrendPoint[];
  error?: string;
  details?: string;
}

// Credit scoring feature definitions for type safety
export interface CreditScoringFeatures {
  tx_6m_count: number;          // Number of transactions in last 6 months
  tx_6m_avg_amount: number;     // Average transaction amount in last 6 months
  tx_6m_sum: number;            // Sum of transactions in last 6 months
  days_since_last_tx: number;   // Days since last transaction
  remesa_12m_sum: number;       // Sum of remittances in last 12 months
  bills_paid_ratio: number;     // Ratio of paid utility bills
  avg_bill_amount: number;      // Average bill amount
  micro_active: boolean;        // Has active microcredit
  micro_active_sum: number;     // Sum of active microcredits
}

// ============================================================================
// COMPLIANCE SHOWCASE TYPES
// ============================================================================

// Risk Signals and Events
export interface RiskEvent {
  id: string;
  owner_id: string;
  owner_ref?: string;           // Anonymized reference for public API
  source: 'RiskSeal' | 'DeviceFingerprint' | 'BehavioralAnalytics' | 'IdentityVerification';
  event_type: string;
  signal_payload: Record<string, any>;
  confidence: number;           // 0-1
  observed_at: string;          // ISO 8601
  created_at: string;
  signal_summary?: {            // For public API
    signal_type: string;
    confidence: number;
    timestamp: string;
  };
}

export interface RiskFactor {
  id: string;
  owner_id: string;
  owner_ref?: string;           // Anonymized reference for public API
  factor_code: string;
  factor_value: number | null;
  factor_text?: string;
  confidence: number;           // 0-1
  derived_at: string;           // ISO 8601
  source_event_id?: string;
  signal_source?: string;       // e.g., "RiskSeal"
  signal_type?: string;         // e.g., "device_consistency_check"
  metadata?: Record<string, any>;
  created_at: string;
}

// Alternate Credit Scoring
export interface AltScoreRun {
  id: string;
  owner_id: string;
  owner_ref?: string;           // Anonymized reference
  persona_id?: string;
  model_version: string;
  input_refs: Record<string, any>;
  run_id: string;               // Human-readable ID like "ALT-RUN-20240115-XYZ789"
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  score_result: number | null;
  risk_band: string | null;
  explanation?: AltScoreExplanation;
  error_message?: string;
  created_at: string;
}

export interface AltScoreExplanation {
  factors: AltScoreFactor[];
  methodology: string;
  mitigations?: string[];
}

export interface AltScoreFactor {
  factor: string;
  weight: number;
  value: number;
  contribution: number;
  confidence: number;
  source?: string;
}

// Demo Cohort
export interface DemoPersona {
  user_id: string;
  owner_ref: string;            // Anonymized reference
  persona_type: 'thin_file' | 'traditional' | 'mixed' | 'new_borrower';
  display_name: string;
  scenario_description: string;
  active: boolean;
  created_at: string;
}

// Public API Response Types
export interface IntegrityStatus {
  orphan_records: number;       // Should always be 0
  latest_run_id: string;        // e.g., "RUN-20240115-ABCD1234"
  audit_entries_30d: number;
  rls_status: 'ENFORCED' | 'DISABLED';
  last_verification: string;    // ISO 8601
  tables_checked: number;
}

export interface ScoreModel {
  id: string;
  name: string;
  version: string;
  description: string;
  factors_count: number;
  active: boolean;
  created_at: string;
}

export interface PublicScoreRun {
  id: string;
  persona_ref: string;
  model_id: string;
  score: number;
  risk_band: {
    band: string;
    min_score: number;
    max_score: number;
    recommendation: string;
  };
  features?: Record<string, number>;
  normalized_score: number;
  computed_at: string;
  audit_log_id: string | null;
}

export interface AuditSummary {
  total_score_runs: number;
  runs_last_30d: number;
  latest_run_timestamp: string | null;
  unique_personas: number;
  rls_status: 'ENFORCED' | 'DISABLED';
}

// API Response Wrapper
export interface APIResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    count?: number;
    page?: number;
    per_page?: number;
    total?: number;
    limit?: number;
    offset?: number;
  };
  timestamp: string;            // ISO 8601
}

export interface APIError {
  success: false;
  error: string;
  error_code?: string;
  details?: string;
  retry_after?: number;
  timestamp: string;
}

// Alternate Score Report (for download)
export interface AltScoreReport {
  header: {
    run_id: string;
    model_version: string;
    generated_at: string;
    persona_ref: string;
  };
  scores: {
    primary_score: number | null;
    alternate_score: number;
    band: string;
    eligibility: string;
  };
  factor_contributions: AltScoreFactor[];
  risk_mitigations?: string[];
  integrity: {
    hash: string;
    audit_link: string;
  };
}

// Sandbox Simulation Types
export interface SandboxInput {
  monthly_income: number;
  transaction_count_3m: number;
  remittance_frequency: 'weekly' | 'monthly' | 'quarterly' | 'rare';
  microcredit_repayment_rate: number;  // 0-1
  risk_signals: {
    device_consistency: number;         // 0-1
    identity_confidence: number;        // 0-1
  };
}

export interface SandboxOutput {
  score: number;
  band: string;
  explanation: {
    factors_used: number;
    highest_contribution: string;
    risk_mitigations: string[];
  };
  lineage: {
    model_version: string;
    calculation_timestamp: string;
    policy_view: string;
  };
}