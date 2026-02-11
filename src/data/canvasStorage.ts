import { ID, Permission, Role, Query } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CANVAS,
  assertAppwriteConfig,
} from "./appwriteConfig";

const LOCAL_CANVAS_PREFIX = "canvas-";

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
  try {
    assertAppwriteConfig();
    const payload = {
      board_id: boardId,
      nodesjson: JSON.stringify(nodes || []),
      edgesjson: JSON.stringify(edges || []),
    };
    const permissions = userId
      ? [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      : undefined;

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
      payload,
      permissions
    );
  } catch {
    localStorage.setItem(
      `${LOCAL_CANVAS_PREFIX}${boardId}`,
      JSON.stringify({ nodes: nodes || [], edges: edges || [] })
    );
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
    const local = localStorage.getItem(`${LOCAL_CANVAS_PREFIX}${boardId}`);
    if (!local) return { nodes: [], edges: [] };
    return safeJsonParse(local, { nodes: [], edges: [] });
  }
}
