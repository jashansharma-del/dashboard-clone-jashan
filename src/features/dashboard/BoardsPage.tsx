import SectionHeader from "../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../shared/components/ui/ui/BoardCard";
import { useNavigate } from "react-router-dom";
import { getBoards, createBoard, deleteBoard, type Board, type Widget } from "../../../data/boardStorage";
import { useState, useEffect } from "react";

export default function BoardsPage() {

     const navigate = useNavigate();
     const [boards, setBoards] = useState<Board[]>(getBoards());
     const [themeVersion, setThemeVersion] = useState(0);
     const [isTransitioning, setIsTransitioning] = useState(false);

     // Listen for localStorage changes
     useEffect(() => {
       const handleStorageChange = () => {
         setBoards(getBoards());
       };

       // Listen for changes to the boards in localStorage
       window.addEventListener('storage', handleStorageChange);

       // Prevent horizontal scroll on body
       document.body.style.overflowX = 'hidden';
       document.documentElement.style.overflowX = 'hidden';

       // Cleanup listener on component unmount
       return () => {
         window.removeEventListener('storage', handleStorageChange);
         document.body.style.overflowX = '';
         document.documentElement.style.overflowX = '';
       };
     }, []);

     // Listen for theme changes to force re-render
     useEffect(() => {
       const handleThemeChange = () => {
         setIsTransitioning(true);
         setThemeVersion(prev => prev + 1);
         // Reset transitioning state after cards have time to update
         setTimeout(() => setIsTransitioning(false), 500);
       };

       const observer = new MutationObserver(handleThemeChange);
       observer.observe(document.documentElement, {
         attributes: true,
         attributeFilter: ['class']
       });

       return () => observer.disconnect();
     }, []);

  const handleCreateBoard = () => {
    const newBoard = createBoard();
    navigate(`/newboard/${newBoard.id}`);
  };
  
  // 🆕 Helper function to load chat messages for a board
  const loadChatMessages = (boardId: string) => {
    try {
      const stored = localStorage.getItem(`chat-${boardId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // 🆕 Helper function to extract chart data from chat messages
  const getBoardWidgets = (board: Board) => {
    const widgets: any[] = [];
    
    // Load chat messages from separate storage
    const chatMessages = loadChatMessages(board.id);
    
    // Extract charts from chat messages - ONLY TAKE THE FIRST CHART
    if (chatMessages && chatMessages.length > 0) {
      // Find the first assistant message with graphData
      const firstChartMessage = chatMessages.find((msg: any) => 
        msg.role === "assistant" && msg.graphData
      );
      
      if (firstChartMessage) {
        widgets.push({
          type: "chart",
          label: "Chart Preview", // Standard label instead of "Chart 1", "Chart 2", etc.
          data: firstChartMessage.graphData
        });
      }
    }
    
    // If no charts found in messages, show the actual widgets
    if (widgets.length === 0 && board.widgets && board.widgets.length > 0) {
      return board.widgets.map((w: Widget) => ({ 
        type: w.type, 
        label: typeof w.props?.label === 'string' ? w.props?.label || w.type : w.type,
        data: w.props?.data
      }));
    }
    
    return widgets;
  };

  const handleDeleteBoard = (boardId: string) => {
    if (window.confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      deleteBoard(boardId);
      // Manually refresh the boards list after deletion
      setBoards(getBoards());
    }
  };
  
  return (
    <div 
      className={`w-screen max-w-full overflow-x-hidden bg-background text-foreground transition-all duration-300 ${
        isTransitioning ? 'opacity-95' : 'opacity-100'
      }`} 
      key={themeVersion}
    >
      <div className="p-6 space-y-12 max-w-full">

        {/* MY BOARDS */}
        <section className="max-w-full">
         <SectionHeader
          title= "My Boards"
          secondaryAction={{ label: "Explore boards" }}
          primaryAction={{
            label: "Create new board",
            onClick: handleCreateBoard,
          }}
        />

          <div className="overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6 max-w-full scrollbar-hide">
            <div className="flex gap-6 w-max">
              {boards.map((board: Board) => (
                <div 
                  key={board.id} 
                  className="flex-shrink-0 transition-all duration-300"
                >
                  <BoardCard
                    title={board.id.slice(0, 8) + '...'}
                    widgets={getBoardWidgets(board)}
                    messages={loadChatMessages(board.id)}
                    onClick={() => navigate(`/newboard/${board.id}`)}
                    onDelete={() => handleDeleteBoard(board.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SHARED WITH ME */}
        <section className="max-w-full">
          <SectionHeader title="Boards shared with me" />

          <div className="max-w-full">
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

      {/* CSS to hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}