import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { addNotification } from "@/store/uiSlice";
import {
    createBoard,
    deleteBoard,
    getReadableBoards,
    type Board,
    updateBoard,
} from "@/data/boardStorage";
import {
    getBoardRole,
    listPendingInvitesForEmail,
    type BoardInvite,
} from "@/data/shareStorage";
import { listChatMessages } from "@/data/chatStorage";
import { saveCanvas } from "@/data/canvasStorage";
import { parseBoardImportPayload } from "@/data/exportImportStorage";

export const useBoards = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const userId = useSelector((state: RootState) => state.auth.user?.$id || null);
    const userEmail = useSelector((state: RootState) => state.auth.user?.email || "");

    const [boards, setBoards] = useState<Board[]>([]);
    const [boardMessages, setBoardMessages] = useState<Record<string, any[]>>({});
    const [boardRoles, setBoardRoles] = useState<Record<string, string | null>>({});
    const [pendingInvites, setPendingInvites] = useState<BoardInvite[]>([]);
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState("all");
    const [includeArchived, setIncludeArchived] = useState(false);

    const refreshBoards = async (uid: string) => {
        try {
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
        } catch (error) {
            console.error("Error refreshing boards:", error);
        }
    };

    useEffect(() => {
        if (!userId) return;
        refreshBoards(userId);
        if (userEmail) {
            listPendingInvitesForEmail(userEmail).then(setPendingInvites);
        }
    }, [userId, userEmail]);

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

    const sortBoards = (items: Board[]) => {
        return [...items].sort((a, b) => {
            const aPinned = !!a.isPinned;
            const bPinned = !!b.isPinned;
            if (aPinned !== bPinned) return aPinned ? -1 : 1;
            return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
        });
    };

    const ownedBoards = useMemo(() => {
        return sortBoards(filteredBoards.filter((b) => (b.ownerId || b.userId) === userId));
    }, [filteredBoards, userId]);

    const sharedBoards = useMemo(() => {
        return sortBoards(filteredBoards.filter((b) => (b.ownerId || b.userId) !== userId));
    }, [filteredBoards, userId]);

    const handleCreateBoard = async () => {
        if (!userId) return;
        const newBoard = await createBoard(userId);
        dispatch(addNotification({ message: "Board created", type: "success" }));
        navigate(`/newboard/${newBoard.id}`);
    };

    const handleArchiveToggle = async (board: Board) => {
        if (!userId) return;
        const updated = { ...board, archived: !board.archived, lastActivityAt: new Date().toISOString() };
        await updateBoard(userId, updated);
        setBoards(prev => prev.map(b => b.id === board.id ? updated : b));
        dispatch(addNotification({ message: updated.archived ? "Board archived" : "Board restored", type: "info" }));
    };

    const handlePinToggle = async (board: Board) => {
        if (!userId) return;
        const updated = { ...board, isPinned: !board.isPinned };
        await updateBoard(userId, updated);
        setBoards(prev => prev.map(b => b.id === board.id ? updated : b));
    };

    const handleDeleteBoard = async (boardId: string) => {
        if (!userId) return;
        await deleteBoard(userId, boardId);
        setBoards(prev => prev.filter(b => b.id !== boardId));
        dispatch(addNotification({ message: "Board deleted", type: "warning" }));
    };

    const handleImportBoard = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (event.target) event.target.value = "";
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

    return {
        userId,
        userEmail,
        boards,
        ownedBoards,
        sharedBoards,
        boardMessages,
        boardRoles,
        pendingInvites,
        query,
        setQuery,
        activeTag,
        setActiveTag,
        includeArchived,
        setIncludeArchived,
        allTags,
        handleCreateBoard,
        handleArchiveToggle,
        handlePinToggle,
        handleDeleteBoard,
        handleImportBoard,
        refreshBoards
    };
};
