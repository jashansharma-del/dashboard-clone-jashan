import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import SectionHeader from "../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../shared/components/ui/ui/BoardCard";
import { Input } from "../../shared/components/ui/ui/input";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import {
  getReadableBoards,
  createBoard,
  deleteBoard,
  updateBoard,
  type Board,
  type Widget,
  type Message,
  type ChartData,
} from "../../data/boardStorage";
import { listChatMessages } from "../../data/chatStorage";
import {
  type WebexPerson,
  searchWebexPeopleByEmail,
  sendWebexDirectMessage,
} from "./components/auth/webexAuth";
import { getWebexAccessToken } from "./components/utils/webexStorage";

export default function BoardsPage() {
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMessages, setBoardMessages] = useState<Record<string, Message[]>>({});
  const [themeVersion, setThemeVersion] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [shareBoardId, setShareBoardId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [searchResults, setSearchResults] = useState<WebexPerson[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<WebexPerson | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBoards([]);
      setBoardMessages({});
      return;
    }

    let cancelled = false;
    const loadBoards = async () => {
      const loadedBoards = await getReadableBoards(userId);
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
    const updatedBoards = await getReadableBoards(userId);
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

  const handlePinToggle = async (board: Board) => {
    if (!userId || board.userId !== userId) return;
    const updatedBoard: Board = {
      ...board,
      isPinned: !Boolean(board.isPinned),
    };

    await updateBoard(userId, updatedBoard);
    setBoards((prev) =>
      prev.map((existingBoard) =>
        existingBoard.id === board.id ? updatedBoard : existingBoard
      )
    );
  };

  const confirmDelete = async () => {
    if (boardToDelete && userId) {
      await deleteBoard(userId, boardToDelete);
      const updatedBoards = await getReadableBoards(userId);
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

  const openShareDialog = (boardId: string) => {
    setShareBoardId(boardId);
    setShareEmail("");
    setSearchResults([]);
    setSelectedRecipient(null);
    setShareError(null);
    setShareSuccess(null);
  };

  const closeShareDialog = () => {
    setShareBoardId(null);
    setShareEmail("");
    setSearchResults([]);
    setSelectedRecipient(null);
    setIsSearching(false);
    setIsSending(false);
    setShareError(null);
    setShareSuccess(null);
  };

  const handleSearchPeople = async () => {
    const email = shareEmail.trim();
    if (!email) {
      setShareError("Enter an email address to search.");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setShareError(null);
    setShareSuccess(null);
    setSelectedRecipient(null);

    try {
      const accessToken = await getWebexAccessToken();
      if (!accessToken) {
        throw new Error("Webex session expired. Please sign in with Webex again.");
      }

      const people = await searchWebexPeopleByEmail(accessToken, email);
      setSearchResults(people);
      if (people.length === 0) {
        setShareError("No Webex user found for this email.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to search Webex users.";
      setShareError(message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendShare = async () => {
    if (!shareBoardId) return;
    if (!selectedRecipient?.id) {
      setShareError("Select a recipient before sending.");
      return;
    }

    setIsSending(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const accessToken = await getWebexAccessToken();
      if (!accessToken) {
        throw new Error("Webex session expired. Please sign in with Webex again.");
      }

      const boardUrl = `${window.location.origin}/newboard/${shareBoardId}`;
      const recipientName =
        selectedRecipient.displayName ||
        selectedRecipient.emails?.[0] ||
        "there";
      const markdown = [
        `Hi ${recipientName},`,
        "",
        `I shared a board with you. Open it here: [Open board](${boardUrl})`,
        "",
        `Board ID: ${shareBoardId}`,
      ].join("\n");

      await sendWebexDirectMessage(accessToken, {
        toPersonId: selectedRecipient.id,
        markdown,
        text: `Hi ${recipientName}, I shared a board with you: ${boardUrl} (Board ID: ${shareBoardId})`,
      });

      setShareSuccess("Board shared successfully via Webex DM.");
      setTimeout(() => {
        closeShareDialog();
      }, 900);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send Webex message.";
      setShareError(message);
    } finally {
      setIsSending(false);
    }
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

  const sortBoardsByPin = (inputBoards: Board[]) => {
    return inputBoards
      .map((board, index) => ({ board, index }))
      .sort((a, b) => {
        const aPinned = Boolean(a.board.isPinned);
        const bPinned = Boolean(b.board.isPinned);
        if (aPinned === bPinned) return a.index - b.index;
        return aPinned ? -1 : 1;
      })
      .map(({ board }) => board);
  };

  const ownedBoards = useMemo(() => {
    const owned = boards.filter((board) => board.userId === userId);
    return sortBoardsByPin(owned);
  }, [boards, userId]);

  const sharedBoards = useMemo(() => {
    const shared = boards.filter((board) => board.userId !== userId);
    return sortBoardsByPin(shared);
  }, [boards, userId]);

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
                {ownedBoards.map((board: Board) => (
                  <div
                    key={board.id}
                    className="flex-shrink-0 transition-all duration-300 w-[350px] sm:w-[420px]"
                  >
                    <BoardCard
                      title={getBoardTitleFromMessages(board.id)}
                      widgets={getBoardWidgets(board)}
                      messages={boardMessages[board.id] || []}
                      onClick={() => navigate(`/newboard/${board.id}`)}
                      showMenu
                      canMutate
                      isPinned={Boolean(board.isPinned)}
                      onShare={() => openShareDialog(board.id)}
                      onPinToggle={() => handlePinToggle(board)}
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

            <div className="overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6 max-w-full scrollbar-hide">
              <div className="flex gap-4 sm:gap-6 min-w-max">
                {sharedBoards.map((board: Board) => (
                  <div
                    key={board.id}
                    className="flex-shrink-0 transition-all duration-300 w-[350px] sm:w-[420px]"
                  >
                    <BoardCard
                      title={getBoardTitleFromMessages(board.id)}
                      widgets={getBoardWidgets(board)}
                      messages={boardMessages[board.id] || []}
                      onClick={() => navigate(`/newboard/${board.id}`)}
                      showMenu
                      canMutate={false}
                      isPinned={Boolean(board.isPinned)}
                      onShare={() => openShareDialog(board.id)}
                      onPinToggle={() => window.alert("Coming soon")}
                      onDelete={() => window.alert("Coming soon")}
                    />
                  </div>
                ))}
                {sharedBoards.length === 0 && (
                  <div className="w-[300px] sm:w-[350px] rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                    No boards shared with you yet.
                  </div>
                )}
              </div>
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

      <Dialog open={!!shareBoardId} onOpenChange={(open) => !open && closeShareDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Board</DialogTitle>
            <DialogDescription>
              Search a Webex user by email and send this board link in a direct message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="recipient@company.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchPeople();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchPeople}
                disabled={isSearching || isSending}
              >
                <Search className="h-4 w-4 mr-1" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Search by email to find a Webex recipient.
                </div>
              ) : (
                <div className="divide-y">
                  {searchResults.map((person) => {
                    const isSelected = selectedRecipient?.id === person.id;
                    const email = person.emails?.[0] || "No email";
                    return (
                      <button
                        key={person.id}
                        type="button"
                        className={`w-full text-left p-3 text-sm transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                        onClick={() => {
                          setSelectedRecipient(person);
                          setShareError(null);
                        }}
                      >
                        <div className="font-medium">{person.displayName || email}</div>
                        <div className="text-xs text-muted-foreground">{email}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {shareError && <p className="text-sm text-red-600">{shareError}</p>}
            {shareSuccess && <p className="text-sm text-green-600">{shareSuccess}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeShareDialog} disabled={isSending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendShare}
              disabled={!shareBoardId || !selectedRecipient || isSending}
            >
              {isSending ? "Sending..." : "Send Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

