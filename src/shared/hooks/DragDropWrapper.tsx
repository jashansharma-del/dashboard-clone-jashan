import { useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Node, NodeChange } from "reactflow";
import { applyNodeChanges } from "reactflow";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import { addNotification } from "../../store/uiSlice";
import { DragDropContext } from "./DragDropContext";
import { updateBoard, getBoardById, type Widget } from "../../data/boardStorage";
import { loadCanvas, saveCanvas } from "../../data/canvasStorage";
import { appendBoardEvent, createSnapshot, listBoardEvents } from "../../data/versionStorage";
import { withRetry } from "../../lib/retry";
import { canEditBoard } from "../../data/shareStorage";

interface DragDropWrapperProps {
  children: ReactNode;
  boardId?: string;
}

export default function DragDropWrapper({
  children,
  boardId: propBoardId,
}: DragDropWrapperProps) {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);
  const [droppedNodes, setDroppedNodes] = useState<Node[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const hasShownSaveError = useRef(false);
  const changeCounter = useRef(0);
  const lastSyncedEventId = useRef<string | null>(null);
  const lastAppliedNodesJson = useRef<string>("");
  const lastPersistedNodesJson = useRef<string>("");

  useEffect(() => {
    if (!propBoardId || !userId) {
      setCanEdit(true);
      return;
    }
    canEditBoard(propBoardId, userId)
      .then((editable) => setCanEdit(editable || false))
      .catch(() => setCanEdit(true));
  }, [propBoardId, userId]);

  useEffect(() => {
    if (!propBoardId) {
      setDroppedNodes([]);
      setIsLoaded(false);
      return;
    }

    let cancelled = false;
    const loadNodes = async () => {
      const result = await loadCanvas(propBoardId);
      if (!cancelled) {
        const nodes = result.nodes || [];
        const nodesJson = JSON.stringify(nodes);
        lastAppliedNodesJson.current = nodesJson;
        lastPersistedNodesJson.current = nodesJson;
        setDroppedNodes(nodes);
        setIsLoaded(true);
      }
    };

    loadNodes();
    return () => {
      cancelled = true;
    };
  }, [propBoardId]);

  useEffect(() => {
    if (!propBoardId) return;

    const interval = window.setInterval(async () => {
      try {
        const events = await listBoardEvents(propBoardId);
        if (!events.length) return;
        const latest = events[0];
        if (!latest || latest.id === lastSyncedEventId.current) return;
        lastSyncedEventId.current = latest.id;

        if (latest.eventType === "node_update" && latest.payload?.nodesJson) {
          const nodesJson = String(latest.payload.nodesJson);
          if (nodesJson === lastAppliedNodesJson.current) return;
          const next = JSON.parse(nodesJson) as Node[];
          lastAppliedNodesJson.current = nodesJson;
          setDroppedNodes(next);
        }
      } catch {
        // Keep UI responsive even if event sync fails.
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [propBoardId]);

  const addNode = useCallback((node: Node) => {
    if (!canEdit) return;
    setDroppedNodes((nodes) => [...nodes, node]);
  }, [canEdit]);

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<Omit<Node, "id" | "type">>) => {
      if (!canEdit) return;
      setDroppedNodes((nodes) =>
        nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
      );
    },
    [canEdit]
  );

  const removeNode = useCallback((nodeId: string) => {
    if (!canEdit) return;
    setDroppedNodes((nodes) => nodes.filter((n) => n.id !== nodeId));
  }, [canEdit]);

  const clearDroppedNodes = useCallback(() => {
    if (!canEdit) return;
    setDroppedNodes([]);
  }, [canEdit]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!canEdit) return;
    setDroppedNodes((nodes) => applyNodeChanges(changes, nodes));
  }, [canEdit]);

  useEffect(() => {
    if (!propBoardId || !isLoaded || !canEdit) return;
    const nodesJson = JSON.stringify(droppedNodes || []);
    if (nodesJson === lastPersistedNodesJson.current) return;

    const timer = window.setTimeout(() => {
      const persist = async () => {
        try {
          await withRetry(() => saveCanvas(propBoardId, droppedNodes, [], undefined), {
            retries: 2,
            baseDelayMs: 250,
          });
          hasShownSaveError.current = false;
          lastPersistedNodesJson.current = nodesJson;

          if (!userId) return;

          const board = await getBoardById(userId, propBoardId);
          if (!board) return;

          const widgets: Widget[] = droppedNodes.map((node) => ({
            id: node.id,
            type: node.type || "unknown",
            position: node.position || { x: 0, y: 0 },
            props: {
              label: (node.data as any)?.label || node.type || "Chart",
              data: (node.data as any)?.graphData || [],
              width: node.width,
              height: node.height,
            },
          }));

          const updatedBoard = { ...board, widgets, lastActivityAt: new Date().toISOString() };
          await updateBoard(userId, updatedBoard);

          const eventId = await appendBoardEvent({
            boardId: propBoardId,
            actorId: userId,
            eventType: "node_update",
            payload: {
              nodesJson,
              serverTs: new Date().toISOString(),
            },
          });
          lastSyncedEventId.current = eventId;
          changeCounter.current += 1;

          if (changeCounter.current >= 25) {
            const version = Date.now();
            await createSnapshot({
              boardId: propBoardId,
              version,
              sourceEventId: eventId,
              nodesJson,
              edgesJson: JSON.stringify([]),
              widgetsJson: JSON.stringify(widgets),
              createdBy: userId,
            });
            changeCounter.current = 0;
            dispatch(addNotification({ message: "Version snapshot created", type: "info" }));
          }
        } catch (err) {
          console.error("Failed to save canvas:", err);
          if (!hasShownSaveError.current) {
            dispatch(
              addNotification({
                message: "Failed to save canvas. Changes may be lost if refreshed.",
                type: "error",
              })
            );
            hasShownSaveError.current = true;
          }
        }
      };
      persist();
    }, 700);

    return () => clearTimeout(timer);
  }, [droppedNodes, propBoardId, userId, isLoaded, canEdit, dispatch]);

  return (
    <DragDropContext.Provider
      value={{
        droppedNodes,
        addNode,
        updateNode,
        clearDroppedNodes,
        removeNode,
        onNodesChange,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
}
