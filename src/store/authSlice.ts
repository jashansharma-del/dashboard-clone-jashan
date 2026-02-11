import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../features/dashboard/components/utils/authService';
import { isWebexSessionValid } from '../features/dashboard/components/auth/webexAuth';
import { getWebexStoredUser } from '../features/dashboard/components/utils/webexStorage';

// Define the user type
interface User {
  $id: string;
  email: string;
  name: string;
  $createdAt?: string;
  $updatedAt?: string;
  registration?: string;
}

// Define the auth state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const user = await authService.login(email, password);
      return user;
    } catch (error: unknown) {
      const err = error as { message?: string };
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

// Async thunk for registration
export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const user = await authService.register(email, password, name);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    } 
  }
);

// Async thunk for logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await authService.logout();
      // Clear the auth state via the reducer
      dispatch(clearAuthState());
    } catch (error: unknown) {
      console.error('Logout error:', error);
    }
  }
);

// Async thunk for checking initial auth status
export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      return user;
    }
    const validWebex = await isWebexSessionValid();
    if (!validWebex) return null;
    return await getWebexStoredUser();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    clearAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Login failed';
        state.user = null;
        state.isAuthenticated = false;
      })
      // Registration cases
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Registration failed';
        state.user = null;
        state.isAuthenticated = false;
      })
      // Check auth status cases
      .addCase(checkAuthStatus.fulfilled, (state, action: PayloadAction<User | null>) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        } else {
          // Avoid wiping an active session if a later check resolves null.
          if (state.isAuthenticated && state.user) {
            state.loading = false;
            return;
          }
          state.user = null;
          state.isAuthenticated = false;
        }
        state.loading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      });
  },
});

export const { setCredentials, clearAuthState, setLoading, setError } = authSlice.actions;

export default authSlice.reducer;
