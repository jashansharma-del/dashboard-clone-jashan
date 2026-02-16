import { useMemo } from "react";
import { useReactFlow } from "reactflow";
import { useDragDrop } from "@/shared/hooks/DragDropContext";
import {
    PieChartNode,
    BarChartNode,
    LineChartNode,
    StickyNoteNode,
    SummaryNode
} from "@/features/dashboard/components";
import { useCanvasOperations } from "./useCanvasOperations";
import { useCanvasHandlers } from "./useCanvasHandlers";
import { useCanvasAI } from "./useCanvasAI";

export const useCanvas = (boardId: string | undefined, userId: string, lockGraph: boolean = false) => {
    const { droppedNodes, addNode, clearDroppedNodes, onNodesChange } = useDragDrop();
    const reactFlowInstance = useReactFlow();

    // Node Types Definition
    const nodeTypes = useMemo(() => ({
        "pie-chart": PieChartNode,
        "bar-chart": BarChartNode,
        "line-chart": LineChartNode,
        "sticky-note": StickyNoteNode,
        "summary-node": SummaryNode
    }), []);

    // Granular hooks
    const { handleAddStickyNote, handleRestoreLatestSnapshot } = useCanvasOperations(
        boardId, userId, addNode, clearDroppedNodes
    );

    const { isDragging, onDragOver, onDragLeave, onDrop } = useCanvasHandlers(
        reactFlowInstance, addNode, droppedNodes, lockGraph
    );

    const { handleAICommand } = useCanvasAI(
        droppedNodes, addNode, clearDroppedNodes
    );

    return {
        droppedNodes,
        onNodesChange,
        onDragOver,
        onDragLeave,
        onDrop,
        handleAICommand,
        handleAddStickyNote,
        handleRestoreLatestSnapshot,
        nodeTypes,
        isDragging
    };
};
