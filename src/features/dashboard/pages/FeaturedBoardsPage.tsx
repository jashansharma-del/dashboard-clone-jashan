import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import SectionHeader from "../../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../../shared/components/ui/ui/BoardCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addNotification } from "../../../store/uiSlice";
import { useDispatch } from "react-redux";
import {
  deleteBoard,
  getReadableBoards,
  type Board,
  type ChartData,
  type Message,
  type Widget,
} from "../../../data/boardStorage";
import { canEditBoard, getBoardRole } from "../../../data/shareStorage";
import { listChatMessages } from "../../../data/chatStorage";

type RoleMap = Record<string, "owner" | "editor" | "viewer" | null>;

export default function FeaturedBoardsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMessages, setBoardMessages] = useState<Record<string, Message[]>>({});
  const [boardRoles, setBoardRoles] = useState<RoleMap>({});
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  const refreshBoards = async (uid: string) => {
    const loadedBoards = await getReadableBoards(uid);
    const featured = loadedBoards.filter((board) =>
      (board.tags || []).includes("featured")
    );
    setBoards(featured);

    const messagesEntries = await Promise.all(
      featured.map(async (board) => {
        const messages = await listChatMessages(board.id);
        return [board.id, messages] as const;
      })
    );
    setBoardMessages(Object.fromEntries(messagesEntries));

    const roles = await Promise.all(
      featured.map(async (board) => [board.id, await getBoardRole(board.id, uid)] as const)
    );
    setBoardRoles(Object.fromEntries(roles));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) {
        setBoards([]);
        setBoardMessages({});
        setBoardRoles({});
        return;
      }

      await refreshBoards(userId);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sortBoardsByPin = (inputBoards: Board[]) => {
    return inputBoards
      .map((board, index) => ({ board, index }))
      .sort((a, b) => {
        const aPinned = Boolean(a.board.isPinned);
        const bPinned = Boolean(b.board.isPinned);
        if (aPinned === bPinned) {
          const aActivity = new Date(a.board.lastActivityAt || 0).getTime();
          const bActivity = new Date(b.board.lastActivityAt || 0).getTime();
          return bActivity - aActivity || a.index - b.index;
        }
        return aPinned ? -1 : 1;
      })
      .map(({ board }) => board);
  };

  const sortedBoards = useMemo(() => sortBoardsByPin(boards), [boards]);

  const getBoardWidgets = (board: Board) => {
    const widgets: Array<{ type: string; label: string; data?: ChartData[] }> = [];
    const chatMessages = boardMessages[board.id] || [];

    const chartMessages = chatMessages.filter((msg) => msg.role === "assistant" && msg.graphData);
    chartMessages.forEach((msg, index) => {
      widgets.push({ type: "chart", label: `Chart ${index + 1}`, data: msg.graphData });
    });

    const boardWidgets = (board.widgets || []).map((w: Widget) => ({
      type: w.type,
      label: typeof w.props?.label === "string" ? w.props?.label || w.type : w.type,
      data: w.props?.data,
    }));

    return [...widgets, ...boardWidgets];
  };

  const getBoardTitleFromMessages = (boardId: string) => {
    const messages = boardMessages[boardId] || [];
    if (messages.length === 0) return "Untitled Board";

    const firstUserMessage = messages.find((msg) => msg.role === "user" && msg.text.trim() !== "");
    return firstUserMessage
      ? firstUserMessage.text.length > 30
        ? `${firstUserMessage.text.slice(0, 30)}...`
        : firstUserMessage.text
      : "Untitled Board";
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoardToDelete(boardId);
  };

  const confirmDelete = async () => {
    if (!boardToDelete || !userId) return;

    const editable = await canEditBoard(boardToDelete, userId).catch(() => true);
    if (!editable) {
      dispatch(addNotification({ message: "No permission to delete this board", type: "error" }));
      setBoardToDelete(null);
      return;
    }

    await deleteBoard(userId, boardToDelete);
    await refreshBoards(userId);
    dispatch(addNotification({ message: "Board deleted", type: "warning" }));
    setBoardToDelete(null);
  };

  const cancelDelete = () => setBoardToDelete(null);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <div className="p-4 sm:p-6 space-y-8 sm:space-y-12 max-w-full">
        <section className="flex items-center justify-between gap-2">
          <SectionHeader title="Featured canvases" />
          <Button type="button" variant="outline" onClick={() => navigate("/boards")}>
            Back to boards
          </Button>
        </section>

        <section className="max-w-full">
          <div className="overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6 max-w-full scrollbar-hide">
            <div className="flex gap-4 sm:gap-6 min-w-max">
              {sortedBoards.map((board) => {
                const role = boardRoles[board.id];
                // Fallback: if role not yet loaded or failed, check if userId matches board.userId
                // This ensures local owners can see the menu immediately.
                const isOwner = role === "owner" || board.userId === userId || board.ownerId === userId;
                const canMutate = isOwner || role === "editor";

                return (
                  <div key={board.id} className="flex-shrink-0 transition-all duration-300 w-[350px] sm:w-[420px]">
                    <BoardCard
                      title={getBoardTitleFromMessages(board.id)}
                      widgets={getBoardWidgets(board)}
                      messages={boardMessages[board.id] || []}
                      onClick={() => navigate(`/featured/${board.id}`)}
                      showMenu={canMutate}
                      canMutate={canMutate}
                      isPinned={Boolean(board.isPinned)}
                      onDelete={() => handleDeleteBoard(board.id)}
                    />
                  </div>
                );
              })}
              {sortedBoards.length === 0 && (
                <div className="w-[300px] sm:w-[350px] rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                  No featured canvases yet. Use the menu on a board card to mark one as featured.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={!!boardToDelete} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the board and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

