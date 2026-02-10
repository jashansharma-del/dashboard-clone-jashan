const WEBEX_AUTHORIZE_URL = "https://webexapis.com/v1/authorize";
const WEBEX_TOKEN_URL = "https://webexapis.com/v1/access_token";
const WEBEX_PEOPLE_ME_URL = "https://webexapis.com/v1/people/me";

const WEBEX_TOKEN_KEY = "webex_token";
const WEBEX_REFRESH_TOKEN_KEY = "webex_refresh_token";
const WEBEX_EXPIRES_AT_KEY = "webex_expires_at";
const WEBEX_USER_KEY = "webex_user";
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
  const scopes = import.meta.env.VITE_WEBEX_SCOPES || "spark:people_read";
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

export const startWebexLogin = async () => {
  const { clientId, redirectUri, scopes, flow } = getWebexConfig();
  if (!clientId) {
    throw new Error("Missing VITE_WEBEX_CLIENT_ID");
  }

  const state = randomString(32);
  localStorage.setItem(WEBEX_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });

  if (flow === "implicit") {
    params.set("response_type", "token");
  } else {
    const codeVerifier = randomString(64);
    localStorage.setItem(WEBEX_CODE_VERIFIER_KEY, codeVerifier);
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
  const codeVerifier = localStorage.getItem(WEBEX_CODE_VERIFIER_KEY) || "";

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

export const persistWebexSession = (token: WebexTokenResponse, me: WebexMe) => {
  const expiresAt = token.expires_in ? Date.now() + token.expires_in * 1000 : undefined;
  localStorage.setItem(WEBEX_TOKEN_KEY, token.access_token);
  if (token.refresh_token) {
    localStorage.setItem(WEBEX_REFRESH_TOKEN_KEY, token.refresh_token);
  }
  if (expiresAt) {
    localStorage.setItem(WEBEX_EXPIRES_AT_KEY, String(expiresAt));
  }
  localStorage.setItem(WEBEX_USER_KEY, JSON.stringify(me));

  const primaryEmail = me.emails?.[0] || me.email || "";
  const displayName = me.displayName || me.firstName || primaryEmail || "Webex User";

  localStorage.setItem(
    "auth_user",
    JSON.stringify({
      id: me.id,
      email: primaryEmail,
      name: displayName,
      provider: "webex",
    })
  );
  localStorage.setItem("auth_provider", "webex");

  return {
    $id: me.id,
    email: primaryEmail,
    name: displayName,
  };
};

export const isWebexSessionValid = () => {
  const token = localStorage.getItem(WEBEX_TOKEN_KEY);
  if (!token) {
    return false;
  }
  const expiresAt = localStorage.getItem(WEBEX_EXPIRES_AT_KEY);
  if (!expiresAt) {
    return true;
  }
  return Number(expiresAt) > Date.now();
};

export const clearWebexSession = () => {
  localStorage.removeItem(WEBEX_TOKEN_KEY);
  localStorage.removeItem(WEBEX_REFRESH_TOKEN_KEY);
  localStorage.removeItem(WEBEX_EXPIRES_AT_KEY);
  localStorage.removeItem(WEBEX_USER_KEY);
  localStorage.removeItem(WEBEX_STATE_KEY);
  localStorage.removeItem(WEBEX_CODE_VERIFIER_KEY);
};
