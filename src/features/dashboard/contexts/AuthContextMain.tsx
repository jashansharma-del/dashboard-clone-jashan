import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { login, logout, checkAuthStatus } from '../../../store/authSlice';
import { AuthContext } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial auth status on app load
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Handle logout across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'logout' && e.newValue === 'true') {
        // Another tab logged out, sync the state
        dispatch(logout());
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await dispatch(login({ email, password }));
      if (login.fulfilled.match(result)) {
        localStorage.removeItem('logout');
        return { success: true };
      } else {
        return { success: false, error: result.payload };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error };
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout());
      // Set a flag in localStorage to signal other tabs
      localStorage.setItem('logout', 'true');
      setTimeout(() => {
        localStorage.removeItem('logout');
      }, 100); // Clear immediately after other tabs detect it
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login: handleLogin,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}