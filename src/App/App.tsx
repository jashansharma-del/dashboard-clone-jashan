import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setTheme } from '../store/uiSlice';
import { checkAuthStatus } from '../store/authSlice';
import { setDarkTheme, setLightTheme } from "../lib/theme";

import Header from "../shared/components/header/header";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/pages/NewBoardPage";
import SignIn from "../features/dashboard/components/auth/SignIn";
import WebexCallback from "../features/dashboard/components/auth/WebexCallback";
import ProtectedRoute from "../features/dashboard/components/ProtectedRoute";
//import { AuthProvider } from "../features/dashboard/contexts/AuthContext";

export default function App() {
  const location = useLocation();
  

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
    // Get the saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine the initial theme
    let initialTheme: 'dark' | 'light' = 'light';
    if (savedTheme === 'dark' || savedTheme === 'light') {
      initialTheme = savedTheme;
    } else {
      initialTheme = prefersDark ? 'dark' : 'light';
    }

    // Apply the initial theme to the DOM
    if (initialTheme === 'dark') {
      setDarkTheme();
    } else {
      setLightTheme();
    }

    // Update Redux state to match the initial theme
    dispatch(setTheme(initialTheme));
  }, [dispatch]);
  
  // Sync theme changes to DOM
  useEffect(() => {
    if (theme === 'dark') {
      setDarkTheme();
    } else {
      setLightTheme();
    }
  }, [theme]);

  return (
    
      <div className="min-h-screen bg-background text-foreground w-full max-w-full overflow-x-hidden">
        {!hideHeader && <Header />}

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
