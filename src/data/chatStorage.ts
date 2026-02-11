import { ID, Query, Permission, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CHAT,
  assertAppwriteConfig,
} from "./appwriteConfig";
import type { Message } from "./boardStorage";

const LOCAL_CHAT_PREFIX = "chat-";

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

function readLocalMessages(boardId: string): Message[] {
  const data = localStorage.getItem(`${LOCAL_CHAT_PREFIX}${boardId}`);
  return data ? safeJsonParse<Message[]>(data, []) : [];
}

function writeLocalMessages(boardId: string, messages: Message[]) {
  localStorage.setItem(`${LOCAL_CHAT_PREFIX}${boardId}`, JSON.stringify(messages));
}

function makeLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function listChatMessages(boardId: string): Promise<Message[]> {
  try {
    assertAppwriteConfig();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CHAT,
      [Query.equal("board_id", [boardId]), Query.orderAsc("$createdAt")]
    );
    return result.documents.map(mapMessage);
  } catch {
    return readLocalMessages(boardId);
  }
}

export async function createChatMessage(
  boardId: string,
  message: Omit<Message, "id">,
  userId: string
): Promise<Message> {
  try {
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
  } catch {
    const messages = readLocalMessages(boardId);
    const newMessage: Message = { id: makeLocalId(), ...message };
    messages.push(newMessage);
    writeLocalMessages(boardId, messages);
    return newMessage;
  }
}

export async function updateChatMessage(
  messageId: string,
  updates: Partial<Message> & { chartType?: "pie" | "bar" | "line" }
): Promise<void> {
  try {
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
  } catch {
    const prefix = `${LOCAL_CHAT_PREFIX}`;
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix));
    for (const key of keys) {
      const boardId = key.slice(prefix.length);
      const messages = readLocalMessages(boardId);
      const index = messages.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        messages[index] = { ...messages[index], ...updates };
        writeLocalMessages(boardId, messages);
        break;
      }
    }
  }
}

export async function deleteChatMessages(boardId: string): Promise<void> {
  try {
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
  } catch {
    localStorage.removeItem(`${LOCAL_CHAT_PREFIX}${boardId}`);
  }
}

export async function getFirstUserMessageText(boardId: string): Promise<string | null> {
  try {
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
  } catch {
    const messages = readLocalMessages(boardId);
    const first = messages.find((msg) => msg.role === "user" && msg.text.trim() !== "");
    return first ? first.text : null;
  }
}
