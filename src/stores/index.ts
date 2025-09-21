import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import userSlice from './slices/userSlice';
import dashboardSlice from './slices/dashboardSlice';
import uiSlice from './slices/uiSlice';
import monitoringReducer from './slices/monitoringSlice';

export const store = configureStore({
  reducer: {
    user: userSlice,
    dashboard: dashboardSlice,
    ui: uiSlice,
    monitoring: monitoringReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'monitoring/updateHealthMetrics'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Make store available globally for monitoring
if (typeof window !== 'undefined') {
  (window as any).__REDUX_STORE__ = store;
}