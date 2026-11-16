import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { marginBps, priceQuote } from "./engine";
import type { PricingInput, PricingLineInput, QuoteDiscount } from "./types";

/**
 * Worked by hand, so the expected numbers are independent of the code:
 *
 *  A  40.5 sqm, cost 300.00, +25%      -> unit 375.00, net 15,187.50
 *  B  3 days, price 2,500.00, -10%     -> gross 7,500.00, net 6,750.00
 *  C  1 lot, permit fee 1,000.00, untaxed
 *  subtotal 22,937.50; 5% discount = 1,146.875 -> 1,146.88
 *  discount allocated 759.38 / 337.50 / 50.00 (the odd centavo goes to the largest remainder, A)
 *  taxable base = (15,187.50 - 759.38) + (6,750.00 - 337.50) = 20,840.62
 *  VAT 12% = 2,500.8744 -> 2,500.87; total 24,291.49; deposit 50% = 12,145.745 -> 12,145.75
 *  cost 17,550.00; margin 4,240.62
 */
const renovation: PricingInput = {
  lines: [
    { id: "a", quantityMilli: 40_500, unitCostCents: 30_000, markupBps: 2_500, lineDiscountBps: 0, isTaxable: true },
    {
      id: "b",
      quantityMilli: 3_000,
      unitCostCents: 180_000,
      markupBps: 0,
      unitPriceOverrideCents: 250_000,
      lineDiscountBps: 1_000,
      isTaxable: true,
    },
    {
      id: "c",
      quantityMilli: 1_000,
      unitCostCents: 0,
      markupBps: 0,
      unitPriceOverrideCents: 100_000,
      lineDiscountBps: 0,
      isTaxable: false,
    },
  ],
  quoteDiscount: { kind: "percent", bps: 500 },
  vatRateBps: 1_200,
  customerIsVatExempt: false,
  depositPercentBps: 5_000,
};

describe("priceQuote: worked example", () => {
  const q = priceQuote(renovation);

  it("prices each line", () => {
    expect(q.lines.map((l) => l.unitPriceCents)).toEqual([37_500, 250_000, 100_000]);
    expect(q.lines.map((l) => l.netCents)).toEqual([1_518_750, 675_000, 100_000]);
    expect(q.lines.map((l) => l.allocatedDiscountCents)).toEqual([75_938, 33_750, 5_000]);
    expect(q.lines.map((l) => l.taxableBaseCents)).toEqual([1_442_812, 641_250, 0]);
  });

  it("totals the quote", () => {
    expect(q.subtotalCents).toBe(2_293_750);
    expect(q.discountCents).toBe(114_688);
    expect(q.discountedSubtotalCents).toBe(2_179_062);
    expect(q.taxableBaseCents).toBe(2_084_062);
    expect(q.vatCents).toBe(250_087);
    expect(q.totalCents).toBe(2_429_149);
    expect(q.depositCents).toBe(1_214_575);
    expect(q.balanceCents).toBe(1_214_574);
  });

  it("keeps cost and margin internal figures", () => {
    expect(q.costCents).toBe(1_755_000);
    expect(q.marginCents).toBe(424_062);
    expect(marginBps(q)).toBe(1_946); // 424,062 / 2,179,062 = 19.46%
  });
});

describe("priceQuote: edges", () => {
  it("prices an empty quote at zero", () => {
    const q = priceQuote({ ...renovation, lines: [] });
    expect(q.totalCents).toBe(0);
    expect(q.depositCents).toBe(0);
    expect(marginBps(q)).toBe(0);
  });

  it("charges no VAT to an exempt customer", () => {
    const q = priceQuote({ ...renovation, customerIsVatExempt: true });
    expect(q.vatCents).toBe(0);
    expect(q.totalCents).toBe(q.discountedSubtotalCents);
  });

  it("clamps a fixed discount to the subtotal", () => {
    const q = priceQuote({ ...renovation, quoteDiscount: { kind: "fixed", cents: 999_999_999 } });
    expect(q.discountCents).toBe(q.subtotalCents);
    expect(q.totalCents).toBe(0);
  });

  it("reports a negative margin when sold below cost", () => {
    const q = priceQuote({
      ...renovation,
      lines: [{ id: "x", quantityMilli: 1_000, unitCostCents: 10_000, markupBps: 0, unitPriceOverrideCents: 8_000, lineDiscountBps: 0, isTaxable: true }],
      quoteDiscount: { kind: "none" },
    });
    expect(q.marginCents).toBe(-2_000);
    expect(marginBps(q)).toBe(-2_500);
  });

  it("rejects bad input instead of guessing", () => {
    expect(() => priceQuote({ ...renovation, vatRateBps: 1.2 })).toThrow(/vatRateBps/);
    expect(() => priceQuote({ ...renovation, depositPercentBps: 10_001 })).toThrow(/depositPercentBps/);
    expect(() =>
      priceQuote({ ...renovation, lines: [{ ...renovation.lines[0], quantityMilli: -1 }] }),
    ).toThrow(/quantityMilli/);
  });
});

