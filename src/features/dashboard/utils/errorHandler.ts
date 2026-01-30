import { authService } from '../components/utils/authService';

/**
 * Global error handler that detects unauthorized access and redirects to login
 */
interface AppwriteError {
  code?: number;
  type?: string;
  message?: string;
}

export const handleGlobalError = async (error: AppwriteError, navigate?: (path: string) => void) => {
  // Check if this is an unauthorized error from Appwrite
  if (error?.code === 401 || error?.type === 'user_not_found' || error?.message?.includes('401')) {
    console.log('Unauthorized access detected, redirecting to login...');
    
    // Clear any cached session data
    try {
      await authService.logout();
    } catch (logoutError) {
      console.error('Error during logout:', logoutError);
    }
    
    // Redirect to login page if navigate function is provided
    if (navigate) {
      navigate('/');
    } else {
      // Fallback: redirect using window.location
      window.location.href = '/';
    }
  }
  
  // Re-throw the error so it can be handled by calling code
  throw error;
};

/**
 * Wrap API calls with error handling
 */
export const withAuthCheck = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: unknown) {
    const typedError = error as AppwriteError;
    // Check if this is an authentication-related error
    if (typedError?.code === 401 || typedError?.type === 'user_not_found' || typedError?.message?.includes('401')) {
      console.log('Session expired or user deleted, redirecting to login...');
      // Redirect to login
      window.location.href = '/';
      throw error;
    }
    throw error;
  }
};