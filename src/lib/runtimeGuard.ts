const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalhost(hostname: string) {
  return LOCAL_HOSTS.has(hostname);
}

export function enforceLocalhostOnly() {
  const localhostOnly = (import.meta.env.VITE_LOCALHOST_ONLY ?? "true") !== "false";
  if (!localhostOnly) return;

  const { hostname } = window.location;
  if (!isLocalhost(hostname)) {
    throw new Error(
      `Localhost-only mode is enabled. Current host "${hostname}" is not allowed.`
    );
  }

  const endpoint = String(import.meta.env.VITE_APPWRITE_ENDPOINT || "");
  if (endpoint) {
    try {
      const parsed = new URL(endpoint);
      if (!isLocalhost(parsed.hostname)) {
        throw new Error(
          `VITE_APPWRITE_ENDPOINT must be localhost in localhost-only mode. Received "${endpoint}".`
        );
      }
    } catch (error) {
      throw new Error(
        `Invalid VITE_APPWRITE_ENDPOINT value "${endpoint}" in localhost-only mode.`
      );
    }
  }
}
