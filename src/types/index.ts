// Core types for the application
export interface User {
  id: string;
  email: string;
  role: 'compliance' | 'service_role';
  permissions: string[];
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

export interface AuditEntry {
  audit_id: string;
  persona_id: string;
  old_value: string | null;
  new_value: string;
  changed_at: string;
  changed_by: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
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
  reviewNeeded: number;
  auditEntries: number;
  lastUpdated: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface ChartProps {
  data: ChartDataPoint[];
  title?: string;
  className?: string;
  height?: number;
  loading?: boolean;
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
  personaFlags: PersonaFlag[];
  auditEntries: AuditEntry[];
  loading: boolean;
  error: string | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: Notification[];
}

export interface Notification {
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

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;