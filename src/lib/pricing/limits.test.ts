import { describe, expect, it } from "vitest";
import { LIMITS, PricingError, priceQuote } from "./engine";
import type { PricingInput, PricingLineInput } from "./types";

const line = (over: Partial<PricingLineInput> = {}): PricingLineInput => ({
  id: "x", quantityMilli: 1000, unitCostCents: 100, markupBps: 0, lineDiscountBps: 0, isTaxable: true, ...over,
});
const quote = (lines: PricingLineInput[]): PricingInput => ({
  lines, quoteDiscount: { kind: "none" }, vatRateBps: 1200, customerIsVatExempt: false, depositPercentBps: 0,
});

describe("overflow guard", () => {
  it("prices the largest allowed line exactly", () => {
    const q = priceQuote(quote([line({ quantityMilli: LIMITS.maxQuantityMilli, unitCostCents: LIMITS.maxUnitCents })]));
    expect(q.subtotalCents).toBe((LIMITS.maxQuantityMilli / 1000) * LIMITS.maxUnitCents);
    expect(Number.isSafeInteger(q.totalCents)).toBe(true);
  });

  it("rejects out-of-range quantity and price with a plain error", () => {
    expect(() => priceQuote(quote([line({ quantityMilli: LIMITS.maxQuantityMilli + 1 })]))).toThrow(PricingError);
    expect(() => priceQuote(quote([line({ unitCostCents: LIMITS.maxUnitCents + 1 })]))).toThrow(PricingError);
    expect(() => priceQuote(quote([line({ unitPriceOverrideCents: LIMITS.maxUnitCents + 1 })]))).toThrow(PricingError);
  });

  it("turns a sum that would lose precision into a PricingError, not a wrong total", () => {
    const big = line({ quantityMilli: LIMITS.maxQuantityMilli, unitCostCents: LIMITS.maxUnitCents });
    const many = Array.from({ length: 12 }, (_, i) => ({ ...big, id: `l${i}` }));
    expect(() => priceQuote(quote(many))).toThrow(/too large/);
  });

  it("turns a markup that overflows into a PricingError", () => {
    expect(() =>
      priceQuote(quote([line({ quantityMilli: LIMITS.maxQuantityMilli, unitCostCents: LIMITS.maxUnitCents, markupBps: LIMITS.maxMarkupBps })])),
    ).toThrow(PricingError);
  });
});
