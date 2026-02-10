import { Client, Account, ID } from "appwrite";
import { clearWebexSession } from "../auth/webexAuth";

// Initialize Appwrite Client
export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

// Initialize Account service
export const account = new Account(client);

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

    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: user.$id,
        email: user.email,
        name: user.name,
      })
    );

    return user;
  },

   // Register
  async register(email: string, password: string, name: string) {
  await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);

  const user = await account.get();

  localStorage.setItem(
    "auth_user",
    JSON.stringify({
      id: user.$id,
      email: user.email,
      name: user.name, // ✅ REQUIRED
    })
  );

  return user;
},

  // Logout
  async logout() {
    try {
      await account.deleteSession("current");
    } catch (error) {
      console.warn("Failed to delete Appwrite session:", error);
    }
    localStorage.removeItem("auth_user");
    clearWebexSession();
  },

  // Verify session
  async verifySession() {
    try {
      const user = await account.get();
      return { isValid: true, user };
    } catch {
      return { isValid: false, user: null };
    }
  }
};

export default authService;
