const LOGOUT_CHANNEL = "app-logout";

export function broadcastLogout() {
  try {
    const channel = new BroadcastChannel(LOGOUT_CHANNEL);
    channel.postMessage("logout");
    channel.close();
  } catch {
    // Ignore if BroadcastChannel isn't available
  }
}

export function onLogoutBroadcast(handler: () => void): () => void {
  try {
    const channel = new BroadcastChannel(LOGOUT_CHANNEL);
    channel.onmessage = (event) => {
      if (event?.data === "logout") {
        handler();
      }
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}
