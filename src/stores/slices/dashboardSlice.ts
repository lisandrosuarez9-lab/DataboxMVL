import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DashboardMetrics, PersonaFlag, AuditEntry, Persona } from '@/types';

interface DashboardState {
  metrics: DashboardMetrics | null;
  personas: Persona[];
  personaFlags: PersonaFlag[];
  auditEntries: AuditEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DashboardState = {
  metrics: null,
  personas: [],
  personaFlags: [],
  auditEntries: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchDashboardDataStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDashboardDataSuccess: (state, action: PayloadAction<{
      metrics: DashboardMetrics;
      personas: Persona[];
      personaFlags: PersonaFlag[];
      auditEntries: AuditEntry[];
    }>) => {
      state.loading = false;
      state.metrics = action.payload.metrics;
      state.personas = action.payload.personas;
      state.personaFlags = action.payload.personaFlags;
      state.auditEntries = action.payload.auditEntries;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    fetchDashboardDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateMetrics: (state, action: PayloadAction<DashboardMetrics>) => {
      state.metrics = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    addPersonaFlag: (state, action: PayloadAction<PersonaFlag>) => {
      state.personaFlags.unshift(action.payload);
    },
    updatePersonaFlag: (state, action: PayloadAction<PersonaFlag>) => {
      const index = state.personaFlags.findIndex(flag => flag.id === action.payload.id);
      if (index !== -1) {
        state.personaFlags[index] = action.payload;
      }
    },
    addAuditEntry: (state, action: PayloadAction<AuditEntry>) => {
      state.auditEntries.unshift(action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchDashboardDataStart,
  fetchDashboardDataSuccess,
  fetchDashboardDataFailure,
  updateMetrics,
  addPersonaFlag,
  updatePersonaFlag,
  addAuditEntry,
  clearError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;