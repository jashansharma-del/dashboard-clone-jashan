import type { Board, Message, Widget } from "./boardStorage";

export type BoardExportPayload = {
  board: Pick<
    Board,
    "title" | "widgets" | "isPinned" | "archived" | "tags" | "ownerId" | "lastActivityAt"
  >;
  canvas: {
    nodes: unknown[];
    edges: unknown[];
  };
  chat: Message[];
  exportedAt: string;
  schemaVersion: 1;
};

export function buildBoardExportPayload(input: {
  board: Board;
  nodes: unknown[];
  edges: unknown[];
  chat: Message[];
}): BoardExportPayload {
  return {
    board: {
      title: input.board.title,
      widgets: input.board.widgets || ([] as Widget[]),
      isPinned: Boolean(input.board.isPinned),
      archived: Boolean(input.board.archived),
      tags: input.board.tags || [],
      ownerId: input.board.ownerId || input.board.userId,
      lastActivityAt: input.board.lastActivityAt || new Date().toISOString(),
    },
    canvas: {
      nodes: input.nodes || [],
      edges: input.edges || [],
    },
    chat: input.chat || [],
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

export function parseBoardImportPayload(raw: string): BoardExportPayload {
  const parsed = JSON.parse(raw);
  if (parsed?.schemaVersion !== 1) {
    throw new Error("Unsupported board import schema version.");
  }
  if (!parsed.board || typeof parsed.board.title !== "string") {
    throw new Error("Invalid board payload.");
  }
  if (!parsed.canvas || !Array.isArray(parsed.canvas.nodes) || !Array.isArray(parsed.canvas.edges)) {
    throw new Error("Invalid canvas payload.");
  }
  if (!Array.isArray(parsed.chat)) {
    throw new Error("Invalid chat payload.");
  }
  return parsed as BoardExportPayload;
}
