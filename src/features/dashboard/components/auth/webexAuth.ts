import { account } from "./appwriteClient";

const WEBEX_AUTHORIZE_URL = "https://webexapis.com/v1/authorize";
const WEBEX_TOKEN_URL = "https://webexapis.com/v1/access_token";
const WEBEX_PEOPLE_ME_URL = "https://webexapis.com/v1/people/me";
const WEBEX_PEOPLE_URL = "https://webexapis.com/v1/people";
const WEBEX_MESSAGES_URL = "https://webexapis.com/v1/messages";

const WEBEX_STATE_KEY = "webex_oauth_state";
const WEBEX_CODE_VERIFIER_KEY = "webex_code_verifier";

type WebexMe = {
  id: string;
  displayName?: string;
  firstName?: string;
  emails?: string[];
  email?: string;
};

type WebexTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
};

export type WebexPrefsPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  email?: string;
  name?: string;
};

export type WebexProfile = {
  webexUserId: string;
  email: string;
  name: string;
};

export type WebexPerson = {
  id: string;
  displayName?: string;
  emails?: string[];
};

type WebexConfig = {
  clientId: string;
  redirectUri: string;
  scopes: string;
  flow: "pkce" | "implicit";
};

const getWebexConfig = (): WebexConfig => {
  const clientId = import.meta.env.VITE_WEBEX_CLIENT_ID || "";
  const redirectUri =
    import.meta.env.VITE_WEBEX_REDIRECT_URI || `${window.location.origin}/webex/callback`;
  const scopes =
    import.meta.env.VITE_WEBEX_SCOPES ||
    "spark:people_read spark:messages_read spark:messages_write";
  const flow = (import.meta.env.VITE_WEBEX_OAUTH_FLOW || "implicit") as WebexConfig["flow"];

  return {
    clientId,
    redirectUri,
    scopes,
    flow: flow === "pkce" ? "pkce" : "implicit",
  };
};

const randomString = (length = 32) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values)
    .map((value) => charset[value % charset.length])
    .join("");
};

const base64UrlEncode = (input: ArrayBuffer) => {
  const bytes = new Uint8Array(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const sha256 = async (value: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
};

export const getWebexState = () => sessionStorage.getItem(WEBEX_STATE_KEY);

export const clearWebexOAuthState = () => {
  sessionStorage.removeItem(WEBEX_STATE_KEY);
  sessionStorage.removeItem(WEBEX_CODE_VERIFIER_KEY);
};

export const startWebexLogin = async () => {
  const { clientId, redirectUri, scopes, flow } = getWebexConfig();
  if (!clientId) {
    throw new Error("Missing VITE_WEBEX_CLIENT_ID");
  }

  const state = randomString(32);
  sessionStorage.setItem(WEBEX_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    prompt: "consent",
  });

  if (flow === "implicit") {
    params.set("response_type", "token");
  } else {
    const codeVerifier = randomString(64);
    sessionStorage.setItem(WEBEX_CODE_VERIFIER_KEY, codeVerifier);
    const codeChallenge = await sha256(codeVerifier);

    params.set("response_type", "code");
    params.set("code_challenge_method", "S256");
    params.set("code_challenge", codeChallenge);
  }

  window.location.assign(`${WEBEX_AUTHORIZE_URL}?${params.toString()}`);
};

export const parseWebexCallback = () => {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const queryParams = url.searchParams;

  const error = hashParams.get("error") || queryParams.get("error");
  const errorDescription =
    hashParams.get("error_description") || queryParams.get("error_description");
  const accessToken = hashParams.get("access_token");
  const expiresIn = hashParams.get("expires_in");
  const state = hashParams.get("state") || queryParams.get("state");
  const code = queryParams.get("code");

  return {
    error,
    errorDescription,
    accessToken,
    expiresIn: expiresIn ? Number(expiresIn) : undefined,
    state,
    code,
  };
};

export const exchangeWebexCodeForToken = async (code: string) => {
  const { clientId, redirectUri } = getWebexConfig();
  const codeVerifier = sessionStorage.getItem(WEBEX_CODE_VERIFIER_KEY) || "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const response = await fetch(WEBEX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to exchange Webex authorization code.");
  }

  return (await response.json()) as WebexTokenResponse;
};

export const fetchWebexMe = async (accessToken: string) => {
  const response = await fetch(WEBEX_PEOPLE_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch Webex user profile.");
  }

  return (await response.json()) as WebexMe;
};

async function extractWebexError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    const message =
      data?.message || data?.errors?.[0]?.description || data?.errors?.[0]?.message;
    return message || fallback;
  } catch {
    return fallback;
  }
}

export const searchWebexPeopleByEmail = async (accessToken: string, email: string) => {
  const params = new URLSearchParams({ email: email.trim() });
  const response = await fetch(`${WEBEX_PEOPLE_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await extractWebexError(response, "Failed to search Webex users."));
  }

  const data = (await response.json()) as { items?: WebexPerson[] };
  return data.items || [];
};

export const sendWebexDirectMessage = async (
  accessToken: string,
  payload: { toPersonId: string; markdown: string; text?: string }
) => {
  const response = await fetch(WEBEX_MESSAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractWebexError(response, "Failed to send Webex message."));
  }

  return await response.json();
};

export const persistWebexSession = (token: WebexTokenResponse, me: WebexMe) => {
  const expiresAt = token.expires_in ? Date.now() + token.expires_in * 1000 : undefined;

  const primaryEmail = me.emails?.[0] || me.email || "";
  const displayName = me.displayName || me.firstName || primaryEmail || "Webex User";

  return {
    webexProfile: {
      webexUserId: me.id,
      email: primaryEmail,
      name: displayName,
    } as WebexProfile,
    webexPrefs: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt,
      userId: me.id,
      email: primaryEmail,
      name: displayName,
    } as WebexPrefsPayload,
  };
};

export const isWebexSessionValid = async () => {
  try {
    const prefs = await account.getPrefs();
    const webex = (prefs as Record<string, any>)?.webex;
    if (!webex || !webex.accessToken) {
      return false;
    }
    if (!webex.expiresAt) {
      return true;
    }
    return Number(webex.expiresAt) > Date.now();
  } catch {
    return false;
  }
};

export const clearWebexSession = async () => {
  clearWebexOAuthState();

  try {
    const prefs = await account.getPrefs();
    if ((prefs as Record<string, any>)?.webex) {
      const nextPrefs = { ...(prefs as Record<string, any>) };
      delete nextPrefs.webex;
      await account.updatePrefs(nextPrefs);
    }
  } catch {
    // Ignore when no valid Appwrite session exists.
  }
};
