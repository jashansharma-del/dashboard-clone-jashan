import ReactFlow, {
  Background,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import type { Node } from "reactflow";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "reactflow/dist/style.css";
import { useParams } from "react-router-dom";
import { Home, MoreHorizontal, RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../store";

import { useDragDrop } from "../../../../shared/hooks/DragDropContext";
import { CanvasCard, AIAssistantCard, PieChartNode, BarChartNode, LineChartNode } from "../../components";
import { findNonOverlappingPosition } from "../../components/utils";
import type { PieNodeData, BarNodeData, LineNodeData } from "../../types/chartTypes";
import { getFirstUserMessageText } from "../../../../data/chatStorage";
import { heartbeatPresence, listPresence, type PresenceRecord } from "../../../../data/presenceStorage";
import { appendBoardEvent, listSnapshots } from "../../../../data/versionStorage";

/* ============================
   BOARD CANVAS (Inner component with useReactFlow)
============================ */

const BoardCanvasInner = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { droppedNodes, addNode, clearDroppedNodes, onNodesChange } = useDragDrop();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || "");
  
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [presence, setPresence] = useState<PresenceRecord[]>([]);

  useEffect(() => {
    console.log("🔵 BoardCanvasInner - droppedNodes:", droppedNodes);
    console.log("🔵 Number of nodes:", droppedNodes.length);
  }, [droppedNodes]);

  const nodeTypes = useMemo(
    () => {
      const types = { 
        "pie-chart": PieChartNode,
        "bar-chart": BarChartNode,
        "line-chart": LineChartNode
      };
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

      // Check if the payload type is one of our supported chart types
      const supportedTypes = ["pie-chart", "bar-chart", "line-chart"];
      if (!supportedTypes.includes(payload.type)) {
        console.error("❌ Invalid payload type:", payload.type);
        return;
      }

      const desiredPosition = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      console.log("📍 Desired position:", desiredPosition);

      const nodeWidth = 400;
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

      // Create node based on type
      switch (payload.type) {
        case "pie-chart": {
          const pieNode: Node<PieNodeData> = {
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
          addNode(pieNode);
          break;
        }
        case "bar-chart": {
          const barNode: Node<BarNodeData> = {
            id: `bar-${Date.now()}`,
            type: "bar-chart",
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
          addNode(barNode);
          break;
        }
        case "line-chart": {
          const lineNode: Node<LineNodeData> = {
            id: `line-${Date.now()}`,
            type: "line-chart",
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
          addNode(lineNode);
          break;
        }
        default:
          console.error("❌ Unsupported chart type:", payload.type);
          return;
      }
    } catch (error) {
      console.error("❌ Error handling drop:", error);
    }
  }, [reactFlowInstance, addNode, droppedNodes]);

  useEffect(() => {
    if (!boardId) return;
    const interval = window.setInterval(async () => {
      const items = await listPresence(boardId);
      const activeCutoff = Date.now() - 15000;
      setPresence(
        items.filter(
          (item) => new Date(item.lastSeenAt).getTime() >= activeCutoff && item.userId !== userId
        )
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [boardId, userId]);

  const onMouseMove = useCallback(
    async (e: React.MouseEvent) => {
      if (!boardId || !userId) return;
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const x = Math.max(0, Math.round(e.clientX - bounds.left));
      const y = Math.max(0, Math.round(e.clientY - bounds.top));
      await heartbeatPresence({ boardId, userId, cursorX: x, cursorY: y });
    },
    [boardId, userId]
  );


  console.log("🖼️ Rendering ReactFlow with", droppedNodes.length, "nodes");




  const [firstUserMessage, setFirstUserMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) {
      setFirstUserMessage(null);
      return;
    }

    let cancelled = false;
    const loadFirstMessage = async () => {
      const text = await getFirstUserMessageText(boardId);
      if (!cancelled) {
        setFirstUserMessage(text);
      }
    };

    loadFirstMessage();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

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

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 bg-background"
      onDragLeave={onDragLeave}
      onMouseMove={onMouseMove}
    >
      <ReactFlow
        nodes={droppedNodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDoubleClick={(_, node) => {
          console.log("Node double clicked:", node.id);
        }}

        nodesConnectable={false}
        nodesDraggable={true}
        panOnDrag={true}  
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        fitView
        fitViewOptions={{ padding: 0.1, includeHiddenNodes: false, duration: 300 }}
      >
        <Background gap={19} size={3} color={document.documentElement.classList.contains('dark') ? '#000000' : '#e5e7eb'} />
      </ReactFlow>

      <AIAssistantCard disablePointer={isDragging} />

      <div className="absolute top-4 left-6 z-1">
        <CanvasCard className="flex items-center gap-3 px-4 py-2 text-gray-900 dark:text-white">
          <Home />
          <span className="text-sm truncate">
            {firstUserMessage ?? "New conversation"}
          </span>
          <button type="button" onClick={handleRestoreLatestSnapshot} title="Restore latest snapshot">
            <RotateCcw className="w-4 h-4" />
          </button>
          <MoreHorizontal />
        </CanvasCard>
      </div>

      {presence.map((entry) => (
        <div
          key={entry.id}
          className="absolute pointer-events-none z-10"
          style={{ left: entry.cursorX, top: entry.cursorY }}
        >
          <div className="w-2 h-2 rounded-full bg-blue-600" />
          <div className="text-[10px] bg-white/90 dark:bg-gray-900/90 border rounded px-1 mt-1">
            {entry.userId.slice(0, 6)}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================
   BOARD CANVAS (Outer wrapper)
============================ */

export const BoardCanvas = () => {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner />
    </ReactFlowProvider>
  );
};
