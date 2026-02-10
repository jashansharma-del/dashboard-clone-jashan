import { account } from "../auth/appwriteClient";

type WebexPrefs = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  email?: string;
  name?: string;
};

export const storeWebexPrefs = async (prefs: WebexPrefs) => {
  try {
    await account.get();
  } catch {
    try {
      await account.createAnonymousSession();
    } catch (error) {
      console.warn("Failed to create Appwrite anonymous session:", error);
      return;
    }
  }

  try {
    await account.updatePrefs({ webex: prefs });
  } catch (error) {
    console.warn("Failed to store Webex prefs in Appwrite:", error);
  }
};
