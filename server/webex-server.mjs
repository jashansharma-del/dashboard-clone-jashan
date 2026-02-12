import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.WEBEX_SERVER_PORT || 8787);

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON payload.");
  }
};

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && req.url === "/api/webex/diagnostics") {
    try {
      const body = await parseBody(req);
      const userAccessToken = String(body?.accessToken || "").trim();

      if (!userAccessToken) {
        return sendJson(res, 400, {
          message: "Missing Webex user token. Please sign in with Webex again.",
        });
      }

      const meRes = await fetch("https://webexapis.com/v1/people/me", {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      let mePayload = {};
      try {
        mePayload = await meRes.json();
      } catch {
        mePayload = {};
      }

      // Permission probe for messages_write: use intentionally invalid email.
      // 400 => token reached endpoint with write permission checks passed.
      // 401/403 => auth/scope/license issue.
      const writeProbeRes = await fetch("https://webexapis.com/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toPersonEmail: "invalid-email",
          text: "diagnostic",
        }),
      });

      let writeProbePayload = {};
      try {
        writeProbePayload = await writeProbeRes.json();
      } catch {
        writeProbePayload = {};
      }

      return sendJson(res, 200, {
        ok: true,
        profileCheck: {
          status: meRes.status,
          ok: meRes.ok,
          email: mePayload?.emails?.[0] || mePayload?.email || "",
          id: mePayload?.id || "",
          error: mePayload?.message || "",
          trackingId: mePayload?.trackingId || "",
        },
        writeProbe: {
          status: writeProbeRes.status,
          ok: writeProbeRes.ok,
          error: writeProbePayload?.message || "",
          trackingId: writeProbePayload?.trackingId || "",
          interpretation:
            writeProbeRes.status === 400
              ? "messages_write likely allowed (request reached payload validation)."
              : writeProbeRes.status === 401
              ? "token invalid or expired."
              : writeProbeRes.status === 403
              ? "missing scopes/roles/license or org policy restriction."
              : "unexpected response.",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected diagnostics error.";
      console.error("[webex-server] diagnostics failed:", error);
      return sendJson(res, 500, { message });
    }
  }

  if (req.method !== "POST" || req.url !== "/api/webex/send") {
    return sendJson(res, 404, { message: "Not found." });
  }

  try {
    const body = await parseBody(req);
    const email = String(body?.email || "").trim();
    const message = String(body?.message || "").trim();
    const boardUrl = String(body?.boardUrl || "").trim();
    const userAccessToken = String(body?.accessToken || "").trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return sendJson(res, 400, { message: "Invalid email address." });
    }

    const text = `${message || "I shared this board with you."}${
      boardUrl ? `\n\nBoard link: ${boardUrl}` : ""
    }`;

    const tokenToUse = userAccessToken;
    if (!tokenToUse) {
      return sendJson(res, 500, {
        message: "Missing Webex user token. Please sign in with Webex again.",
      });
    }

    const webexResponse = await fetch("https://webexapis.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toPersonEmail: email,
        text,
      }),
    });

    if (!webexResponse.ok) {
      let messageText = "Failed to send Webex message.";
      const raw = await webexResponse.text();
      let trackingId = "";
      try {
        const parsed = JSON.parse(raw);
        trackingId = parsed?.trackingId || "";
        messageText = parsed?.message || raw || messageText;
      } catch {
        messageText = raw || messageText;
      }
      return sendJson(res, webexResponse.status, {
        message: messageText,
        trackingId,
        status: webexResponse.status,
      });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    console.error("[webex-server] send failed:", error);
    return sendJson(res, 500, { message });
  }
});

server.listen(PORT, () => {
  console.log(`Webex API server listening on http://localhost:${PORT}`);
});
