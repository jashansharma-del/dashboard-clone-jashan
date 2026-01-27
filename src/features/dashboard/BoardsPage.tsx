import SectionHeader from "../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../shared/components/ui/ui/BoardCard";
import { useNavigate } from "react-router-dom";
import { getBoards, createBoard, type Board, type Widget } from "../../shared/utils/data/boardStorage";
import { useState, useEffect } from "react";

export default function BoardsPage() {

     const navigate = useNavigate();
     const [boards, setBoards] = useState<Board[]>(getBoards());

     // Listen for localStorage changes
     useEffect(() => {
       const handleStorageChange = () => {
         setBoards(getBoards());
       };

       // Listen for changes to the boards in localStorage
       window.addEventListener('storage', handleStorageChange);

       // Cleanup listener on component unmount
       return () => {
         window.removeEventListener('storage', handleStorageChange);
       };
     }, []);

  const handleCreateBoard = () => {
    const newBoard = createBoard();
    navigate(`/newboard/${newBoard.id}`);
  };
  return (
    <div className="p-6 space-y-12">

      {/* MY BOARDS */}
      <section>
       <SectionHeader
        title="My Boards"
        secondaryAction={{ label: "Explore boards" }}
        primaryAction={{
          label: "Create new board",
          onClick: handleCreateBoard,
        }}
      />

        <div className="flex gap-6 flex-wrap">
          {boards.map((board: Board) => (
            <BoardCard
              key={board.id}
              title={board.id.slice(0, 8) + '...'}
              widgets={board.widgets.map((w: Widget) => ({ type: w.type, label: typeof w.props?.label === 'string' ? w.props?.label || w.type : w.type }))}
              messages={board.messages || []}
              onClick={() => navigate(`/newboard/${board.id}`)}
            />
          ))}
        </div>
      </section>

      {/* SHARED WITH ME */}
      <section>
        <SectionHeader title="Boards shared with me" />

        <div className="flex gap-6 flex-wrap">
          <BoardCard
            title="Product Refresh"
            widgets={[
              { type: "chart", label: "Refresh Timeline" },
              { type: "table", label: "SKU Details" },
            ]}
          />
        </div>
      </section>

    </div>
  );
}
