import { ID, Query, Permission, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CHAT,
  assertAppwriteConfig,
} from "./appwriteConfig";
import type { Message } from "./boardStorage";

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapMessage(doc: any): Message {
  return {
    id: doc.$id,
    text: doc.text,
    role: doc.role,
    graphData: safeJsonParse(doc.graphdatajson, undefined),
  };
}

export async function listChatMessages(boardId: string): Promise<Message[]> {
  assertAppwriteConfig();
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_CHAT,
    [Query.equal("board_id", [boardId]), Query.orderAsc("$createdAt")]
  );
  return result.documents.map(mapMessage);
}

export async function createChatMessage(
  boardId: string,
  message: Omit<Message, "id">,
  userId: string
): Promise<Message> {
  assertAppwriteConfig();
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_CHAT,
    ID.unique(),
    {
      board_id: boardId,
      role: message.role,
      text: message.text,
      graphdatajson: message.graphData ? JSON.stringify(message.graphData) : null,
      chartype: (message as any).chartType || null,
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]
  );
  return mapMessage(doc);
}

export async function updateChatMessage(
  messageId: string,
  updates: Partial<Message> & { chartType?: "pie" | "bar" | "line" }
): Promise<void> {
  assertAppwriteConfig();
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_CHAT,
    messageId,
    {
      text: updates.text,
      role: updates.role,
      graphdatajson: updates.graphData ? JSON.stringify(updates.graphData) : null,
      chartype: updates.chartType || null,
    }
  );
}

export async function deleteChatMessages(boardId: string): Promise<void> {
  assertAppwriteConfig();
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_CHAT,
    [Query.equal("board_id", [boardId])]
  );
  await Promise.all(
    result.documents.map((doc) =>
      databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CHAT,
        doc.$id
      )
    )
  );
}

export async function getFirstUserMessageText(boardId: string): Promise<string | null> {
  assertAppwriteConfig();
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_CHAT,
    [
      Query.equal("board_id", [boardId]),
      Query.equal("role", ["user"]),
      Query.orderAsc("$createdAt"),
      Query.limit(1),
    ]
  );
  const doc = result.documents[0];
  return doc ? doc.text || null : null;
}
