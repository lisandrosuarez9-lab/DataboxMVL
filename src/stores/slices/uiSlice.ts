import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppNotification } from '@/types';

interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: AppNotification[];
  loading: {
    [key: string]: boolean;
  };
}

const initialState: UIState = {
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  loading: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<AppNotification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: AppNotification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(notification);
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n: AppNotification) => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n: AppNotification) => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
  },
});

export const {
  toggleTheme,
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  addNotification,
  markNotificationAsRead,
  removeNotification,
  clearAllNotifications,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;