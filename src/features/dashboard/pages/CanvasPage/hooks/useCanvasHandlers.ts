import { useCallback, useState } from "react";
import type { ReactFlowInstance, Node } from "reactflow";
import { findNonOverlappingPosition } from "@/features/dashboard/components/utils";

export const useCanvasHandlers = (
    reactFlowInstance: ReactFlowInstance | null,
    addNode: (node: Node) => void,
    droppedNodes: Node[],
    lockGraph: boolean
) => {
    const [isDragging, setIsDragging] = useState(false);

    const onDragOver = useCallback((e: React.DragEvent) => {
        if (lockGraph) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragging(true);
    }, [lockGraph]);

    const onDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        if (lockGraph || !reactFlowInstance) return;
        e.preventDefault();
        setIsDragging(false);

        try {
            const rawData = e.dataTransfer.getData("application/reactflow");
            if (!rawData) return;

            const payload = JSON.parse(rawData);
            const supportedTypes = ["pie-chart", "bar-chart", "line-chart", "sticky-note"];
            if (!supportedTypes.includes(payload.type)) return;

            const desiredPosition = reactFlowInstance.screenToFlowPosition({
                x: e.clientX,
                y: e.clientY,
            });

            const nodeWidth = payload.type === "sticky-note" ? 250 : 400;
            const nodeHeight = payload.type === "sticky-note" ? 250 : 200;

            const finalPosition = findNonOverlappingPosition(
                {
                    x: desiredPosition.x - nodeWidth / 2,
                    y: desiredPosition.y - nodeHeight / 2,
                },
                nodeWidth,
                nodeHeight,
                droppedNodes
            );

            switch (payload.type) {
                case "pie-chart":
                case "bar-chart":
                case "line-chart":
                    addNode({
                        id: `${payload.type.split("-")[0]}-${Date.now()}`,
                        type: payload.type,
                        position: finalPosition,
                        style: { width: nodeWidth, height: nodeHeight },
                        data: { graphData: payload.data, width: nodeWidth, height: nodeHeight },
                    });
                    break;
                case "sticky-note":
                    addNode({
                        id: `sticky-${Date.now()}`,
                        type: "sticky-note",
                        position: finalPosition,
                        style: { width: nodeWidth, height: nodeHeight },
                        data: { text: "" },
                    });
                    break;
            }
        } catch (error) {
            console.error("❌ Error handling drop:", error);
        }
    }, [reactFlowInstance, addNode, droppedNodes, lockGraph]);

    return {
        isDragging,
        onDragOver,
        onDragLeave,
        onDrop
    };
};
