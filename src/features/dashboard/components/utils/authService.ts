import { Client, Account } from "appwrite";

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
      return null;
    }
  },

  // Login
  async login(email: string, password: string) {
    return await account.createEmailPasswordSession(email, password);
  },

  // Register
  async register(email: string, password: string, name: string) {
    const { ID } = await import("appwrite");
    return await account.create(ID.unique(), email, password, name);
  },

  // Logout
  async logout() {
    return await account.deleteSession("current");
  },

  // Logout from all devices
  async logoutAll() {
    return await account.deleteSessions();
  },

  // Get all sessions
  async getSessions() {
    return await account.listSessions();
  },

  // Update name
  async updateName(name: string) {
    return await account.updateName(name);
  },

  // Update password
  async updatePassword(newPassword: string, oldPassword: string) {
    return await account.updatePassword(newPassword, oldPassword);
  },

  // Send password recovery email
  async recoverPassword(email: string, resetUrl: string) {
    return await account.createRecovery(email, resetUrl);
  },

  // Complete password recovery
  async completeRecovery(userId: string, secret: string, password: string) {
    return await account.updateRecovery(userId, secret, password);
  },
};

export default authService;