import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Header from "../shared/components/header/header";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/pages/NewBoardPage";
import SignIn from "../features/dashboard/components/auth/SignIn";
import ProtectedRoute from "../features/dashboard/components/ProtectedRoute";
import { initializeTheme } from "../lib/theme";
//import { AuthProvider } from "../features/dashboard/contexts/AuthContext";

export default function App() {
  const location = useLocation();

  // Hide header only on public entry page
  const hideHeader = location.pathname === "/";

  // Initialize theme on app start
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    
      <div className="min-h-screen bg-background text-foreground w-full max-w-full overflow-x-hidden">
        {!hideHeader && <Header />}

        <Routes>
          {/* ✅ PUBLIC ENTRY ROUTE */}
          <Route path="/" element={<SignIn />} />

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
