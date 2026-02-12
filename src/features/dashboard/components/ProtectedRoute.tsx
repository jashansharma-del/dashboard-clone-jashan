import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authService } from "../../../features/dashboard/components/utils/authService";
import { isWebexSessionValid } from "./auth/webexAuth";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  

  useEffect(() => {
      const checkAuth = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        return;
      }

      setIsAuthenticated(await isWebexSessionValid());
    };

    checkAuth();
  }, []);

  //Loading state
  if(isAuthenticated === null) {
    return (
       <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  // not logged in -> redirect

  if(!isAuthenticated) {
    const intendedPath = `${location.pathname}${location.search}${location.hash}`;
    if (intendedPath && intendedPath !== "/") {
      sessionStorage.setItem("post_login_redirect", intendedPath);
    }
    return <Navigate to="/" replace />;
  }  

  // Logged in -> render route
  return children ? <>{children}</> : <Outlet />;
    
  }
