import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import ReactFlow, { Background, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import type { RootState } from "@/store";
import { usePresence } from "./hooks/usePresence";
import { useCanvas } from "./hooks/useCanvas";
import { CanvasHeader } from "./components/CanvasHeader";
import { PresenceOverlay } from "./components/PresenceOverlay";
import { AIAssistantCard } from "@/features/dashboard/components";
import { useEffect, useState } from "react";
import { getFirstUserMessageText } from "@/data/chatStorage";
import DragDropWrapper from "@/shared/hooks/DragDropWrapper";

const CanvasPageInner = () => {
    const { boardId } = useParams<{ boardId: string }>();
    const userId = useSelector((state: RootState) => state.auth.user?.$id || "");

    // Hooks
    const { presence, onMouseMove, presenceWrapperRef } = usePresence(boardId, userId);
    const {
        droppedNodes, onNodesChange, onDragOver, onDragLeave, onDrop,
        handleAICommand, handleAddStickyNote, handleRestoreLatestSnapshot,
        nodeTypes, isDragging
    } = useCanvas(boardId, userId);

    // Dynamic Title
    const [title, setTitle] = useState<string | null>(null);
    useEffect(() => {
        if (!boardId) return;
        getFirstUserMessageText(boardId).then(setTitle);
    }, [boardId]);

    return (
        <div
            ref={presenceWrapperRef}
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
                nodesConnectable={false}
                fitView
                fitViewOptions={{ padding: 0.1, duration: 300 }}
            >
                <Background gap={19} size={3} color={document.documentElement.classList.contains('dark') ? '#000000' : '#e5e7eb'} />
            </ReactFlow>

            <AIAssistantCard disablePointer={isDragging} onExecuteCommand={handleAICommand} />

            <CanvasHeader
                title={title}
                onAddStickyNote={handleAddStickyNote}
                onRestoreSnapshot={handleRestoreLatestSnapshot}
            />

            <PresenceOverlay presence={presence} />
        </div>
    );
};

export default function CanvasPage() {
    const { boardId } = useParams<{ boardId: string }>();
    return (
        <DragDropWrapper boardId={boardId}>
            <ReactFlowProvider>
                <div className="h-[calc(100vh-4rem)] relative bg-background text-foreground min-h-[500px]">
                    <CanvasPageInner />
                </div>
            </ReactFlowProvider>
        </DragDropWrapper>
    );
}
