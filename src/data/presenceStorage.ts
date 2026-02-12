import { ID, Query } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_COLLECTION_BOARD_PRESENCE,
  APPWRITE_DATABASE_ID,
  hasCollectionConfig,
} from "./appwriteConfig";

export type PresenceRecord = {
  id: string;
  boardId: string;
  userId: string;
  cursorX: number;
  cursorY: number;
  activeNodeId?: string | null;
  lastSeenAt: string;
};

const memoryPresence = new Map<string, PresenceRecord[]>();

function mapPresence(doc: any): PresenceRecord {
  return {
    id: doc.$id,
    boardId: doc.boardId,
    userId: doc.userId,
    cursorX: Number(doc.cursorX || 0),
    cursorY: Number(doc.cursorY || 0),
    activeNodeId: doc.activeNodeId || null,
    lastSeenAt: doc.lastSeenAt || new Date().toISOString(),
  };
}

export async function heartbeatPresence(input: {
  boardId: string;
  userId: string;
  cursorX: number;
  cursorY: number;
  activeNodeId?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_PRESENCE)) {
      throw new Error("presence collection not configured");
    }

    const existing = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_PRESENCE,
      [
        Query.equal("boardId", [input.boardId]),
        Query.equal("userId", [input.userId]),
        Query.limit(1),
      ]
    );
    if (existing.documents[0]) {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_BOARD_PRESENCE,
        existing.documents[0].$id,
        {
          cursorX: input.cursorX,
          cursorY: input.cursorY,
          activeNodeId: input.activeNodeId || null,
          lastSeenAt: now,
        }
      );
      return;
    }

    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_PRESENCE,
      ID.unique(),
      {
        boardId: input.boardId,
        userId: input.userId,
        cursorX: input.cursorX,
        cursorY: input.cursorY,
        activeNodeId: input.activeNodeId || null,
        lastSeenAt: now,
      }
    );
  } catch {
    const existing = [...(memoryPresence.get(input.boardId) || [])];
    const idx = existing.findIndex((record) => record.userId === input.userId);
    const next: PresenceRecord = {
      id: idx === -1 ? `presence_${Date.now()}` : existing[idx].id,
      boardId: input.boardId,
      userId: input.userId,
      cursorX: input.cursorX,
      cursorY: input.cursorY,
      activeNodeId: input.activeNodeId || null,
      lastSeenAt: now,
    };
    if (idx === -1) existing.push(next);
    else existing[idx] = next;
    memoryPresence.set(input.boardId, existing);
  }
}

export async function listPresence(boardId: string): Promise<PresenceRecord[]> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_PRESENCE)) {
      return [...(memoryPresence.get(boardId) || [])];
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_PRESENCE,
      [Query.equal("boardId", [boardId]), Query.limit(100)]
    );
    return result.documents.map(mapPresence);
  } catch {
    return [...(memoryPresence.get(boardId) || [])];
  }
}
