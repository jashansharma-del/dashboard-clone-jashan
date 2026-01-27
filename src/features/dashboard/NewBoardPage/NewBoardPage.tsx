import ReactFlow, {
  Background,
  ReactFlowProvider,
  useReactFlow,
  NodeResizer,
} from "reactflow";
import type { Node, NodeProps } from "reactflow";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "reactflow/dist/style.css";
import { useParams } from "react-router-dom";
import { Home, MoreHorizontal } from "lucide-react";

import DragDropWrapper from "../../../shared/hooks/DragDropWrapper";
import { useDragDrop } from "../../../shared/hooks/DragDropContext";
import CanvasCard from "./CanvasCard";
import AIAssistantCard from "./AIAssistantCard";

/* ============================
   PIE NODE WITH PROPER RESIZE
============================ */

type PieSlice = { label: string; value: number };

type PieNodeData = {
  graphData: PieSlice[];
  width: number;
  height: number;
};

const PieChartNode = ({ data, selected }: NodeProps<PieNodeData>) => {
  console.log("🎨 PieChartNode rendering with data:", data);
  
  const total = data.graphData.reduce((sum, slice) => sum + slice.value, 0);
  let acc = 0;
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  return (
    <>
      {/* NodeResizer with larger handle area */}
      <NodeResizer
        color="#3B82F6"
        isVisible={selected}
        minWidth={100}
        minHeight={100}
        //maxWidth={600}
        //maxHeight={600}
        handleStyle={{
          width: '12px',
          height: '12px',
          borderRadius: '2px',
        }}
        lineStyle={{
          borderWidth: '2px',
        }}
      />
      
      <div
        className="bg-white rounded-lg shadow-lg p-4 border-2 transition-colors"
        style={{
          width: '100%',
          height: '100%',
          borderColor: selected ? "#3B82F6" : "#D1D5DB",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 32 32"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none"
        >
          {data.graphData.map((slice, idx) => {
            const start = (acc / total) * 2 * Math.PI;
            acc += slice.value;
            const end = (acc / total) * 2 * Math.PI;

            const x1 = 16 + 16 * Math.cos(start);
            const y1 = 16 + 16 * Math.sin(start);
            const x2 = 16 + 16 * Math.cos(end);
            const y2 = 16 + 16 * Math.sin(end);

            const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

            return (
              <path
                key={idx}
                d={`
                  M16 16
                  L ${x1} ${y1}
                  A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2}
                  Z
                `}
                fill={colors[idx % colors.length]}
              >
                <title>
                  {slice.label}: {slice.value} ({Math.round((slice.value / total) * 100)}%)
                </title>
              </path>
            );
          })}
        </svg>
      </div>
    </>
  );
};

/* ============================
   COLLISION DETECTION HELPER
============================ */

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

function findNonOverlappingPosition(
  desiredPosition: { x: number; y: number },
  nodeWidth: number,
  nodeHeight: number,
  existingNodes: Node[]
): { x: number; y: number } {
  const OFFSET = 30;
  const MAX_ATTEMPTS = 20;

  let currentX = desiredPosition.x;
  let currentY = desiredPosition.y;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const proposedRect: Rectangle = {
      x: currentX,
      y: currentY,
      width: nodeWidth,
      height: nodeHeight,
    };

    let hasCollision = false;
    
    for (const node of existingNodes) {
      const nodeData = node.data as PieNodeData;
      const existingRect: Rectangle = {
        x: node.position.x,
        y: node.position.y,
        width: nodeData.width || 200,
        height: nodeData.height || 200,
      };

      if (rectanglesOverlap(proposedRect, existingRect)) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      console.log(`✅ Found non-overlapping position after ${attempt + 1} attempts:`, {
        x: currentX,
        y: currentY,
      });
      return { x: currentX, y: currentY };
    }

    currentX += OFFSET;
    currentY += OFFSET;
  }

  console.warn("⚠️ Could not find non-overlapping position, using offset position");
  return { x: currentX, y: currentY };
}

/* ============================
   BOARD CANVAS (Inner component with useReactFlow)
============================ */

const BoardCanvasInner = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { droppedNodes, addNode, onNodesChange, updateNode } = useDragDrop();
  
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    console.log("🔵 BoardCanvasInner - droppedNodes:", droppedNodes);
    console.log("🔵 Number of nodes:", droppedNodes.length);
  }, [droppedNodes]);

  const nodeTypes = useMemo(
    () => {
      const types = { "pie-chart": PieChartNode };
      console.log("📦 Node types registered:", Object.keys(types));
      return types;
    },
    []
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    console.log("🎯 Drop event triggered");

    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) {
      console.error("❌ Wrapper ref not available");
      return;
    }

    try {
      const rawData = e.dataTransfer.getData("application/reactflow");
      if (!rawData) {
        console.error("❌ No drag data found");
        return;
      }

      const payload = JSON.parse(rawData);
      console.log("📦 Drop payload:", payload);

      if (payload.type !== "pie-chart") {
        console.error("❌ Invalid payload type:", payload.type);
        return;
      }

      const desiredPosition = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      console.log("📍 Desired position:", desiredPosition);

      const nodeWidth = 200;
      const nodeHeight = 200;

      const finalPosition = findNonOverlappingPosition(
        {
          x: desiredPosition.x - nodeWidth / 2,
          y: desiredPosition.y - nodeHeight / 2,
        },
        nodeWidth,
        nodeHeight,
        droppedNodes
      );

      console.log("📍 Final position (after collision check):", finalPosition);

      const newNode: Node<PieNodeData> = {
        id: `pie-${Date.now()}`,
        type: "pie-chart",
        position: finalPosition,
        style: {
          width: nodeWidth,
          height: nodeHeight,
        },
        data: {
          graphData: payload.data,
          width: nodeWidth,
          height: nodeHeight,
        },
      };

      console.log("➕ Adding node:", newNode);
      addNode(newNode);
    } catch (error) {
      console.error("❌ Error handling drop:", error);
    }
  }, [reactFlowInstance, addNode, droppedNodes]);

  // Handle node resize - UPDATE BOTH style AND data
  const onNodeResize = useCallback(
    (evt: any, params: any) => {
      const { id, dimensions } = params;
      
      console.log("📏 Node resize:", id, dimensions);
      
      // Find the current node
      const currentNode = droppedNodes.find(n => n.id === id);
      if (!currentNode) return;

      // Update BOTH the style (for React Flow) AND data (for our component)
      updateNode(id, {
        style: {
          width: dimensions.width,
          height: dimensions.height,
        },
        data: {
          ...currentNode.data,
          width: dimensions.width,
          height: dimensions.height,
        },
      });
    },
    [updateNode, droppedNodes]
  );

  console.log("🖼️ Rendering ReactFlow with", droppedNodes.length, "nodes");

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      <ReactFlow
        nodes={droppedNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeResizeStop={onNodeResize}
        nodesConnectable={false}
        nodesDraggable={true}
        panOnDrag={true}  // FIXED: Allow panning with left mouse button
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        fitView
      >
        <Background gap={24} />
      </ReactFlow>

      <AIAssistantCard disablePointer={isDragging} />

      <div className="absolute top-4 left-6 z-10">
        <CanvasCard className="flex items-center gap-3 px-4 py-2">
          <Home />
          Board {boardId?.slice(0, 8)}
          <MoreHorizontal />
        </CanvasCard>
      </div>
    </div>
  );
};

/* ============================
   BOARD CANVAS (Outer wrapper)
============================ */

const BoardCanvas = () => {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner />
    </ReactFlowProvider>
  );
};

/* ============================
   EXPORT
============================ */

export default function NewBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();

  console.log("🏗️ NewBoardPage rendering with boardId:", boardId);

  return (
    <DragDropWrapper boardId={boardId}>
      <div className="h-[calc(100vh-64px)] relative">
        <BoardCanvas />
      </div>
    </DragDropWrapper>
  );
}