const line = fc.record<PricingLineInput>({
  id: fc.uuid(),
  quantityMilli: fc.integer({ min: 0, max: 1_000_000 }),
  unitCostCents: fc.integer({ min: 0, max: 50_000_000 }),
  markupBps: fc.integer({ min: 0, max: 50_000 }),
  unitPriceOverrideCents: fc.option(fc.integer({ min: 0, max: 50_000_000 }), { nil: undefined }),
  lineDiscountBps: fc.integer({ min: 0, max: 10_000 }),
  isTaxable: fc.boolean(),
});

const discount = fc.oneof<fc.Arbitrary<QuoteDiscount>[]>(
  fc.constant({ kind: "none" as const }),
  fc.record({ kind: fc.constant("percent" as const), bps: fc.integer({ min: 0, max: 10_000 }) }),
  fc.record({ kind: fc.constant("fixed" as const), cents: fc.integer({ min: 0, max: 5_000_000_000 }) }),
);

const quote = fc.record<PricingInput>({
  lines: fc.array(line, { maxLength: 12 }),
  quoteDiscount: discount,
  vatRateBps: fc.integer({ min: 0, max: 2_500 }),
  customerIsVatExempt: fc.boolean(),
  depositPercentBps: fc.integer({ min: 0, max: 10_000 }),
});

describe("priceQuote: properties", () => {
  const runs = { numRuns: 1_000 };

  it("lines minus discount plus VAT equals the total, and deposit plus balance equals it too", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const q = priceQuote(input);
        expect(q.subtotalCents).toBe(q.lines.reduce((a, l) => a + l.netCents, 0));
        expect(q.totalCents).toBe(q.subtotalCents - q.discountCents + q.vatCents);
        expect(q.depositCents + q.balanceCents).toBe(q.totalCents);
      }),
      runs,
    );
  });

  it("charges no VAT to an exempt customer, whatever the line mix", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const q = priceQuote({ ...input, customerIsVatExempt: true });
        expect(q.vatCents).toBe(0);
        expect(q.taxableBaseCents).toBe(0);
      }),
      runs,
    );
  });

  it("allocates the discount exactly, never losing or inventing a centavo", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const q = priceQuote(input);
        expect(q.lines.reduce((a, l) => a + l.allocatedDiscountCents, 0)).toBe(q.discountCents);
        q.lines.forEach((l) => expect(l.allocatedDiscountCents).toBeLessThanOrEqual(l.netCents));
      }),
      runs,
    );
  });

  it("never lets the discount exceed the subtotal or a total go negative", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const q = priceQuote(input);
        expect(q.discountCents).toBeLessThanOrEqual(q.subtotalCents);
        for (const v of [q.subtotalCents, q.discountedSubtotalCents, q.vatCents, q.totalCents, q.depositCents, q.balanceCents]) {
          expect(v).toBeGreaterThanOrEqual(0);
        }
        q.lines.forEach((l) => expect(l.netCents).toBeGreaterThanOrEqual(0));
      }),
      runs,
    );
  });

  it("adds cost and margin back up to the discounted subtotal", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const q = priceQuote(input);
        expect(q.costCents + q.marginCents).toBe(q.discountedSubtotalCents);
      }),
      runs,
    );
  });

  it("ties the taxable base to its lines", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const q = priceQuote(input);
        expect(q.taxableBaseCents).toBe(q.lines.reduce((a, l) => a + l.taxableBaseCents, 0));
      }),
      runs,
    );
  });

  it("is deterministic and survives a JSON round trip, so a frozen snapshot re-prices identically", () => {
    fc.assert(
      fc.property(quote, (input) => {
        const first = priceQuote(input);
        const replayed = priceQuote(JSON.parse(JSON.stringify(input)));
        expect(replayed).toEqual(first);
        expect(JSON.parse(JSON.stringify(first))).toEqual(first);
      }),
      runs,
    );
  });
});
