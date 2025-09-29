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