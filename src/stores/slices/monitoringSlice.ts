import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface HealthMetrics {
  lastUpdated: string;
  responseTime: number;
  errors: number;
  uptime: number;
}

interface MonitoringState {
  isConnected: boolean;
  lastHeartbeat: string | null;
  healthMetrics: HealthMetrics;
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
  performance: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
  };
}

const initialState: MonitoringState = {
  isConnected: true,
  lastHeartbeat: null,
  healthMetrics: {
    lastUpdated: new Date().toISOString(),
    responseTime: 0,
    errors: 0,
    uptime: 0,
  },
  alerts: [],
  performance: {
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
  },
};

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    updateConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      state.lastHeartbeat = new Date().toISOString();
    },
    updateHealthMetrics: (state, action: PayloadAction<Partial<HealthMetrics>>) => {
      state.healthMetrics = { ...state.healthMetrics, ...action.payload };
    },
    addAlert: (state, action: PayloadAction<Omit<MonitoringState['alerts'][0], 'id' | 'timestamp'>>) => {
      const alert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.alerts.unshift(alert);
      // Keep only last 10 alerts
      if (state.alerts.length > 10) {
        state.alerts = state.alerts.slice(0, 10);
      }
    },
    clearAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    updatePerformanceMetrics: (state, action: PayloadAction<Partial<MonitoringState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload };
    },
  },
});

export const {
  updateConnectionStatus,
  updateHealthMetrics,
  addAlert,
  clearAlert,
  updatePerformanceMetrics,
} = monitoringSlice.actions;

export default monitoringSlice.reducer;