import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.AI_SERVER_PORT || 3001);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const AI_PROVIDER =
  process.env.AI_PROVIDER || (GEMINI_API_KEY ? "gemini" : OPENAI_API_KEY ? "openai" : "");

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ai-server",
    provider: AI_PROVIDER || "none",
    model: AI_PROVIDER === "gemini" ? GEMINI_MODEL : OPENAI_MODEL,
  });
});

app.post("/api/ai/respond", async (req, res) => {
  const { boardId, message } = req.body || {};
  const promptMessage = String(message || "").trim();

  if (!promptMessage) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!AI_PROVIDER) {
    return res.status(500).json({
      assistantText:
        "No AI provider key configured. Set GEMINI_API_KEY or OPENAI_API_KEY before running ai:server.",
    });
  }

  const prompt = [
    "You are a dashboard analytics assistant.",
    "Return strict JSON with keys:",
    "- assistantText: string",
    "- chart?: { type: pie|bar|line, title?: string, series: [{label:string,value:number}] }",
    "",
    `Board: ${String(boardId || "")}`,
    `User request: ${promptMessage}`,
  ].join("\n");

  try {
    if (AI_PROVIDER === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          GEMINI_MODEL
        )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({
          assistantText: `Gemini request failed: ${errorText || response.status}`,
        });
      }

      const data = await response.json();
      const outputText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify({ assistantText: "No output generated." });
      try {
        return res.json(JSON.parse(outputText));
      } catch {
        return res.json({ assistantText: outputText });
      }
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        text: {
          format: { type: "json_object" },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        assistantText: `OpenAI request failed: ${errorText || response.status}`,
      });
    }

    const data = await response.json();
    const outputText =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      JSON.stringify({ assistantText: "No output generated." });
    try {
      return res.json(JSON.parse(outputText));
    } catch {
      return res.json({ assistantText: outputText });
    }
  } catch (error) {
    return res.status(500).json({
      assistantText:
        error instanceof Error ? error.message : "Local AI server error",
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AI server running at http://localhost:${PORT}`);
});
