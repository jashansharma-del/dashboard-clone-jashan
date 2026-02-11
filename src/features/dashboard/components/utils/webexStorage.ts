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

export const storeWebexPrefs = async (prefs: WebexPrefs) => {
  try {
    await account.get();
  } catch {
    try {
      await account.createAnonymousSession();
    } catch (error) {
      throw new Error(
        `Failed to create Appwrite session for Webex token storage: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  try {
    await account.updatePrefs({ webex: prefs });
    if (prefs.name) {
      await account.updateName(prefs.name);
    }
  } catch (error) {
    throw new Error(
      `Failed to store Webex token in Appwrite prefs: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const getWebexStoredUser = async (): Promise<WebexStoredUser | null> => {
  try {
    const appwriteUser = await account.get();
    const prefs = await account.getPrefs();
    const webex = (prefs as Record<string, any>)?.webex;
    if (!webex?.userId) return null;
    return {
      $id: String(appwriteUser.$id),
      email: String(appwriteUser.email || webex.email || ""),
      name: String(appwriteUser.name || webex.name || "Webex User"),
      webexUserId: String(webex.userId),
    };
  } catch {
    return null;
  }
};

export const getWebexAccessToken = async (): Promise<string | null> => {
  try {
    const prefs = await account.getPrefs();
    const webex = (prefs as Record<string, any>)?.webex;
    return typeof webex?.accessToken === "string" ? webex.accessToken : null;
  } catch {
    return null;
  }
};
