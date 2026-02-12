/**
 * Appwrite Function entrypoint for POST /ai/respond
 * Expects body: { boardId, message, contextWindow? }
 */
module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = JSON.parse(req.bodyRaw || "{}");
  } catch {
    return res.json({ error: "Invalid JSON body" }, 400);
  }

  const message = String(payload.message || "").trim();
  if (!message) {
    return res.json({ error: "message is required" }, 400);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json(
      {
        assistantText:
          "OPENAI_API_KEY is not set for this local function. Falling back to text-only mode.",
      },
      200
    );
  }

  try {
    const prompt = [
      "You are a dashboard assistant.",
      "Return strict JSON with keys:",
      "assistantText: string",
      "chart: optional { type: pie|bar|line, title: string, series: [{label:string,value:number}] }",
      "",
      `User request: ${message}`,
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: prompt,
        text: { format: { type: "json_object" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.json(
        { assistantText: `AI provider error: ${errorText || response.status}` },
        200
      );
    }

    const data = await response.json();
    const outputText =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      JSON.stringify({ assistantText: "No output produced." });

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      parsed = { assistantText: outputText };
    }

    return res.json(parsed, 200);
  } catch (error) {
    return res.json(
      {
        assistantText:
          error instanceof Error ? error.message : "Unexpected AI function error",
      },
      200
    );
  }
};
