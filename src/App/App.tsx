import { Routes, Route, useLocation } from "react-router-dom";
import Header from "../shared/components/header/header";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/pages/NewBoardPage";
import SignIn from "../features/dashboard/components/auth/SignIn";

export default function App() {
  const location = useLocation();
  const hideHeader = location.pathname === "/login" || location.pathname === "/";

  return (
    <div>
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
