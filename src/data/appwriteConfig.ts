export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "";
export const APPWRITE_COLLECTION_BOARDS = import.meta.env.VITE_APPWRITE_COLLECTION_BOARDS || "";
export const APPWRITE_COLLECTION_CANVAS = import.meta.env.VITE_APPWRITE_COLLECTION_CANVAS || "";
export const APPWRITE_COLLECTION_CHAT = import.meta.env.VITE_APPWRITE_COLLECTION_CHAT || "";

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
