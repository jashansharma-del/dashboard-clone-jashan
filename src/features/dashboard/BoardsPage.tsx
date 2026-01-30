import SectionHeader from "../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../shared/components/ui/ui/BoardCard";
import { useNavigate } from "react-router-dom";
import { getBoards, createBoard, deleteBoard, type Board, type Widget } from "../../../data/boardStorage";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function BoardsPage() {

     const navigate = useNavigate();
     const [boards, setBoards] = useState<Board[]>(getBoards());
     const [themeVersion, setThemeVersion] = useState(0);
     const [isTransitioning, setIsTransitioning] = useState(false);
     const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

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
    setBoardToDelete(boardId);
  };

  const confirmDelete = () => {
    if (boardToDelete) {
      deleteBoard(boardToDelete);
      // Manually refresh the boards list after deletion
      setBoards(getBoards());
      setBoardToDelete(null);
    }
  };

  const cancelDelete = () => {
    setBoardToDelete(null);
  };
  function getBoardTitleFromLocalMessages(boardId: string) {
  const messages = loadChatMessages(boardId);

  if (!messages || messages.length === 0) {
    return "Untitled Board";
  }

  const firstUserMessage = messages.find(
    (msg: any) => msg.role === "user" && msg.text.trim() !== ""
  );

  return firstUserMessage
    ? firstUserMessage.text.length > 30
      ? firstUserMessage.text.slice(0, 30) + "…"
      : firstUserMessage.text
    : "Untitled Board";
}

  
  return (
    <>
    <div 
      className={`min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground transition-all duration-300 ${
        isTransitioning ? 'opacity-95' : 'opacity-100'
      }`} 
      key={themeVersion}
    >
      <div className="p-4 sm:p-6 space-y-8 sm:space-y-12 max-w-full">

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
            <div className="flex gap-4 sm:gap-6 min-w-max">
              {boards.map((board: Board) => (
                <div 
                  key={board.id} 
                  className="flex-shrink-0 transition-all duration-300 w-[350px] sm:w-[420px]"
                >
                  <BoardCard
                    title={getBoardTitleFromLocalMessages(board.id)}
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

    {/* Delete Confirmation Dialog */}
    <Dialog open={!!boardToDelete} onOpenChange={(open) => !open && cancelDelete()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this board? This action cannot be undone and all data will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          <Button 
            type="button" 
            variant="outline" 
            onClick={cancelDelete}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}