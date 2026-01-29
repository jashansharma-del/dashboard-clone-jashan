import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Header from "../shared/components/header/header";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/pages/NewBoardPage";
import SignIn from "../features/dashboard/components/auth/SignIn";
import ProtectedRoute from "../features/dashboard/components/protectedRoute";

export default function App() {
  const location = useLocation();

  // Hide header only on public entry page
  const hideHeader = location.pathname === "/";

  // Theme init
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
