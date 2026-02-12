export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "";
export const APPWRITE_COLLECTION_BOARDS = import.meta.env.VITE_APPWRITE_COLLECTION_BOARDS || "";
export const APPWRITE_COLLECTION_CANVAS = import.meta.env.VITE_APPWRITE_COLLECTION_CANVAS || "";
export const APPWRITE_COLLECTION_CHAT = import.meta.env.VITE_APPWRITE_COLLECTION_CHAT || "";
export const APPWRITE_COLLECTION_BOARD_MEMBERS =
  import.meta.env.VITE_APPWRITE_COLLECTION_BOARD_MEMBERS || "";
export const APPWRITE_COLLECTION_BOARD_INVITES =
  import.meta.env.VITE_APPWRITE_COLLECTION_BOARD_INVITES || "";
export const APPWRITE_COLLECTION_BOARD_EVENTS =
  import.meta.env.VITE_APPWRITE_COLLECTION_BOARD_EVENTS || "";
export const APPWRITE_COLLECTION_BOARD_SNAPSHOTS =
  import.meta.env.VITE_APPWRITE_COLLECTION_BOARD_SNAPSHOTS || "";
export const APPWRITE_COLLECTION_COMMENTS =
  import.meta.env.VITE_APPWRITE_COLLECTION_COMMENTS || "";
export const APPWRITE_COLLECTION_NOTIFICATIONS =
  import.meta.env.VITE_APPWRITE_COLLECTION_NOTIFICATIONS || "";
export const APPWRITE_COLLECTION_AI_RUNS =
  import.meta.env.VITE_APPWRITE_COLLECTION_AI_RUNS || "";
export const APPWRITE_COLLECTION_BOARD_PRESENCE =
  import.meta.env.VITE_APPWRITE_COLLECTION_BOARD_PRESENCE || "";

export function assertAppwriteConfig() {
  if (!APPWRITE_DATABASE_ID) {
    throw new Error("Missing VITE_APPWRITE_DATABASE_ID");
  }
  if (!APPWRITE_COLLECTION_BOARDS) {
    throw new Error("Missing VITE_APPWRITE_COLLECTION_BOARDS");
  }
  if (!APPWRITE_COLLECTION_CANVAS) {
    throw new Error("Missing VITE_APPWRITE_COLLECTION_CANVAS");
  }
  if (!APPWRITE_COLLECTION_CHAT) {
    throw new Error("Missing VITE_APPWRITE_COLLECTION_CHAT");
  }
}

export function hasCollectionConfig(collectionId: string) {
  return typeof collectionId === "string" && collectionId.length > 0;
}
