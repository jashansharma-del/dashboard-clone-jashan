import { ID } from "appwrite";
import { databases } from "../features/dashboard/components/utils/authService";
import {
  APPWRITE_COLLECTION_AI_RUNS,
  APPWRITE_DATABASE_ID,
  hasCollectionConfig,
} from "./appwriteConfig";

export type AIChartSeriesPoint = {
  label: string;
  value: number;
};

export type AIChartPayload = {
  type: "pie" | "bar" | "line";
  title?: string;
  series: AIChartSeriesPoint[];
};

export type AIResponse = {
  assistantText: string;
  chart?: AIChartPayload;
  citations?: string[];
};

type AIRequest = {
  boardId: string;
  message: string;
  contextWindow?: number;
  selectedNodeId?: string;
};

function buildCandidateEndpoints() {
  const envEndpoint = String(import.meta.env.VITE_AI_RESPOND_ENDPOINT || "").trim();
  if (envEndpoint) {
    return [envEndpoint];
  }
  return ["/api/ai/respond"];
}

function isSeries(value: unknown): value is AIChartSeriesPoint[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as any).label === "string" &&
        typeof (item as any).value === "number"
    )
  );
}

function normalizeResponse(input: any): AIResponse {
  const assistantText =
    typeof input?.assistantText === "string" && input.assistantText.trim()
      ? input.assistantText.trim()
      : "I could not generate a structured response, but I captured your request.";

  if (
    input?.chart &&
    (input.chart.type === "pie" || input.chart.type === "bar" || input.chart.type === "line") &&
    isSeries(input.chart.series)
  ) {
    return {
      assistantText,
      chart: {
        type: input.chart.type,
        title: typeof input.chart.title === "string" ? input.chart.title : undefined,
        series: input.chart.series,
      },
      citations: Array.isArray(input.citations)
        ? input.citations.filter((x: unknown) => typeof x === "string")
        : undefined,
    };
  }

  return { assistantText };
}

async function logAIRun(params: {
  boardId: string;
  userId: string;
  status: "success" | "error";
  latencyMs: number;
  errorCode?: string;
}) {
  try {
    if (!hasCollectionConfig(APPWRITE_COLLECTION_AI_RUNS)) return;
    await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_AI_RUNS, ID.unique(), {
      boardId: params.boardId,
      userId: params.userId,
      status: params.status,
      latencyMs: params.latencyMs,
      errorCode: params.errorCode || null,
      model: "openai-via-function",
      promptHash: `${params.boardId}:${Date.now()}`,
    });
  } catch {
    // Intentionally noop: telemetry failures should never block UX.
  }
}

export async function requestAIResponse(
  payload: AIRequest,
  userId: string
): Promise<AIResponse> {
  const startedAt = Date.now();
  const endpoints = buildCandidateEndpoints();
  let lastError: unknown = null;

  try {
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `AI endpoint ${endpoint} failed with status ${res.status}${
              text ? `: ${text}` : ""
            }`
          );
        }

        const raw = await res.json();
        const normalized = normalizeResponse(raw);
        await logAIRun({
          boardId: payload.boardId,
          userId,
          status: "success",
          latencyMs: Date.now() - startedAt,
        });
        return normalized;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No AI endpoint available");
  } catch (error) {
    await logAIRun({
      boardId: payload.boardId,
      userId,
      status: "error",
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.message : "unknown_ai_error",
    });
    return {
      assistantText: `AI service is unavailable right now. ${
        error instanceof Error ? error.message : "Please retry in a few seconds."
      }`,
    };
  }
}
