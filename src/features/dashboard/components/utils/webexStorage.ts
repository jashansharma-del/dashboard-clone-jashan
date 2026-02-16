import { account } from "../auth/appwriteClient";

type WebexPrefs = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  email?: string;
  name?: string;
};

export type WebexStoredUser = {
  $id: string;
  email: string;
  name: string;
  webexUserId?: string;
};

const WEBEX_LOCAL_STORAGE_KEY = "webex_prefs";

export const storeWebexPrefs = async (prefs: WebexPrefs) => {
  let sessionCreated = false;
  try {
    await account.get();
    sessionCreated = true;
  } catch {
    try {
      await account.createAnonymousSession();
      sessionCreated = true;
    } catch (error) {
    }
  }

  // Always save to local storage as fallback/offline cache
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WEBEX_LOCAL_STORAGE_KEY, JSON.stringify(prefs));
  }

  if (sessionCreated) {
    try {
      await account.updatePrefs({ webex: prefs });
      if (prefs.name) {
        await account.updateName(prefs.name);
      }
    } catch (error) {
    }
  }
};

export const getWebexStoredUser = async (): Promise<WebexStoredUser | null> => {
  // Try Appwrite first
  try {
    const appwriteUser = await account.get();
    const prefs = await account.getPrefs();
    const webex = (prefs as Record<string, any>)?.webex;

    // If Appwrite has sync'd data, use it
    if (webex?.userId) {
      return {
        $id: String(appwriteUser.$id),
        email: String(appwriteUser.email || webex.email || ""),
        name: String(appwriteUser.name || webex.name || "Webex User"),
        webexUserId: String(webex.userId),
      };
    }
  } catch {
    // Ignore error, fall through to local
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(WEBEX_LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const prefs = JSON.parse(raw) as WebexPrefs;
        if (prefs.userId) {
          return {
            $id: `local_${prefs.userId}`, // Synthetic ID for local-only users
            email: prefs.email || "",
            name: prefs.name || "Webex User",
            webexUserId: prefs.userId,
          };
        }
      } catch {
        // Corrupt local data
      }
    }
  }

  return null;
};

export const getWebexAccessToken = async (): Promise<string | null> => {
  // Try Appwrite first
  try {
    const prefs = await account.getPrefs();
    const webex = (prefs as Record<string, any>)?.webex;
    if (typeof webex?.accessToken === "string") {
      return webex.accessToken;
    }
  } catch {
    // Fall through
  }

  // Fallback to local
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(WEBEX_LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const prefs = JSON.parse(raw) as WebexPrefs;
        return prefs.accessToken || null;
      } catch {
        return null;
      }
    }
  }
  return null;
};
