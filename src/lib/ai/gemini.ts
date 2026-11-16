/**
 * A small client for Gemini's generateContent REST API. The key is passed in by the caller and sent
 * in a header (never in the URL); only server code should ever call this.
 *
 * No sampling parameters (temperature, top_p, top_k) are sent: newer Gemini models reject them.
 */
import { AiError, type AiImage } from "./types";

export interface GeminiCall {
  apiKey: string;
  model: string;
  system: string;
  text: string;
  images: AiImage[];
  schema: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface GeminiReply {
  text: string;
  tokens: number | null;
  latencyMs: number;
}

interface RawReply {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { totalTokenCount?: number };
}

export async function callGemini(c: GeminiCall): Promise<GeminiReply> {
  const doFetch = c.fetchImpl ?? fetch;
  const started = Date.now();
  let res: Response;
  try {
    res = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": c.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: c.system }] },
        contents: [{ role: "user", parts: [{ text: c.text }, ...c.images.map((i) => ({ inline_data: { mime_type: i.mimeType, data: i.data } }))] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: c.schema },
      }),
      signal: AbortSignal.timeout(c.timeoutMs ?? 30_000),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new AiError("timeout", "The AI took too long to answer. Please try again.");
    }
    console.error("[ai] network", e);
    throw new AiError("failed", "Couldn't reach the AI service. Please try again.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[ai] gemini", res.status, body.slice(0, 400));
    if (res.status === 429) throw new AiError("quota", "The AI service is busy or over its limit. Try again in a minute.");
    if (res.status === 401 || res.status === 403) throw new AiError("auth", "The AI key was rejected. Check GEMINI_API_KEY.");
    if (res.status === 404) throw new AiError("failed", "The AI model wasn't found. Check GEMINI_MODEL.");
    throw new AiError("failed", "The AI service had a problem. Please try again.");
  }

  const raw = (await res.json().catch(() => null)) as RawReply | null;
  if (raw?.promptFeedback?.blockReason) {
    throw new AiError("blocked", "The AI couldn't use that input. Try different wording or photos.");
  }
  const candidate = raw?.candidates?.[0];
  const out = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!out.trim()) {
    throw new AiError(candidate?.finishReason === "SAFETY" ? "blocked" : "bad_response", "The AI didn't return an answer. Please try again.");
  }
  return { text: out, tokens: raw?.usageMetadata?.totalTokenCount ?? null, latencyMs: Date.now() - started };
}
