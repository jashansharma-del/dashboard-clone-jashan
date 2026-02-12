import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Download, Search, Upload } from "lucide-react";
import SectionHeader from "../../shared/components/ui/ui/SectionHeader";
import BoardCard from "../../shared/components/ui/ui/BoardCard";
import { Input } from "../../shared/components/ui/ui/input";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import { addNotification } from "../../store/uiSlice";
import {
  addChartWidget,
  createBoard,
  deleteBoard,
  getReadableBoards,
  type Board,
  type ChartData,
  type Message,
  type Widget,
  updateBoard,
} from "../../data/boardStorage";
import {
  acceptBoardInvite,
  canEditBoard,
  declineBoardInvite,
  getBoardRole,
  inviteBoardMember,
  listBoardInvites,
  listBoardMembers,
  listPendingInvitesForEmail,
  revokeBoardMember,
  updateBoardMemberRole,
  type BoardInvite,
} from "../../data/shareStorage";
import type { BoardMember } from "../../data/collabTypes";
import { listChatMessages } from "../../data/chatStorage";
import { loadCanvas, saveCanvas } from "../../data/canvasStorage";
import { buildBoardExportPayload, parseBoardImportPayload } from "../../data/exportImportStorage";
import { BUILTIN_TEMPLATES } from "../../data/templates";
import { withRetry } from "../../lib/retry";

type RoleMap = Record<string, "owner" | "editor" | "viewer" | null>;

const IMPORTED_BOARD_IDS_STORAGE_KEY = "imported-board-ids";

