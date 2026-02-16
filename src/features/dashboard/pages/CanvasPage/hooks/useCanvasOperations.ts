import { useCallback } from "react";
import type { Node } from "reactflow";
import { appendBoardEvent, listSnapshots } from "@/data/versionStorage";

export const useCanvasOperations = (
    boardId: string | undefined,
    userId: string,
    addNode: (node: Node) => void,
    clearDroppedNodes: () => void
) => {
    const handleAddStickyNote = useCallback(() => {
        if (!boardId) return;
        const newNode: Node = {
            id: `sticky-${Date.now()}`,
            type: "sticky-note",
            position: { x: 100, y: 100 },
            data: { text: "" },
            style: { width: 250, height: 250 },
        };
        addNode(newNode);
    }, [boardId, addNode]);

    const handleRestoreLatestSnapshot = useCallback(async () => {
        if (!boardId || !userId) return;
        const snapshots = await listSnapshots(boardId);
        const latest = snapshots[0];
        if (!latest) return;
        const nodes = JSON.parse(latest.nodesJson || "[]") as Node[];
        clearDroppedNodes();
        nodes.forEach((node) => addNode(node));
        await appendBoardEvent({
            boardId,
            actorId: userId,
            eventType: "restore_version",
            payload: { restoredVersion: latest.version },
        });
    }, [boardId, userId, clearDroppedNodes, addNode]);

    return {
        handleAddStickyNote,
        handleRestoreLatestSnapshot
    };
};
