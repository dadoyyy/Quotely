import { z } from "zod";
import { CATALOG_KINDS, UNITS } from "../constants";
import { LIMITS } from "../pricing/engine";

const text = (max: number) => z.string().max(max, `Keep it under ${max} characters`);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date").nullable();
const bps = (max = 10_000) => z.number().int().min(0).max(max);

const section = z.object({ id: z.uuid(), title: text(120) });

const line = z.object({
  id: z.uuid(),
  sectionId: z.uuid().nullable(),
  catalogItemId: z.uuid().nullable(),
  name: z.string().min(1, "Give this line a name").max(200),
  description: text(2000),
  kind: z.enum(CATALOG_KINDS),
  unit: z.enum(UNITS),
  quantityMilli: z.number().int().min(1).max(LIMITS.maxQuantityMilli),
  unitCostCents: z.number().int().min(0).max(LIMITS.maxUnitCents),
  markupBps: bps(LIMITS.maxMarkupBps),
  unitPriceOverrideCents: z.number().int().min(0).max(LIMITS.maxUnitCents).nullable(),
  lineDiscountBps: bps(),
  isTaxable: z.boolean(),
});

/** What the builder sends. Totals are deliberately absent: the server always recalculates them. */
export const quotePayloadSchema = z
  .object({
    customerId: z.uuid(),
    title: z.string().min(1, "Give the quote a title").max(200),
    scope: text(5000),
    terms: text(5000),
    notes: text(5000),
    issueDate: date,
    validUntil: date,
    vatRateBps: bps(),
    customerIsVatExempt: z.boolean(),
    depositPercentBps: bps(),
    discount: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("none") }),
      z.object({ kind: z.literal("percent"), bps: bps() }),
      z.object({ kind: z.literal("fixed"), cents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }),
    ]),
    sections: z.array(section).max(50),
    lines: z.array(line).max(300),
  })
  .superRefine((q, ctx) => {
    const sectionIds = new Set(q.sections.map((s) => s.id));
    if (sectionIds.size !== q.sections.length) ctx.addIssue({ code: "custom", message: "Duplicate section", path: ["sections"] });
    if (new Set(q.lines.map((l) => l.id)).size !== q.lines.length) ctx.addIssue({ code: "custom", message: "Duplicate line", path: ["lines"] });
    q.lines.forEach((l, i) => {
      if (l.sectionId && !sectionIds.has(l.sectionId)) ctx.addIssue({ code: "custom", message: "Unknown section", path: ["lines", i, "sectionId"] });
    });
    if (q.issueDate && q.validUntil && q.validUntil < q.issueDate) {
      ctx.addIssue({ code: "custom", message: "Valid until must be on or after the issue date", path: ["validUntil"] });
    }
  });
