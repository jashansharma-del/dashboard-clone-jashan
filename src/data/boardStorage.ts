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
const LOCAL_STORAGE_KEY_PREFIX = "boards:";

// When Appwrite is not configured, we treat all boards as belonging
// to a single local workspace, regardless of the current user id.
const useGlobalLocalStore = !APPWRITE_DATABASE_ID;

function effectiveUserId(userId: string): string {
  if (useGlobalLocalStore) return "local";
  return userId || "anonymous";
}

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

function loadBoardsFromStorage(userId: string): Board[] {
  if (typeof window === "undefined") return [];
  const key = `${LOCAL_STORAGE_KEY_PREFIX}${effectiveUserId(userId)}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Board[];
  } catch {
    return [];
  }
}

function persistBoardsToStorage(userId: string, boards: Board[]): void {
  if (typeof window === "undefined") return;
  const key = `${LOCAL_STORAGE_KEY_PREFIX}${effectiveUserId(userId)}`;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(boards)
    );
  } catch {
    // Ignore storage errors to keep UX responsive.
  }
}

function readMemoryBoards(userId: string): Board[] {
  const id = effectiveUserId(userId);
  const existing = memoryBoards.get(id);
  if (existing) {
    return [...existing];
  }
  const fromStorage = loadBoardsFromStorage(id);
  if (fromStorage.length > 0) {
    memoryBoards.set(id, [...fromStorage]);
  }
  return [...fromStorage];
}

function writeMemoryBoards(userId: string, boards: Board[]) {
  const id = effectiveUserId(userId);
  memoryBoards.set(id, [...boards]);
  persistBoardsToStorage(id, boards);
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
  const localBoards = readMemoryBoards(userId);
  let cloudBoards: Board[] = [];

  try {
    assertAppwriteConfig();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      [Query.equal("userId", [userId])]
    );
    cloudBoards = result.documents.map(mapBoard);
  } catch (error) {
    console.warn("Failed to fetch cloud boards, falling back to local only", error);
  }

  // Merge and deduplicate by ID
  const allBoards = [...cloudBoards];
  for (const local of localBoards) {
    if (!allBoards.some((b) => b.id === local.id)) {
      allBoards.push(local);
    }
  }
  return allBoards;
}

export async function getReadableBoards(userId: string): Promise<Board[]> {
  const localBoards = readMemoryBoards(userId);
  let cloudBoards: Board[] = [];

  try {
    assertAppwriteConfig();
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      [Query.limit(200)]
    );
    // Readability is enforced by Appwrite ACLs; this list includes owned and shared boards.
    cloudBoards = result.documents
      .map(mapBoard)
      .filter((board) => Boolean(board.ownerId || board.userId || userId));
  } catch (error) {
    console.warn("Failed to fetch cloud boards (readable), using local", error);
  }

  // Merge and deduplicate
  const allBoards = [...cloudBoards];
  for (const local of localBoards) {
    if (!allBoards.some((b) => b.id === local.id)) {
      allBoards.push(local);
    }
  }
  return allBoards;
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
  } catch (error) {
    // If not found in cloud or error, check local
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
