import { useState, useCallback, useEffect } from "react";
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
    console.log("✅ addNode called with:", node);
    setDroppedNodes((nodes) => {
      const updated = [...nodes, node];
      console.log("✅ Updated nodes array:", updated);
      return updated;
    });
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

  // FIX: Use React Flow's applyNodeChanges helper
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    console.log("🔄 onNodesChange called with:", changes);
    setDroppedNodes((nodes) => {
      const updated = applyNodeChanges(changes, nodes);
      console.log("🔄 Nodes after changes:", updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!propBoardId) return;
    if (!isLoaded) return;
    const persist = async () => {
      try {
        console.log("💾 Saving nodes to Appwrite:", droppedNodes);
        await saveCanvas(propBoardId, droppedNodes, [], userId || undefined);

        if (!userId) return;
        const board = await getBoardById(userId, propBoardId);
        if (board) {
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
        }
      } catch (err) {
        console.error("Failed to save nodes:", err);
      }
    };

    persist();
  }, [droppedNodes, propBoardId, userId, isLoaded]);

  // Debug: Log droppedNodes whenever it changes
  useEffect(() => {
    console.log("🔵 droppedNodes state updated:", droppedNodes);
  }, [droppedNodes]);

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
