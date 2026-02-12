import { ID, Query } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CANVAS,
  assertAppwriteConfig,
} from "./appwriteConfig";
import { canEditBoard } from "./shareStorage";

const memoryCanvas = new Map<string, { nodes: any[]; edges: any[] }>();

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function saveCanvas(
  boardId: string,
  nodes: unknown[],
  edges: unknown[],
  userId?: string
): Promise<void> {
  if (userId) {
    const editable = await canEditBoard(boardId, userId).catch(() => true);
    if (!editable) {
      throw new Error("You do not have permission to update this canvas.");
    }
  }
  try {
    assertAppwriteConfig();
    const payload = {
      board_id: boardId,
      nodesjson: JSON.stringify(nodes || []),
      edgesjson: JSON.stringify(edges || []),
    };
    const existing = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CANVAS,
      [Query.equal("board_id", [boardId]), Query.limit(1)]
    );

    if (existing.documents.length > 0) {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CANVAS,
        existing.documents[0].$id,
        payload
      );
      return;
    }

    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CANVAS,
      ID.unique(),
      payload
    );
  } catch (error) {
    memoryCanvas.set(boardId, { nodes: nodes || [], edges: edges || [] });
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to save canvas.");
  }
}

export async function loadCanvas(boardId: string): Promise<{ nodes: any[]; edges: any[] }> {
  try {
    assertAppwriteConfig();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CANVAS,
      [Query.equal("board_id", [boardId]), Query.limit(1)]
    );
    const doc = result.documents[0];
    if (!doc) return { nodes: [], edges: [] };
    return {
      nodes: safeJsonParse<any[]>(doc.nodesjson, []),
      edges: safeJsonParse<any[]>(doc.edgesjson, []),
    };
  } catch {
    return memoryCanvas.get(boardId) || { nodes: [], edges: [] };
  }
}
