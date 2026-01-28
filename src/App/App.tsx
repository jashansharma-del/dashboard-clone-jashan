import { Routes, Route, useLocation } from "react-router-dom";
import Header from "../shared/components/header/header";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/pages/NewBoardPage";
import SignIn from "../features/dashboard/components/auth/SignIn";
import { useEffect } from "react";

export default function App() {
  const location = useLocation();
  const hideHeader = location.pathname === "/login" || location.pathname === "/";

  // Initialize theme based on localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideHeader && <Header />}

      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/newboard" element={<NewBoardPage />} />
        <Route path="/newboard/:boardId" element={<NewBoardPage />} />
      </Routes>
      
    </div>
  );
}
