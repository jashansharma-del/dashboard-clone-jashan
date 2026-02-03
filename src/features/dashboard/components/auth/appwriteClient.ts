import { Client, Account } from "appwrite";

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || "");

export const account = new Account(client);

// JWT utility functions
export const createJWT = async () => {
  try {
    const session = await account.createJWT();
    return session.jwt;
  } catch (error) {
    console.error("Failed to create JWT - ensure JWT is enabled in Appwrite console:", error);
    // Return null instead of throwing to allow graceful fallback
    return null;
  }
};

export const validateJWT = async (jwt: string) => {
  try {
    // Use Appwrite SDK instead of manual fetch
    client.setJWT(jwt);
    const accountInfo = await account.get();
    return !!accountInfo;
  } catch (error) {
    console.error("Failed to validate JWT:", error);
    return false;
  }
};