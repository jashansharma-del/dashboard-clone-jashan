import { useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Node, NodeChange } from "reactflow";
import { applyNodeChanges } from "reactflow";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { DragDropContext } from "./DragDropContext";
import { updateBoard, getBoardById, type Widget } from "../../data/boardStorage";
import { loadCanvas, saveCanvas } from "../../data/canvasStorage";

interface DragDropWrapperProps {
  children: ReactNode;
  boardId?: string;
}

export default function DragDropWrapper({
  children,
  boardId: propBoardId,
}: DragDropWrapperProps) {
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);
  const [droppedNodes, setDroppedNodes] = useState<Node[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasShownSaveError = useRef(false);

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
        setDroppedNodes(result.nodes || []);
        setIsLoaded(true);
      }
    };

    loadNodes();
    return () => {
      cancelled = true;
    };
  }, [propBoardId]);

  const addNode = useCallback((node: Node) => {
    setDroppedNodes((nodes) => [...nodes, node]);
  }, []);

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<Omit<Node, "id" | "type">>) => {
      setDroppedNodes((nodes) =>
        nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
      );
    },
    []
  );

  const removeNode = useCallback((nodeId: string) => {
    setDroppedNodes((nodes) => nodes.filter((n) => n.id !== nodeId));
  }, []);

  const clearDroppedNodes = useCallback(() => {
    setDroppedNodes([]);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setDroppedNodes((nodes) => applyNodeChanges(changes, nodes));
  }, []);

  useEffect(() => {
    if (!propBoardId) return;
    if (!isLoaded) return;

    const persist = async () => {
      try {
        await saveCanvas(propBoardId, droppedNodes, [], userId || undefined);
        hasShownSaveError.current = false;

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

        const updatedBoard = { ...board, widgets };
        await updateBoard(userId, updatedBoard);
      } catch (err) {
        console.error("Failed to save canvas:", err);
        if (!hasShownSaveError.current) {
          window.alert("Failed to save canvas to server. Changes will be lost if you refresh now.");
          hasShownSaveError.current = true;
        }
      }
    };

    persist();
  }, [droppedNodes, propBoardId, userId, isLoaded]);

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
