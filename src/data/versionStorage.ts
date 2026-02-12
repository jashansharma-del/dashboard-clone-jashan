import { ID, Permission, Query, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_COLLECTION_BOARD_EVENTS,
  APPWRITE_COLLECTION_BOARD_SNAPSHOTS,
  APPWRITE_DATABASE_ID,
  hasCollectionConfig,
} from "./appwriteConfig";
import type { BoardEvent, BoardEventType } from "./collabTypes";

export type BoardSnapshot = {
  id: string;
  boardId: string;
  version: number;
  sourceEventId?: string | null;
  nodesJson: string;
  edgesJson: string;
  widgetsJson: string;
  createdBy: string;
};

const memoryEvents = new Map<string, BoardEvent[]>();
const memorySnapshots = new Map<string, BoardSnapshot[]>();

function mapEvent(doc: any): BoardEvent {
  return {
    id: doc.$id,
    boardId: doc.boardId,
    actorId: doc.actorId,
    eventType: doc.eventType,
    payload: typeof doc.payloadJson === "string" ? JSON.parse(doc.payloadJson) : {},
    createdAt: doc.$createdAt,
  };
}

function mapSnapshot(doc: any): BoardSnapshot {
  return {
    id: doc.$id,
    boardId: doc.boardId,
    version: Number(doc.version || 1),
    sourceEventId: doc.sourceEventId || null,
    nodesJson: doc.nodesJson || "[]",
    edgesJson: doc.edgesJson || "[]",
    widgetsJson: doc.widgetsJson || "[]",
    createdBy: doc.createdBy || "",
  };
}

export async function appendBoardEvent(input: {
  boardId: string;
  actorId: string;
  eventType: BoardEventType;
  payload: Record<string, unknown>;
}): Promise<string> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_EVENTS)) {
      throw new Error("events collection not configured");
    }
    const doc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_EVENTS,
      ID.unique(),
      {
        boardId: input.boardId,
        actorId: input.actorId,
        eventType: input.eventType,
        payloadJson: JSON.stringify(input.payload || {}),
      },
      [Permission.read(Role.users())]
    );
    return doc.$id;
  } catch {
    const eventId = `event_${ID.unique()}`;
    const existing = [...(memoryEvents.get(input.boardId) || [])];
    existing.push({
      id: eventId,
      boardId: input.boardId,
      actorId: input.actorId,
      eventType: input.eventType,
      payload: input.payload,
      createdAt: new Date().toISOString(),
    });
    memoryEvents.set(input.boardId, existing);
    return eventId;
  }
}

export async function listBoardEvents(boardId: string): Promise<BoardEvent[]> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_EVENTS)) {
      return [...(memoryEvents.get(boardId) || [])];
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_EVENTS,
      [Query.equal("boardId", [boardId]), Query.orderDesc("$createdAt"), Query.limit(200)]
    );
    return result.documents.map(mapEvent);
  } catch {
    return [...(memoryEvents.get(boardId) || [])];
  }
}

export async function createSnapshot(input: Omit<BoardSnapshot, "id">): Promise<BoardSnapshot> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_SNAPSHOTS)) {
      throw new Error("snapshots collection not configured");
    }
    const doc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_SNAPSHOTS,
      ID.unique(),
      input,
      [Permission.read(Role.users())]
    );
    return mapSnapshot(doc);
  } catch {
    const snapshot: BoardSnapshot = {
      id: `snapshot_${ID.unique()}`,
      ...input,
    };
    const existing = [...(memorySnapshots.get(input.boardId) || [])];
    existing.push(snapshot);
    memorySnapshots.set(input.boardId, existing);
    return snapshot;
  }
}

export async function listSnapshots(boardId: string): Promise<BoardSnapshot[]> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_BOARD_SNAPSHOTS)) {
      return [...(memorySnapshots.get(boardId) || [])];
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARD_SNAPSHOTS,
      [Query.equal("boardId", [boardId]), Query.orderDesc("version"), Query.limit(200)]
    );
    return result.documents.map(mapSnapshot);
  } catch {
    return [...(memorySnapshots.get(boardId) || [])];
  }
}
