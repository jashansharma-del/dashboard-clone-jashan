import { ID, Query, Permission, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CHAT,
  assertAppwriteConfig,
} from "./appwriteConfig";
import type { Message } from "./boardStorage";
import { canEditBoard } from "./shareStorage";

const memoryChat = new Map<string, Message[]>();

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
    chartType:
      doc.chartype === "pie" || doc.chartype === "bar" || doc.chartype === "line"
        ? doc.chartype
        : undefined,
    graphData: safeJsonParse(doc.graphdatajson, undefined),
  };
}

function readMemoryMessages(boardId: string): Message[] {
  return [...(memoryChat.get(boardId) || [])];
}

function writeMemoryMessages(boardId: string, messages: Message[]) {
  memoryChat.set(boardId, [...messages]);
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
    return readMemoryMessages(boardId);
  }
}

export async function createChatMessage(
  boardId: string,
  message: Omit<Message, "id">,
  userId: string
): Promise<Message> {
  const editable = await canEditBoard(boardId, userId).catch(() => true);
  if (!editable) {
    throw new Error("You do not have permission to add messages to this board.");
  }
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
    const messages = readMemoryMessages(boardId);
    const newMessage: Message = { id: makeLocalId(), ...message };
    messages.push(newMessage);
    writeMemoryMessages(boardId, messages);
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
    for (const [boardId, storedMessages] of memoryChat.entries()) {
      const messages = [...storedMessages];
      const index = messages.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        messages[index] = { ...messages[index], ...updates };
        writeMemoryMessages(boardId, messages);
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
    memoryChat.delete(boardId);
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
    const messages = readMemoryMessages(boardId);
    const first = messages.find((msg) => msg.role === "user" && msg.text.trim() !== "");
    return first ? first.text : null;
  }
}
