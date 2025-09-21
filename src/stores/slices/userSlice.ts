import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';

interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUserRole: (state, action: PayloadAction<'compliance' | 'service_role'>) => {
      if (state.currentUser) {
        state.currentUser.role = action.payload;
        // Set permissions based on role
        state.currentUser.permissions = action.payload === 'service_role' 
          ? ['read', 'write', 'delete', 'audit'] 
          : ['read', 'audit'];
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  setUserRole,
} = userSlice.actions;

export default userSlice.reducer;