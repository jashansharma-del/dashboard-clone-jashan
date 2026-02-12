import { ID, Permission, Query, Role } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_COLLECTION_NOTIFICATIONS,
  APPWRITE_DATABASE_ID,
  hasCollectionConfig,
} from "./appwriteConfig";

export type UserNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  metaJson?: string | null;
};

const memoryNotifications = new Map<string, UserNotification[]>();

function mapNotification(doc: any): UserNotification {
  return {
    id: doc.$id,
    userId: doc.userId,
    type: doc.type || "info",
    title: doc.title || "Notification",
    body: doc.body || "",
    link: doc.link || "",
    readAt: doc.readAt || null,
    metaJson: doc.metaJson || null,
  };
}

export async function listNotifications(userId: string): Promise<UserNotification[]> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_NOTIFICATIONS)) {
      return [...(memoryNotifications.get(userId) || [])];
    }
    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_NOTIFICATIONS,
      [Query.equal("userId", [userId]), Query.orderDesc("$createdAt"), Query.limit(100)]
    );
    return result.documents.map(mapNotification);
  } catch {
    return [...(memoryNotifications.get(userId) || [])];
  }
}

export async function createNotification(
  input: Omit<UserNotification, "id" | "readAt">
): Promise<void> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_NOTIFICATIONS)) {
      throw new Error("notifications collection not configured");
    }
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_NOTIFICATIONS,
      ID.unique(),
      {
        ...input,
        readAt: null,
      },
      [
        Permission.read(Role.user(input.userId)),
        Permission.update(Role.user(input.userId)),
        Permission.delete(Role.user(input.userId)),
      ]
    );
  } catch {
    const existing = [...(memoryNotifications.get(input.userId) || [])];
    existing.push({
      id: `notify_${ID.unique()}`,
      ...input,
      readAt: null,
    });
    memoryNotifications.set(input.userId, existing);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_NOTIFICATIONS)) return;
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_NOTIFICATIONS,
      notificationId,
      { readAt: new Date().toISOString() }
    );
  } catch {
    for (const [userId, notifications] of memoryNotifications.entries()) {
      const idx = notifications.findIndex((n) => n.id === notificationId);
      if (idx === -1) continue;
      notifications[idx] = {
        ...notifications[idx],
        readAt: new Date().toISOString(),
      };
      memoryNotifications.set(userId, notifications);
      return;
    }
  }
}
