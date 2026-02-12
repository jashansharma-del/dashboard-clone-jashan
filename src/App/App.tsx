import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setTheme } from '../store/uiSlice';
import { checkAuthStatus } from '../store/authSlice';
import { setDarkTheme, setLightTheme } from "../lib/theme";
import authService from "../features/dashboard/components/utils/authService";

import Header from "../shared/components/header/header";
import NotificationCenter from "../shared/components/ui/ui/NotificationCenter";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/pages/NewBoardPage";
import SignIn from "../features/dashboard/components/auth/SignIn";
import WebexCallback from "../features/dashboard/components/auth/WebexCallback";
import ProtectedRoute from "../features/dashboard/components/ProtectedRoute";
//import { AuthProvider } from "../features/dashboard/contexts/AuthContext";

export default function App() {
  const location = useLocation();
  const [themeInitialized, setThemeInitialized] = useState(false);
  

  // Hide header only on public entry page
  const hideHeader = location.pathname === "/" || location.pathname === "/webex/callback";

  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSelector((state: RootState) => state.ui);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Initialize auth status on app start
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Initialize theme on app start and sync with Redux state
  useEffect(() => {
    let cancelled = false;
    const initTheme = async () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      let initialTheme: 'dark' | 'light' = prefersDark ? 'dark' : 'light';

      if (isAuthenticated) {
        const pref = await authService.getThemePref();
        if (pref) initialTheme = pref;
      }

      if (cancelled) return;
      dispatch(setTheme(initialTheme));
      setThemeInitialized(true);
    };

    initTheme();
    return () => {
      cancelled = true;
    };
  }, [dispatch, isAuthenticated]);
  
  // Sync theme changes to DOM
  useEffect(() => {
    if (theme === 'dark') {
      setDarkTheme();
    } else {
      setLightTheme();
    }
    if (themeInitialized && isAuthenticated) {
      authService.setThemePref(theme);
    }
  }, [theme, themeInitialized, isAuthenticated]);

  return (
    
      <div className="min-h-screen bg-background text-foreground w-full max-w-full overflow-x-hidden">
        {!hideHeader && <Header />}
        <NotificationCenter />

        <Routes>
          {/* ✅ PUBLIC ENTRY ROUTE */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/boards" /> : <SignIn />} />
          <Route path="/webex/callback" element={<WebexCallback />} />

        {/* 🔒 PROTECTED ROUTES */}
        <Route
          path="/boards"
          element={
            <ProtectedRoute>
              <BoardsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/newboard"
          element={
            <ProtectedRoute>
              <NewBoardPage />
            </ProtectedRoute>
          }
        />

          <Route
            path="/newboard/:boardId"
            element={
              <ProtectedRoute>
                <NewBoardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    
  );
}
