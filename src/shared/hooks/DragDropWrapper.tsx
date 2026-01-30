import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { Node, NodeChange } from "reactflow";
import { applyNodeChanges } from "reactflow";
import { DragDropContext } from "./DragDropContext";
import { updateBoard, getBoardById, type Widget} from "../../../data/boardStorage";

const DROPPED_NODES_KEY_PREFIX = "droppedNodes";

interface DragDropWrapperProps {
  children: ReactNode;
  boardId?: string;
}

export default function DragDropWrapper({
  children,
  boardId: propBoardId,
}: DragDropWrapperProps) {
  const getStorageKey = (boardId: string) =>
    `${DROPPED_NODES_KEY_PREFIX}_${boardId}`;

  const [droppedNodes, setDroppedNodes] = useState<Node[]>(() => {
    if (!propBoardId) return [];
    try {
      const stored = localStorage.getItem(getStorageKey(propBoardId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      localStorage.removeItem(getStorageKey(propBoardId));
      return [];
    }
  });

  const addNode = useCallback((node: Node) => {
    console.log("✅ addNode called with:", node);
    setDroppedNodes(nodes => {
      const updated = [...nodes, node];
      console.log("✅ Updated nodes array:", updated);
      return updated;
    });
  }, []);

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<Omit<Node, "id" | "type">>) => {
      setDroppedNodes(nodes =>
        nodes.map(n => (n.id === nodeId ? { ...n, ...updates } : n))
      );
    },
    []
  );

  const removeNode = useCallback((nodeId: string) => {
    setDroppedNodes(nodes => nodes.filter(n => n.id !== nodeId));
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
    try {
      console.log("💾 Saving nodes to localStorage:", droppedNodes);
      localStorage.setItem(
        getStorageKey(propBoardId),
        JSON.stringify(droppedNodes)
      );

      const userData = localStorage.getItem("auth_user");
      if (userData) {
        const user = JSON.parse(userData);
        const userId = user.id;

        const board = getBoardById(userId, propBoardId);
        if(board){
          const widgets: Widget[] = droppedNodes.map(node => ({
          id: node.id,
          type: node.type || "unknown",
          position: node.position || { x: 0, y: 0 },
          props: {
            label: node.data?.label || node.type || "Chart",
            data: node.data?.graphData || [],
            width: node.width ,
            height: node.height 
          }
        }));
        const updatedBoard = { ...board,widgets};
        updateBoard(userId, updatedBoard);
        }
      }
    } catch (err) {
      console.error("Failed to save nodes:", err);
    }
  }, [droppedNodes, propBoardId]);

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