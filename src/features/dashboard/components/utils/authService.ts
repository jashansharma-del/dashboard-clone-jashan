import { Client, Account, Databases, ID } from "appwrite";

// Initialize Appwrite Client
export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

// Initialize Account service
export const account = new Account(client);
export const databases = new Databases(client);

// Utility functions for authentication
export const authService = {
  // Get current user
  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  },

  // Login
  async login(email: string, password: string) {
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    return user;
  },
  // Register
  async register(email: string, password: string, name: string) {
    await account.create(ID.unique(), email, password, name);
    await account.createEmailPasswordSession(email, password);

    const user = await account.get();
    return user;
  },

  // Logout
  async logout() {
    await account.deleteSession("current");
  },

  // Verify session
  async verifySession() {
    try {
      const user = await account.get();
      return { isValid: true, user };
    } catch {
      return { isValid: false, user: null };
    }
  },

  // Theme preference helpers (Appwrite prefs)
  async getThemePref(): Promise<"dark" | "light" | null> {
    try {
      const prefs = await account.getPrefs();
      const theme = prefs?.theme;
      return theme === "dark" || theme === "light" ? theme : null;
    } catch {
      return null;
    }
  },

  async setThemePref(theme: "dark" | "light") {
    try {
      const prefs = await account.getPrefs();
      await account.updatePrefs({ ...prefs, theme });
    } catch (error) {
      console.error("Failed to update theme preference:", error);
    }
  },
};

export default authService;

