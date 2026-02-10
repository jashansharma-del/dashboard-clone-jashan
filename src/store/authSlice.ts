import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../features/dashboard/components/utils/authService';
import { isWebexSessionValid } from '../features/dashboard/components/auth/webexAuth';

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
};

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
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Registration failed'));
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

    // If Appwrite session fails, check if we have user data in localStorage
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.provider === 'webex') {
          if (!isWebexSessionValid()) {
            return null;
          }
        }
        // Return a User object that matches our interface
        return {
          $id: parsedUser.id,
          email: parsedUser.email,
          name: parsedUser.name,
        };
      } catch (parseError) {
        console.error('Error parsing stored user data:', parseError);
      }
    }
    return null;
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

          const storedUser = localStorage.getItem('auth_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser.provider === 'webex' && !isWebexSessionValid()) {
                state.user = null;
                state.isAuthenticated = false;
              } else {
                state.user = {
                  $id: parsedUser.id,
                  email: parsedUser.email,
                  name: parsedUser.name,
                };
                state.isAuthenticated = true;
              }
            } catch {
              state.user = null;
              state.isAuthenticated = false;
            }
          } else {
            state.user = null;
            state.isAuthenticated = false;
          }
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
