import { ID, Permission, Query, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_COLLECTION_COMMENTS,
  APPWRITE_DATABASE_ID,
  hasCollectionConfig,
} from "./appwriteConfig";

export type BoardComment = {
  id: string;
  boardId: string;
  nodeId?: string | null;
  parentCommentId?: string | null;
  authorId: string;
  body: string;
  mentions: string[];
  resolvedAt?: string | null;
};

const memoryComments = new Map<string, BoardComment[]>();

function mapComment(doc: any): BoardComment {
  return {
    id: doc.$id,
    boardId: doc.boardId,
    nodeId: doc.nodeId || null,
    parentCommentId: doc.parentCommentId || null,
    authorId: doc.authorId,
    body: doc.body || "",
    mentions: Array.isArray(doc.mentions) ? doc.mentions : [],
    resolvedAt: doc.resolvedAt || null,
  };
}

export async function listBoardComments(boardId: string): Promise<BoardComment[]> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_COMMENTS)) {
      return [...(memoryComments.get(boardId) || [])];
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_COMMENTS,
      [Query.equal("boardId", [boardId]), Query.limit(300)]
    );
    return result.documents.map(mapComment);
  } catch {
    return [...(memoryComments.get(boardId) || [])];
  }
}

export async function createBoardComment(input: Omit<BoardComment, "id">): Promise<BoardComment> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_COMMENTS)) {
      throw new Error("comments collection not configured");
    }
    const doc = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_COMMENTS,
      ID.unique(),
      {
        ...input,
        resolvedAt: input.resolvedAt || null,
      },
      [
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );
    return mapComment(doc);
  } catch {
    const existing = [...(memoryComments.get(input.boardId) || [])];
    const comment: BoardComment = { ...input, id: `comment_${ID.unique()}` };
    existing.push(comment);
    memoryComments.set(input.boardId, existing);
    return comment;
  }
}

export async function resolveBoardComment(commentId: string, resolved: boolean): Promise<void> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_COMMENTS)) return;
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_COMMENTS,
      commentId,
      {
        resolvedAt: resolved ? new Date().toISOString() : null,
      }
    );
  } catch {
    for (const [boardId, comments] of memoryComments.entries()) {
      const idx = comments.findIndex((comment) => comment.id === commentId);
      if (idx === -1) continue;
      comments[idx] = {
        ...comments[idx],
        resolvedAt: resolved ? new Date().toISOString() : null,
      };
      memoryComments.set(boardId, comments);
      return;
    }
  }
}
