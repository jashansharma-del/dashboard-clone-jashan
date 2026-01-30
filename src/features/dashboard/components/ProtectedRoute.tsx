import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { authService } from "../../../features/dashboard/components/utils/authService";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { isValid } = await authService.verifySession();
      setIsAuthenticated(isValid);
      
      // If session is invalid, ensure we redirect to login
      if (!isValid) {
        setTimeout(() => {
          navigate("/");
        }, 500); // Small delay to ensure state update before navigation
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render children or outlet if authenticated
  return children ? <>{children}</> : <Outlet />;
}