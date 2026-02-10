import { ID, Query, Permission, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_BOARDS,
  APPWRITE_COLLECTION_CANVAS,
  APPWRITE_COLLECTION_CHAT,
  assertAppwriteConfig,
} from "./appwriteConfig";

export type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
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
  title: string;
  widgets: Widget[];
  messages?: Message[];
};

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapBoard(doc: any): Board {
  return {
    id: doc.$id,
    userId: doc.userId,
    title: doc.title || "Untitled Board",
    widgets: safeJsonParse<Widget[]>(doc.widgetsJson, []),
  };
}

export async function createBoard(userId: string): Promise<Board> {
  assertAppwriteConfig();
  const doc = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_BOARDS,
    ID.unique(),
    {
      userId,
      title: "Untitled Board",
      widgetsJson: JSON.stringify([]),
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]
  );

  return mapBoard(doc);
}

export async function getBoards(userId: string): Promise<Board[]> {
  assertAppwriteConfig();
  const result = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_BOARDS,
    [Query.equal("userId", [userId])]
  );

  return result.documents.map(mapBoard);
}

export async function getBoardById(userId: string, id: string): Promise<Board | undefined> {
  assertAppwriteConfig();
  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_BOARDS,
      id
    );
    if (doc.userId !== userId) return undefined;
    return mapBoard(doc);
  } catch {
    return undefined;
  }
}

export async function updateBoard(userId: string, board: Board): Promise<void> {
  assertAppwriteConfig();
  await databases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_BOARDS,
    board.id,
    {
      userId: board.userId || userId,
      title: board.title,
      widgetsJson: JSON.stringify(board.widgets || []),
    }
  );
}

export async function deleteBoard(userId: string, id: string): Promise<void> {
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
