import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { checkAuthStatus } from "../store/authSlice";
import { useAppTheme } from "../shared/hooks/useAppTheme";

// Components
import Header from "../shared/components/header/header";
import NotificationCenter from "../shared/components/ui/ui/NotificationCenter";
import ProtectedRoute from "../features/dashboard/components/ProtectedRoute";

// Pages
import LandingPage from "../features/dashboard/pages/LandingPage";
import CanvasPage from "../features/dashboard/pages/CanvasPage";
import FeaturedCanvasPage from "../features/dashboard/pages/FeaturedCanvasPage";
import FeaturedBoardsPage from "../features/dashboard/pages/FeaturedBoardsPage";
import SignIn from "../features/dashboard/components/auth/SignIn";
import WebexCallback from "../features/dashboard/components/auth/WebexCallback";

export default function App() {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Initialize Theme and Auth
  useAppTheme();
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  const isPublicPage = location.pathname === "/" || location.pathname === "/webex/callback";

  return (
    <div className="min-h-screen bg-background text-foreground w-full max-w-full overflow-x-hidden">
      {!isPublicPage && <Header />}
      <NotificationCenter />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/boards" /> : <SignIn />} />
        <Route path="/webex/callback" element={<WebexCallback />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/boards" element={<LandingPage />} />
          <Route path="/featured" element={<FeaturedBoardsPage />} />
          <Route path="/featured/:boardId" element={<FeaturedCanvasPage />} />
          <Route path="/newboard" element={<CanvasPage />} />
          <Route path="/newboard/:boardId" element={<CanvasPage />} />
        </Route>
      </Routes>
    </div>
  );
}
