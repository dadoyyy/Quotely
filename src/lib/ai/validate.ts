/**
 * The guard between the model and the quote. Whatever the model says, only these survive:
 * keys that exist on the price list, a quantity the user typed themselves, and short plain text.
 * No amount of money can pass through, because there is no field for it.
 */
import { z } from "zod";
import { milliToInput, parseQuantityToMilli } from "../money-format";
import type { CatalogItemRow } from "../rows";
import { AiError, type AiMatch, type AiResult, type Candidate } from "./types";

const MAX_MATCHES = 30;
const MAX_UNMATCHED = 10;

const outputSchema = z.object({
  matches: z.array(z.object({ item: z.string(), quantity: z.union([z.string(), z.number(), z.null()]).optional(), reason: z.string().optional() })).default([]),
  unmatched: z.array(z.string()).default([]),
});

const text = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Numbers the person actually typed, as thousandths. "1,200", "40.0" and "40" are the same number. */
function numbersIn(userText: string): Set<number> {
  const found = new Set<number>();
  for (const m of userText.replace(/(\d),(?=\d{3}\b)/g, "$1").matchAll(/\d+(?:\.\d+)?|\.\d+/g)) {
    const milli = parseQuantityToMilli(m[0]);
    if (milli !== null) found.add(milli);
  }
  return found;
}

/** A quantity survives only if it is valid AND appears in the user's own words. */
export function acceptQuantity(raw: string | number | null | undefined, userText: string): string | null {
  if (raw === null || raw === undefined) return null;
  const milli = parseQuantityToMilli(String(raw));
  if (milli === null) return null;
  return numbersIn(userText).has(milli) ? milliToInput(milli) : null;
}

function parseJson(raw: string): unknown {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(s);
  } catch {
    throw new AiError("bad_response", "The AI's answer couldn't be read. Please try again.");
  }
}

export function validateAiOutput(raw: string, candidates: Candidate[], userText: string): AiResult {
  const parsed = outputSchema.safeParse(parseJson(raw));
  if (!parsed.success) throw new AiError("bad_response", "The AI's answer wasn't in the expected shape. Please try again.");

  const byKey = new Map(candidates.map((c) => [c.key, c.item]));
  const seen = new Set<string>();
  const matches: AiMatch[] = [];
  for (const m of parsed.data.matches) {
    const item = byKey.get(m.item.trim());
    if (!item || seen.has(item.id)) continue; // unknown key or a repeat: dropped
    seen.add(item.id);
    matches.push({ itemId: item.id, quantity: acceptQuantity(m.quantity, userText), reason: text(m.reason ?? "", 200) });
    if (matches.length >= MAX_MATCHES) break;
  }

  const unmatched = parsed.data.unmatched.map((u) => text(u, 120)).filter(Boolean).slice(0, MAX_UNMATCHED);
  return { matches, unmatched };
}

/**
 * The model sees a bounded price list. With a big one, keep the items whose words overlap the
 * description most, so the relevant ones always make it in.
 */
export function selectCandidates(items: CatalogItemRow[], description: string, max = 300): Candidate[] {
  const active = items.filter((i) => i.is_active);
  let chosen = [...active].sort((a, b) => a.name.localeCompare(b.name));
  if (chosen.length > max) {
    const words = new Set(description.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
    const score = (i: CatalogItemRow) =>
      (`${i.name} ${i.category ?? ""} ${i.description ?? ""}`.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((w) => words.has(w)).length;
    chosen = chosen
      .map((i) => ({ i, s: score(i) }))
      .sort((a, b) => b.s - a.s || a.i.name.localeCompare(b.i.name))
      .slice(0, max)
      .map((x) => x.i)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return chosen.map((item, idx) => ({ key: `c${idx + 1}`, item }));
}
