import { z } from "zod";
import { CATALOG_KINDS, UNITS } from "../constants";
import { parsePercentToBps, parsePesosToCents } from "../money-format";
import { checkbox, missingToBlank, optionalText } from "./form";

const MAX_CENTS = 100_000_000_000_00; // 100 billion pesos: far past any real quote

/** A money input: blank is `fallback`, otherwise a plain amount like 1,250.50. */
const money = <F extends number | null>(fallback: F) =>
  z.preprocess(
    missingToBlank,
    z.string().transform((raw, ctx): number | F => {
      if (raw.trim() === "") return fallback;
      const cents = parsePesosToCents(raw);
      if (cents === null || cents > MAX_CENTS) {
        ctx.addIssue({ code: "custom", message: "Enter an amount like 1,250.50" });
        return z.NEVER;
      }
      return cents;
    }),
  );

const percent = (maxBps: number) =>
  z.preprocess(
    missingToBlank,
    z.string().transform((raw, ctx): number => {
      if (raw.trim() === "") return 0;
      const bps = parsePercentToBps(raw);
      if (bps === null || bps > maxBps) {
        ctx.addIssue({ code: "custom", message: `Enter a percentage from 0 to ${maxBps / 100}` });
        return z.NEVER;
      }
      return bps;
    }),
  );

export const catalogItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Keep it under 200 characters"),
  sku: optionalText(60),
  description: optionalText(1000),
  category: optionalText(80),
  kind: z.enum(CATALOG_KINDS, "Choose a type"),
  unit: z.enum(UNITS, "Choose a unit"),
  costCents: money(0),
  markupBps: percent(100_000),
  /** Blank means: work the price out from cost and markup. */
  priceCents: money(null),
  isTaxable: checkbox,
  isActive: checkbox,
});

export type CatalogItemInput = z.output<typeof catalogItemSchema>;
