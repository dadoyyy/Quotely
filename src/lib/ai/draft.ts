import type { CatalogItemRow } from "../rows";
import { callGemini, type GeminiCall, type GeminiReply } from "./gemini";
import { PROMPT_VERSION, RESPONSE_SCHEMA, SYSTEM_INSTRUCTION, buildUserText } from "./prompt";
import { AiError, type AiImage, type AiResult, type Candidate } from "./types";
import { selectCandidates, validateAiOutput } from "./validate";

export const LIMITS = { maxText: 2000, maxImages: 3, maxImageBytes: 1_500_000 } as const;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface DraftRequest {
  description: string;
  images: AiImage[];
  catalog: CatalogItemRow[];
  apiKey: string;
  model: string;
  call?: (c: GeminiCall) => Promise<GeminiReply>;
}

export interface DraftOutcome {
  result: AiResult;
  candidates: Candidate[];
  rawText: string;
  promptVersion: string;
  tokens: number | null;
  latencyMs: number;
}

/** Ask the model, then let only validated, price-list-backed suggestions through. */
export async function generateDraft(r: DraftRequest): Promise<DraftOutcome> {
  const description = r.description.trim();
  if (!description && r.images.length === 0) throw new AiError("input", "Describe the job or attach a photo.");
  if (description.length > LIMITS.maxText) throw new AiError("input", `Keep the description under ${LIMITS.maxText} characters.`);
  if (r.images.length > LIMITS.maxImages) throw new AiError("input", `Attach up to ${LIMITS.maxImages} photos.`);

  const candidates = selectCandidates(r.catalog, description);
  if (candidates.length === 0) throw new AiError("input", "Add some items to your price list first, so the AI has something to choose from.");

  const reply = await (r.call ?? callGemini)({
    apiKey: r.apiKey,
    model: r.model,
    system: SYSTEM_INSTRUCTION,
    text: buildUserText(description || "(no written description: see the photos)", candidates),
    images: r.images,
    schema: RESPONSE_SCHEMA,
  });

  return {
    result: validateAiOutput(reply.text, candidates, description),
    candidates,
    rawText: reply.text,
    promptVersion: PROMPT_VERSION,
    tokens: reply.tokens,
    latencyMs: reply.latencyMs,
  };
}
