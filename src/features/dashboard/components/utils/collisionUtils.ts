import type { Node } from "reactflow";

type PieNodeData = {
  graphData: { label: string; value: number }[];
  width: number;
  height: number;
};

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

export function findNonOverlappingPosition(
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