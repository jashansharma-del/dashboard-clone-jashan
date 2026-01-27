import { Routes, Route } from "react-router-dom";
import Header from "../shared/components/header/header";
import BoardsPage from "../features/dashboard/BoardsPage";
import NewBoardPage from "../features/dashboard/NewBoardPage/NewBoardPage";

export default function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<BoardsPage />} />
        <Route path="/newboard" element={<NewBoardPage />} />
        <Route path="/newboard/:boardId" element={<NewBoardPage />} />
      </Routes>
    </div>
  );
}
