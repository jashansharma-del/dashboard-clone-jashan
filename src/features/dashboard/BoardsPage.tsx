import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SectionHeader from "../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../shared/components/ui/ui/BoardCard";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import {
  getBoards,
  createBoard,
  deleteBoard,
  type Board,
  type Widget,
  type Message,
  type ChartData,
} from "../../data/boardStorage";
import { listChatMessages } from "../../data/chatStorage";

export default function BoardsPage() {
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMessages, setBoardMessages] = useState<Record<string, Message[]>>({});
  const [themeVersion, setThemeVersion] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBoards([]);
      setBoardMessages({});
      return;
    }

    let cancelled = false;
    const loadBoards = async () => {
      const loadedBoards = await getBoards(userId);
      if (cancelled) return;
      setBoards(loadedBoards);

      const messagesEntries = await Promise.all(
        loadedBoards.map(async (board) => {
          const messages = await listChatMessages(board.id);
          return [board.id, messages] as const;
        })
      );

      if (cancelled) return;
      setBoardMessages(Object.fromEntries(messagesEntries));
    };

    loadBoards();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Listen for theme changes to force re-render
  useEffect(() => {
    const handleThemeChange = () => {
      setIsTransitioning(true);
      setThemeVersion((prev) => prev + 1);
      // Reset transitioning state after cards have time to update
      setTimeout(() => setIsTransitioning(false), 500);
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleCreateBoard = async () => {
  try {
    if (!userId) {
      console.error("Create board blocked: missing userId");
      return;
    }
    const newBoard = await createBoard(userId);
    const updatedBoards = await getBoards(userId);
    setBoards(updatedBoards);
    setBoardMessages((prev) => ({ ...prev, [newBoard.id]: [] }));
    navigate(`/newboard/${newBoard.id}`);
  } catch (error) {
    console.error("Failed to create board:", error);
  }
};

  const getBoardWidgets = (board: Board) => {
    const widgets: Array<{ type: string; label: string; data?: ChartData[] }> = [];

    const chatMessages = boardMessages[board.id] || [];

    if (chatMessages.length > 0) {
      const chartMessages = chatMessages.filter(
        (msg: Message) => msg.role === "assistant" && msg.graphData
      );

      chartMessages.forEach((msg: Message, index: number) => {
        widgets.push({
          type: "chart",
          label: `Chart ${index + 1}`,
          data: msg.graphData,
        });
      });
    }

    if (board.widgets && board.widgets.length > 0) {
      const boardWidgets = board.widgets.map((w: Widget) => ({
        type: w.type,
        label: typeof w.props?.label === "string" ? w.props?.label || w.type : w.type,
        data: w.props?.data,
      }));
      return [...widgets, ...boardWidgets];
    }

    return widgets;
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoardToDelete(boardId);
  };

  const confirmDelete = async () => {
    if (boardToDelete && userId) {
      await deleteBoard(userId, boardToDelete);
      const updatedBoards = await getBoards(userId);
      setBoards(updatedBoards);
      setBoardMessages((prev) => {
        const next = { ...prev };
        delete next[boardToDelete];
        return next;
      });
      setBoardToDelete(null);
    }
  };

  const cancelDelete = () => {
    setBoardToDelete(null);
  };

  function getBoardTitleFromMessages(boardId: string) {
    const messages = boardMessages[boardId] || [];

    if (messages.length === 0) {
      return "Untitled Board";
    }

    const firstUserMessage = messages.find(
      (msg: Message) => msg.role === "user" && msg.text.trim() !== ""
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
          isTransitioning ? "opacity-95" : "opacity-100"
        }`}
        key={themeVersion}
      >
        <div className="p-4 sm:p-6 space-y-8 sm:space-y-12 max-w-full">
          {/* MY BOARDS */}
          <section className="max-w-full">
            <SectionHeader
              title="My Boards"
              primaryAction={{
                label: "Create new board",
                onClick: handleCreateBoard,
              }}
              secondaryAction={{
                label: "Explore more boards",
                onClick: () => alert("Explore more boards clicked!"),
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
                      title={getBoardTitleFromMessages(board.id)}
                      widgets={getBoardWidgets(board)}
                      messages={boardMessages[board.id] || []}
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
            <Button type="button" variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

