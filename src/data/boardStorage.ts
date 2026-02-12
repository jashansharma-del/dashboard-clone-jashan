import { ID, Query, Permission, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_BOARDS,
  APPWRITE_COLLECTION_CANVAS,
  APPWRITE_COLLECTION_CHAT,
  assertAppwriteConfig,
} from "./appwriteConfig";
import { canEditBoard, getBoardRole } from "./shareStorage";

const memoryBoards = new Map<string, Board[]>();

export type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
  chartType?: "pie" | "bar" | "line";
  graphData?: {
    label: string;
    value: number;
  }[];
};

export type ChartData = {
  label: string;
  value: number;
};

export type Widget = {
  id: string;
  type: string;
  position: { x: number; y: number };
  props?: {
    label?: string;
    data?: ChartData[];
    [key: string]: unknown;
  };
};

export type Board = {
  id: string;
  userId: string;
  ownerId?: string;
  title: string;
  widgets: Widget[];
  messages?: Message[];
  isPinned?: boolean;
  archived?: boolean;
  tags?: string[];
  lastActivityAt?: string;
};

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readMemoryBoards(userId: string): Board[] {
  return [...(memoryBoards.get(userId) || [])];
}

function writeMemoryBoards(userId: string, boards: Board[]) {
  memoryBoards.set(userId, [...boards]);
}

function makeLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function mapBoard(doc: any): Board {
  return {
    id: doc.$id,
    userId: doc.userId,
    ownerId: doc.ownerId || doc.userId,
    title: doc.title || "Untitled Board",
    widgets: safeJsonParse<Widget[]>(doc.widgetsJson, []),
    isPinned: typeof doc.isPinned === "boolean" ? doc.isPinned : false,
    archived: Boolean(doc.archived),
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    lastActivityAt: doc.lastActivityAt || doc.$updatedAt || doc.$createdAt,
  };
}

export async function createBoard(userId: string): Promise<Board> {
  try {
    assertAppwriteConfig();
    const doc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      ID.unique(),
      {
        userId,
        ownerId: userId,
        title: "Untitled Board",
        widgetsJson: JSON.stringify([]),
        isPinned: false,
        archived: false,
        tags: [],
        lastActivityAt: new Date().toISOString(),
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );
    return mapBoard(doc);
  } catch {
    const boards = readMemoryBoards(userId);
    const newBoard: Board = {
      id: makeLocalId(),
      userId,
      title: "Untitled Board",
      widgets: [],
      messages: [],
      isPinned: false,
      archived: false,
      tags: [],
      ownerId: userId,
      lastActivityAt: new Date().toISOString(),
    };
    boards.push(newBoard);
    writeMemoryBoards(userId, boards);
    return newBoard;
  }
}

export async function getBoards(userId: string): Promise<Board[]> {
  try {
    assertAppwriteConfig();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      [Query.equal("userId", [userId])]
    );
    return result.documents.map(mapBoard);
  } catch {
    return readMemoryBoards(userId);
  }
}

export async function getReadableBoards(userId: string): Promise<Board[]> {
  try {
    assertAppwriteConfig();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      [Query.limit(200)]
    );
    // Readability is enforced by Appwrite ACLs; this list includes owned and shared boards.
    return result.documents
      .map(mapBoard)
      .filter((board) => Boolean(board.ownerId || board.userId || userId));
  } catch {
    return readMemoryBoards(userId);
  }
}

export async function getBoardById(userId: string, id: string): Promise<Board | undefined> {
  try {
    assertAppwriteConfig();
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      id
    );
    return mapBoard(doc);
  } catch {
    const boards = readMemoryBoards(userId);
    return boards.find((board) => board.id === id);
  }
}

export async function updateBoard(userId: string, board: Board): Promise<void> {
  const editable = await canEditBoard(board.id, userId).catch(() => true);
  if (!editable) {
    throw new Error("You do not have permission to update this board.");
  }
  try {
    assertAppwriteConfig();
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      board.id,
      {
        userId: board.userId || userId,
        ownerId: board.ownerId || board.userId || userId,
        title: board.title,
        widgetsJson: JSON.stringify(board.widgets || []),
        isPinned: Boolean(board.isPinned),
        archived: Boolean(board.archived),
        tags: board.tags || [],
        lastActivityAt: new Date().toISOString(),
      }
    );
  } catch {
    const boards = readMemoryBoards(userId);
    const index = boards.findIndex((b) => b.id === board.id);
    if (index !== -1) {
      boards[index] = board;
      writeMemoryBoards(userId, boards);
    }
  }
}

export async function deleteBoard(userId: string, id: string): Promise<void> {
  const role = await getBoardRole(id, userId).catch(() => "owner");
  if (role !== "owner") {
    throw new Error("Only board owners can delete boards.");
  }
  try {
    assertAppwriteConfig();

    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      id
    );

    // Delete canvas doc if present
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CANVAS,
        id
      );
    } catch {
      // Ignore if not found
    }

    // Delete associated chat messages
    try {
      const chats = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CHAT,
        [Query.equal("boardId", [id])]
      );
      await Promise.all(
        chats.documents.map((doc) =>
          databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_CHAT,
            doc.$id
          )
        )
      );
    } catch {
      // Ignore errors for chat cleanup
    }
  } catch {
    const boards = readMemoryBoards(userId).filter((board) => board.id !== id);
    writeMemoryBoards(userId, boards);
  }
}

export async function addChartWidget(
  userId: string,
  boardId: string,
  label: string,
  data: ChartData[]
): Promise<void> {
  const board = await getBoardById(userId, boardId);
  if (!board) return;

  const newWidget: Widget = {
    id: ID.unique(),
    type: "chart",
    position: { x: 0, y: board.widgets.length * 100 },
    props: {
      label,
      data,
    },
  };

  board.widgets.push(newWidget);
  await updateBoard(userId, board);
}