function loadImportedBoardIds(userId: string | null): string[] {
  if (!userId) return [];
  try {
    const raw = window.localStorage.getItem(`${IMPORTED_BOARD_IDS_STORAGE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

function persistImportedBoardIds(userId: string | null, boardIds: string[]) {
  if (!userId) return;
  window.localStorage.setItem(
    `${IMPORTED_BOARD_IDS_STORAGE_KEY}:${userId}`,
    JSON.stringify(boardIds)
  );
}

export default function BoardsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);
  const userEmail = useSelector((state: RootState) => state.auth.user?.email || "");

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMessages, setBoardMessages] = useState<Record<string, Message[]>>({});
  const [boardRoles, setBoardRoles] = useState<RoleMap>({});
  const [themeVersion, setThemeVersion] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  const [shareBoardId, setShareBoardId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("viewer");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [importedBoardIds, setImportedBoardIds] = useState<string[]>([]);
  const [importingBoardId, setImportingBoardId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [invites, setInvites] = useState<BoardInvite[]>([]);

  const [pendingInvites, setPendingInvites] = useState<BoardInvite[]>([]);

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(BUILTIN_TEMPLATES[0]?.id || "");

  const importRef = useRef<HTMLInputElement>(null);

  const refreshBoards = async (uid: string) => {
    const loadedBoards = await getReadableBoards(uid);
    setBoards(loadedBoards);

    const messagesEntries = await Promise.all(
      loadedBoards.map(async (board) => {
        const messages = await listChatMessages(board.id);
        return [board.id, messages] as const;
      })
    );
    setBoardMessages(Object.fromEntries(messagesEntries));

    const roles = await Promise.all(
      loadedBoards.map(async (board) => [board.id, await getBoardRole(board.id, uid)] as const)
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
        setPendingInvites([]);
        return;
      }

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

      const roles = await Promise.all(
        loadedBoards.map(async (board) => [board.id, await getBoardRole(board.id, userId)] as const)
      );
      if (cancelled) return;
      setBoardRoles(Object.fromEntries(roles));

      if (userEmail) {
        const pending = await listPendingInvitesForEmail(userEmail);
        if (!cancelled) {
          setPendingInvites(pending);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, userEmail]);

  useEffect(() => {
    setImportedBoardIds(loadImportedBoardIds(userId));
  }, [userId]);

  // Listen for theme changes to force re-render
  useEffect(() => {
    const handleThemeChange = () => {
      setIsTransitioning(true);
      setThemeVersion((prev) => prev + 1);
      setTimeout(() => setIsTransitioning(false), 500);
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    boards.forEach((board) => {
      (board.tags || []).forEach((tag) => tags.add(tag));
    });
    return ["all", ...Array.from(tags).sort()];
  }, [boards]);

  const filteredBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return boards.filter((board) => {
      if (!includeArchived && board.archived) return false;
      if (activeTag !== "all" && !(board.tags || []).includes(activeTag)) return false;
      if (!q) return true;
      const title = board.title.toLowerCase();
      const firstMessage = (boardMessages[board.id] || [])[0]?.text?.toLowerCase() || "";
      const tags = (board.tags || []).join(" ").toLowerCase();
      return title.includes(q) || firstMessage.includes(q) || tags.includes(q);
    });
  }, [boards, includeArchived, activeTag, query, boardMessages]);

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

  const ownedBoards = useMemo(() => {
    const owned = filteredBoards.filter((board) => (board.ownerId || board.userId) === userId);
    return sortBoardsByPin(owned);
  }, [filteredBoards, userId]);

  const sharedBoards = useMemo(() => {
    const shared = filteredBoards.filter((board) => (board.ownerId || board.userId) !== userId);
    return sortBoardsByPin(shared);
  }, [filteredBoards, userId]);

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

  const handleCreateBoard = async () => {
    if (!userId) return;
    const newBoard = await createBoard(userId);
    await refreshBoards(userId);
    setBoardMessages((prev) => ({ ...prev, [newBoard.id]: [] }));
    dispatch(addNotification({ message: "Board created", type: "success" }));
    navigate(`/newboard/${newBoard.id}`);
  };

  const handleCreateTemplateBoard = async () => {
    if (!userId) return;
    const template = BUILTIN_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    const newBoard = await createBoard(userId);
    const title = `${template.name} Board`;
    await updateBoard(userId, {
      ...newBoard,
      title,
      tags: ["template", template.id],
      widgets: [],
      archived: false,
    });

    await addChartWidget(userId, newBoard.id, template.name, template.data);

    const nodes = [
      {
        id: `${template.chartType}-${Date.now()}`,
        type: template.chartType,
        position: { x: 120, y: 120 },
        data: {
          label: template.name,
          graphData: template.data,
          width: 400,
          height: 200,
        },
        style: { width: 400, height: 200 },
      },
    ];

    await saveCanvas(newBoard.id, nodes, [], userId);
    await refreshBoards(userId);
    setTemplateDialogOpen(false);
    dispatch(addNotification({ message: `${template.name} template created`, type: "success" }));
    navigate(`/newboard/${newBoard.id}`);
  };

  const handlePinToggle = async (board: Board) => {
    if (!userId) return;
    const role = boardRoles[board.id];
    if (role !== "owner" && role !== "editor") return;

    const updatedBoard: Board = { ...board, isPinned: !Boolean(board.isPinned) };
    await updateBoard(userId, updatedBoard);
    setBoards((prev) => prev.map((b) => (b.id === board.id ? updatedBoard : b)));
  };

  const handleArchiveToggle = async (board: Board) => {
    if (!userId) return;
    const role = boardRoles[board.id];
    if (role !== "owner" && role !== "editor") return;

    const updatedBoard: Board = {
      ...board,
      archived: !Boolean(board.archived),
      lastActivityAt: new Date().toISOString(),
    };
    await updateBoard(userId, updatedBoard);
    setBoards((prev) => prev.map((b) => (b.id === board.id ? updatedBoard : b)));
    dispatch(addNotification({ message: updatedBoard.archived ? "Board archived" : "Board restored", type: "info" }));
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
    setBoardMessages((prev) => {
      const next = { ...prev };
      delete next[boardToDelete];
      return next;
    });
    dispatch(addNotification({ message: "Board deleted", type: "warning" }));
    setBoardToDelete(null);
  };

  const cancelDelete = () => setBoardToDelete(null);

  const openShareDialog = async (boardId: string) => {
    setShareBoardId(boardId);
    setShareEmail("");
    setShareRole("viewer");
    setShareError(null);
    setShareSuccess(null);

    const [loadedMembers, loadedInvites] = await Promise.all([
      listBoardMembers(boardId),
      listBoardInvites(boardId),
    ]);
    setMembers(loadedMembers);
    setInvites(loadedInvites);
  };

  const closeShareDialog = () => {
    setShareBoardId(null);
    setShareEmail("");
    setShareRole("viewer");
    setShareError(null);
    setShareSuccess(null);
    setMembers([]);
    setInvites([]);
  };

  const handleSendInvite = async () => {
    if (!shareBoardId || !userId) return;
    const email = shareEmail.trim().toLowerCase();
    if (!email) {
      setShareError("Enter an email address first.");
      return;
    }

    setIsSending(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      await withRetry(
        () => inviteBoardMember({ boardId: shareBoardId, email, role: shareRole, invitedBy: userId }),
        { retries: 2, baseDelayMs: 300 }
      );
      const [loadedMembers, loadedInvites] = await Promise.all([
        listBoardMembers(shareBoardId),
        listBoardInvites(shareBoardId),
      ]);
      setMembers(loadedMembers);
      setInvites(loadedInvites);
      setShareSuccess(`Invite sent to ${email} as ${shareRole}.`);
      setShareEmail("");
      dispatch(addNotification({ message: "Board invite sent", type: "success" }));
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Failed to send invite.");
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeRole = async (memberId: string, role: "editor" | "viewer") => {
    if (!shareBoardId) return;
    await updateBoardMemberRole(shareBoardId, memberId, role);
    setMembers(await listBoardMembers(shareBoardId));
  };

  const handleRevokeMember = async (memberId: string) => {
    if (!shareBoardId) return;
    await revokeBoardMember(shareBoardId, memberId);
    setMembers(await listBoardMembers(shareBoardId));
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!userId) return;
    await acceptBoardInvite(inviteId, { userId, email: userEmail || undefined });
    dispatch(addNotification({ message: "Invite accepted", type: "success" }));
    setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
    await refreshBoards(userId);
  };

  const handleDeclineInvite = async (inviteId: string) => {
    await declineBoardInvite(inviteId);
    setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
  };

  const handleExportBoard = async (board: Board) => {
    const canvas = await loadCanvas(board.id);
    const chat = boardMessages[board.id] || [];
    const payload = buildBoardExportPayload({ board, nodes: canvas.nodes, edges: canvas.edges, chat });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${board.title.replace(/\s+/g, "-").toLowerCase()}-${board.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch(addNotification({ message: "Board export ready", type: "success" }));
  };

  const triggerImport = () => {
    importRef.current?.click();
  };

  const handleImportBoard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;

    try {
      const text = await file.text();
      const payload = parseBoardImportPayload(text);
      const newBoard = await createBoard(userId);
      await updateBoard(userId, {
        ...newBoard,
        title: `${payload.board.title} (Imported)`,
        widgets: payload.board.widgets || [],
        tags: payload.board.tags || ["imported"],
        archived: Boolean(payload.board.archived),
      });
      await saveCanvas(newBoard.id, payload.canvas.nodes, payload.canvas.edges, userId);
      await refreshBoards(userId);
      dispatch(addNotification({ message: "Board imported", type: "success" }));
      navigate(`/newboard/${newBoard.id}`);
    } catch (error) {
      dispatch(
        addNotification({
          message: error instanceof Error ? error.message : "Failed to import board",
          type: "error",
        })
      );
    }
  };

  return (
    <>
      <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImportBoard} />

      <div
        className={`min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground transition-all duration-300 ${
          isTransitioning ? "opacity-95" : "opacity-100"
        }`}
        key={themeVersion}
      >
        <div className="p-4 sm:p-6 space-y-8 sm:space-y-12 max-w-full">
          {pendingInvites.length > 0 && (
            <section className="rounded-xl border p-4 bg-card">
              <h3 className="font-semibold mb-3">Pending invites</h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between gap-3 border rounded p-2 text-sm">
                    <div>
                      <div className="font-medium">Board: {invite.boardId}</div>
                      <div className="text-muted-foreground">Role: {invite.role}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => handleAcceptInvite(invite.id)}>Accept</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDeclineInvite(invite.id)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px] flex-1 max-w-xl">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search boards, tags, chat content"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <Button type="button" variant="outline" onClick={() => setIncludeArchived((prev) => !prev)}>
                <Archive className="w-4 h-4 mr-1" />
                {includeArchived ? "Hide archived" : "Show archived"}
              </Button>

              <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                Templates
              </Button>

              <Button type="button" variant="outline" onClick={triggerImport}>
                <Upload className="w-4 h-4 mr-1" />
                Import
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    activeTag === tag ? "bg-primary text-primary-foreground" : "bg-background"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section className="max-w-full">
            <SectionHeader
              title="My Boards"
              primaryAction={{ label: "Create new board", onClick: handleCreateBoard }}
              secondaryAction={{ label: "Create from template", onClick: () => setTemplateDialogOpen(true) }}
            />

            <div className="overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6 max-w-full scrollbar-hide">
              <div className="flex gap-4 sm:gap-6 min-w-max">
                {ownedBoards.map((board) => {
                  const role = boardRoles[board.id];
                  const canMutate = role === "owner" || role === "editor";
                  return (
                    <div key={board.id} className="flex-shrink-0 transition-all duration-300 w-[350px] sm:w-[420px]">
                      <BoardCard
                        title={getBoardTitleFromMessages(board.id)}
                        widgets={getBoardWidgets(board)}
                        messages={boardMessages[board.id] || []}
                        onClick={() => navigate(`/newboard/${board.id}`)}
                        showMenu
                        canMutate={canMutate}
                        isPinned={Boolean(board.isPinned)}
                        onShare={() => openShareDialog(board.id)}
                        onPinToggle={() => handlePinToggle(board)}
                        onDelete={() => handleDeleteBoard(board.id)}
                      />
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => handleArchiveToggle(board)}>
                          {board.archived ? "Unarchive" : "Archive"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => handleExportBoard(board)}>
                          <Download className="w-3 h-3 mr-1" /> JSON
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {ownedBoards.length === 0 && (
                  <div className="w-[300px] sm:w-[350px] rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                    No owned boards match current filters.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="max-w-full">
            <SectionHeader title="Boards shared with me" />

            <div className="overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6 max-w-full scrollbar-hide">
              <div className="flex gap-4 sm:gap-6 min-w-max">
                {sharedBoards.map((board) => {
                  const role = boardRoles[board.id];
                  const canMutate = role === "owner" || role === "editor";
                  return (
                    <div key={board.id} className="flex-shrink-0 transition-all duration-300 w-[350px] sm:w-[420px]">
                      <BoardCard
                        title={getBoardTitleFromMessages(board.id)}
                        widgets={getBoardWidgets(board)}
                        messages={boardMessages[board.id] || []}
                        onClick={() => navigate(`/newboard/${board.id}`)}
                        showMenu
                        canMutate={canMutate}
                        isPinned={Boolean(board.isPinned)}
                        onShare={() => openShareDialog(board.id)}
                        onPinToggle={() => handlePinToggle(board)}
                        onDelete={() => (canMutate ? handleDeleteBoard(board.id) : undefined)}
                      />
                      <div className="mt-2 text-xs text-muted-foreground">Role: {role || "viewer"}</div>
                    </div>
                  );
                })}
                {sharedBoards.length === 0 && (
                  <div className="w-[300px] sm:w-[350px] rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                    No shared boards yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>

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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Board Access</DialogTitle>
            <DialogDescription>
              Invite by email with ACL role control. Invites must be accepted before access is granted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="recipient@company.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendInvite();
                  }
                }}
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as "editor" | "viewer")}
                className="border rounded px-2 text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button type="button" onClick={handleSendInvite} disabled={isSending}>
                {isSending ? "Sending..." : "Send invite"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border p-3 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2">Active members</h4>
                <div className="space-y-2">
                  {members
                    .filter((member) => member.status === "active")
                    .map((member) => (
                      <div key={member.id} className="border rounded p-2">
                        <div className="text-sm font-medium">{member.email || member.userId}</div>
                        <div className="text-xs text-muted-foreground mb-2">{member.role}</div>
                        {member.role !== "owner" && (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeRole(member.id, member.role === "viewer" ? "editor" : "viewer")}
                            >
                              Make {member.role === "viewer" ? "Editor" : "Viewer"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeMember(member.id)}
                            >
                              Revoke
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  {members.filter((member) => member.status === "active").length === 0 && (
                    <div className="text-xs text-muted-foreground">No active members.</div>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-3 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2">Invites</h4>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="border rounded p-2">
                      <div className="text-sm font-medium">{invite.inviteEmail}</div>
                      <div className="text-xs text-muted-foreground">
                        {invite.role} � {invite.status}
                      </div>
                    </div>
                  ))}
                  {invites.length === 0 && (
                    <div className="text-xs text-muted-foreground">No invites sent yet.</div>
                  )}
                </div>
              </div>
            </div>

            {shareError && <p className="text-sm text-red-600">{shareError}</p>}
            {shareSuccess && <p className="text-sm text-green-600">{shareSuccess}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeShareDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create from template</DialogTitle>
            <DialogDescription>Select a starter template and create a board instantly.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {BUILTIN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`w-full text-left rounded border p-3 ${
                  selectedTemplateId === template.id ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/20" : ""
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateTemplateBoard}>
              Create board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
