import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../components/utils/authService';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkInitialAuthStatus();
  }, []);

  const checkInitialAuthStatus = async () => {
    try {
      const { isValid, user: currentUser } = await authService.verifySession();
      
      if (isValid && currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking initial auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Set up interval to periodically check session validity
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const interval = setInterval(async () => {
        const { isValid } = await authService.verifySession();
        
        if (!isValid) {
          // User's credentials were likely deleted from Appwrite
          console.log('Session invalidated (likely user deleted from Appwrite)');
          setUser(null);
          setIsAuthenticated(false);
          clearInterval(interval);
          navigate('/', { replace: true });
        }
      }, 30000); // Check every 30 seconds

      // Cleanup function
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [loading, isAuthenticated, navigate]);

  // Listen for storage events (in case user logs out from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'logout' && e.newValue === 'true') {
        // Another tab logged out, sync the state
        setUser(null);
        setIsAuthenticated(false);
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      await authService.login(email, password);
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      // Clear logout flag if present
      localStorage.removeItem('logout');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
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
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}