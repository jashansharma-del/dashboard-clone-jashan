import { useEffect, useState, useCallback, useRef } from "react";
import { client } from "@/features/dashboard/components/utils/authService";
import { APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_BOARD_PRESENCE } from "@/data/appwriteConfig";
import { heartbeatPresence, listPresence, type PresenceRecord } from "@/data/presenceStorage";

export const usePresence = (boardId: string | undefined, userId: string) => {
    const [presence, setPresence] = useState<PresenceRecord[]>([]);
    const presenceWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!boardId || !userId) return;

        let cancelled = false;
        const activeCutoff = 15000;

        // 1. Initial load
        listPresence(boardId).then((items) => {
            if (cancelled) return;
            const now = Date.now();
            setPresence(
                items.filter(
                    (item) => (now - new Date(item.lastSeenAt).getTime()) < activeCutoff && item.userId !== userId
                )
            );
        });

        // 2. Real-time subscription
        const unsubscribe = client.subscribe(
            `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_BOARD_PRESENCE}.documents`,
            (response) => {
                const payload = response.payload as any;
                if (payload.boardId !== boardId || payload.userId === userId) return;

                setPresence((prev) => {
                    const now = Date.now();
                    const filtered = prev.filter(
                        (p) => (now - new Date(p.lastSeenAt).getTime()) < activeCutoff
                    );
                    const index = filtered.findIndex((p) => p.userId === payload.userId);

                    if (response.events.some((e) => e.includes("delete"))) {
                        return filtered.filter((p) => p.userId !== payload.userId);
                    }

                    const record: PresenceRecord = {
                        id: payload.$id,
                        boardId: payload.boardId,
                        userId: payload.userId,
                        cursorX: Number(payload.cursorX || 0),
                        cursorY: Number(payload.cursorY || 0),
                        activeNodeId: payload.activeNodeId || null,
                        lastSeenAt: payload.lastSeenAt || new Date().toISOString(),
                    };

                    if (index === -1) {
                        return [...filtered, record];
                    }
                    const next = [...filtered];
                    next[index] = record;
                    return next;
                });
            }
        );

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [boardId, userId]);

    const onMouseMove = useCallback(
        async (e: React.MouseEvent) => {
            if (!boardId || !userId) return;
            const bounds = presenceWrapperRef.current?.getBoundingClientRect();
            if (!bounds) return;
            const x = Math.max(0, Math.round(e.clientX - bounds.left));
            const y = Math.max(0, Math.round(e.clientY - bounds.top));
            await heartbeatPresence({ boardId, userId, cursorX: x, cursorY: y });
        },
        [boardId, userId]
    );

    return {
        presence,
        onMouseMove,
        presenceWrapperRef
    };
};
