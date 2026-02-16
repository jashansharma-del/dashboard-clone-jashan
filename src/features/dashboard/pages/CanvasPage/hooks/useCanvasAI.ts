import { useCallback } from "react";
import type { Node } from "reactflow";
import { findNonOverlappingPosition } from "@/features/dashboard/components/utils";

export const useCanvasAI = (
    droppedNodes: Node[],
    addNode: (node: Node) => void,
    clearDroppedNodes: () => void
) => {
    const handleAICommand = useCallback((command: any) => {
        if (command.type === "auto-layout") {
            const nodes = [...droppedNodes];
            if (nodes.length === 0) return;

            if (command.layout === "circular") {
                const radius = Math.max(nodes.length * 50, 300);
                const center = { x: 400, y: 300 };
                const next = nodes.map((node, i) => {
                    const angle = (i / nodes.length) * 2 * Math.PI;
                    return {
                        ...node,
                        position: {
                            x: center.x + radius * Math.cos(angle),
                            y: center.y + radius * Math.sin(angle),
                        },
                    };
                });
                clearDroppedNodes();
                next.forEach((n) => addNode(n));
            } else if (command.layout === "grid") {
                const cols = Math.ceil(Math.sqrt(nodes.length));
                const spacing = 450;
                const next = nodes.map((node, i) => ({
                    ...node,
                    position: {
                        x: (i % cols) * spacing,
                        y: Math.floor(i / cols) * spacing,
                    },
                }));
                clearDroppedNodes();
                next.forEach((n) => addNode(n));
            }
        } else if (command.type === "add-node" && command.nodeType === "summary-node") {
            addNode({
                id: `summary-${Date.now()}`,
                type: "summary-node",
                position: findNonOverlappingPosition({ x: 100, y: 100 }, 300, 200, droppedNodes),
                data: command.data,
                style: { width: 300, height: 200 },
            });
        }
    }, [droppedNodes, addNode, clearDroppedNodes]);

    return {
        handleAICommand
    };
};
