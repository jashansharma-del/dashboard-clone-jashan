import { createContext, useContext } from "react";
import type { Node, NodeChange } from "reactflow";

interface DragDropContextType {
  droppedNodes: Node[];
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  clearDroppedNodes: () => void;
  removeNode: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
}

export const DragDropContext =
  createContext<DragDropContextType | undefined>(undefined);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within DragDropWrapper");
  }
  return context;
};
