"use server";

import { requireContext } from "@/lib/auth";
import { aiAvailable } from "@/lib/ai/config";
import { generateDraft } from "@/lib/ai/draft";
import { readImages } from "@/lib/ai/files";
import { AiError, type AiMatch } from "@/lib/ai/types";
import type { CatalogItemRow } from "@/lib/rows";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export type AiDraftState = {
  error?: string;
  draftId?: string;
  matches?: AiMatch[];
  unmatched?: string[];
  /** Drafts this person has left today. */
  remaining?: number;
};

const dailyLimit = () => {
  const n = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : 30;
};

/**
 * Suggest price-list items for a described job. Nothing is saved to the quote here: the person
 * reviews the suggestions in the builder and chooses what to add.
 */
export async function draftFromDescription(_prev: AiDraftState, fd: FormData): Promise<AiDraftState> {
  const { org, user, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view quotes but not draft them." };
  if (!aiAvailable(org.ai_enabled)) return { error: "AI drafting isn't turned on. An owner can enable it in Settings." };

  const quoteIdRaw = fd.get("quoteId");
  const quoteId = isUuid(quoteIdRaw) ? quoteIdRaw : null;
  const description = String(fd.get("description") ?? "");

  const supabase = await createClient();

  // A rolling 24-hour cap per person, counting every attempt, so a bug or a bad actor can't run up a bill.
  const limit = dailyLimit();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: used } = await supabase.from("ai_drafts").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((used ?? 0) >= limit) return { error: `You've used your ${limit} AI drafts for today. Try again tomorrow, or add items by hand.`, remaining: 0 };

  let images;
  try {
    images = await readImages(fd.getAll("photos").filter((f): f is File => f instanceof File));
  } catch (e) {
    if (e instanceof AiError) return { error: e.message };
    throw e;
  }

  const { data: catalog } = await supabase.from("catalog_items").select("*").eq("org_id", org.id).eq("is_active", true).order("name").limit(1000);
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  // Record the attempt first, so it counts even if the call fails.
  const { data: row, error: insertError } = await supabase
    .from("ai_drafts")
    .insert({ org_id: org.id, user_id: user.id, quote_id: quoteId, input_text: description.slice(0, 2000) || null, image_paths: [], model, prompt_version: "v1" })
    .select("id")
    .single();
  if (insertError || !row) {
    console.error("[ai] log insert", insertError?.code, insertError?.message);
    return { error: "Couldn't start the AI draft. Please try again." };
  }

  try {
    const out = await generateDraft({
      description,
      images,
      catalog: (catalog ?? []) as CatalogItemRow[],
      apiKey: process.env.GEMINI_API_KEY as string,
      model,
    });
    await supabase
      .from("ai_drafts")
      .update({
        prompt_version: out.promptVersion,
        raw_response: { text: out.rawText, photos: images.length },
        matched: out.result.matches,
        unmatched: out.result.unmatched,
        tokens: out.tokens,
        latency_ms: out.latencyMs,
      })
      .eq("id", row.id);
    return { draftId: row.id, matches: out.result.matches, unmatched: out.result.unmatched, remaining: Math.max(0, limit - (used ?? 0) - 1) };
  } catch (e) {
    if (e instanceof AiError) return { error: e.message, remaining: Math.max(0, limit - (used ?? 0) - 1) };
    console.error("[ai] unexpected", e);
    return { error: "Something went wrong. Please try again." };
  }
}

/** The person added suggestions to the quote. Recorded so we can see how useful the drafts are. */
export async function markAiDraftAccepted(draftId: string): Promise<void> {
  if (!isUuid(draftId)) return;
  const { user, canWrite } = await requireContext();
  if (!canWrite) return;
  const supabase = await createClient();
  await supabase.from("ai_drafts").update({ accepted: true }).eq("id", draftId).eq("user_id", user.id);
}
