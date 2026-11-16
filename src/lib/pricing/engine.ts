import { allocateProportionally, mulDivHalfUp } from "../money";
import type { PricedLine, PricedQuote, PricingInput } from "./types";

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

/** Hard limits so no combination of valid-looking inputs can overflow a safe integer. */
export const LIMITS = {
  /** 100,000 units, in thousandths. */
  maxQuantityMilli: 100_000_000,
  /** PHP 100,000,000 per unit, in centavos. */
  maxUnitCents: 10_000_000_000,
  /** 10,000%. */
  maxMarkupBps: 1_000_000,
} as const;

function int(name: string, v: number, max = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(v) || v < 0 || v > max) {
    throw new PricingError(`${name} must be an integer between 0 and ${max}, got ${v}`);
  }
}

function validate(input: PricingInput): void {
  input.lines.forEach((l, i) => {
    const at = `lines[${i}]`;
    int(`${at}.quantityMilli`, l.quantityMilli, LIMITS.maxQuantityMilli);
    int(`${at}.unitCostCents`, l.unitCostCents, LIMITS.maxUnitCents);
    int(`${at}.markupBps`, l.markupBps, LIMITS.maxMarkupBps);
    if (l.unitPriceOverrideCents != null) int(`${at}.unitPriceOverrideCents`, l.unitPriceOverrideCents, LIMITS.maxUnitCents);
    int(`${at}.lineDiscountBps`, l.lineDiscountBps, 10_000);
  });
  int("vatRateBps", input.vatRateBps, 10_000);
  int("depositPercentBps", input.depositPercentBps, 10_000);
  if (input.quoteDiscount.kind === "percent") int("quoteDiscount.bps", input.quoteDiscount.bps, 10_000);
  if (input.quoteDiscount.kind === "fixed") int("quoteDiscount.cents", input.quoteDiscount.cents);
}

/**
 * The only place arithmetic happens. Pure, deterministic, integer centavos.
 *
 *  1. unit price      cost x (1 + markup), or the manual override
 *  2. line gross      quantity x unit price
 *  3. line discount   percentage of gross
 *  4. subtotal        sum of line nets
 *  5. quote discount  percent or fixed, allocated back across lines (largest remainder)
 *  6. taxable base    discounted nets of taxable lines; zero for an exempt customer
 *  7. VAT             taxable base x rate
 *  8. total           subtotal - discount + VAT
 *  9. deposit         share of the total; balance is the remainder
 * 10. cost, margin    internal only
 */
export function priceQuote(input: PricingInput): PricedQuote {
  try {
    return priceQuoteUnchecked(input);
  } catch (e) {
    if (e instanceof RangeError) throw new PricingError("Amounts are too large to calculate");
    throw e;
  }
}

/** A sum that refuses to silently lose precision. */
function sum(values: number[]): number {
  let acc = 0;
  for (const v of values) {
    acc += v;
    if (!Number.isSafeInteger(acc)) throw new PricingError("Amounts are too large to calculate");
  }
  return acc;
}

function priceQuoteUnchecked(input: PricingInput): PricedQuote {
  validate(input);

  const base = input.lines.map((l) => {
    const unitPriceCents =
      l.unitPriceOverrideCents ?? mulDivHalfUp(l.unitCostCents, 10_000 + l.markupBps, 10_000);
    const grossCents = mulDivHalfUp(l.quantityMilli, unitPriceCents, 1000);
    const lineDiscountCents = mulDivHalfUp(grossCents, l.lineDiscountBps, 10_000);
    return {
      id: l.id,
      unitPriceCents,
      grossCents,
      lineDiscountCents,
      netCents: grossCents - lineDiscountCents,
      costCents: mulDivHalfUp(l.quantityMilli, l.unitCostCents, 1000),
    };
  });

  const subtotalCents = sum(base.map((l) => l.netCents));

  let discountCents = 0;
  if (input.quoteDiscount.kind === "percent") {
    discountCents = mulDivHalfUp(subtotalCents, input.quoteDiscount.bps, 10_000);
  } else if (input.quoteDiscount.kind === "fixed") {
    discountCents = Math.min(input.quoteDiscount.cents, subtotalCents);
  }

  const allocations = allocateProportionally(
    discountCents,
    base.map((l) => l.netCents),
  );

  const lines: PricedLine[] = base.map((l, i) => {
    const taxable = input.lines[i].isTaxable && !input.customerIsVatExempt;
    return {
      ...l,
      allocatedDiscountCents: allocations[i],
      taxableBaseCents: taxable ? l.netCents - allocations[i] : 0,
    };
  });

  const discountedSubtotalCents = subtotalCents - discountCents;
  const taxableBaseCents = sum(lines.map((l) => l.taxableBaseCents));
  const vatCents = mulDivHalfUp(taxableBaseCents, input.vatRateBps, 10_000);
  const totalCents = discountedSubtotalCents + vatCents;
  const depositCents = mulDivHalfUp(totalCents, input.depositPercentBps, 10_000);
  const costCents = sum(lines.map((l) => l.costCents));

  return {
    lines,
    subtotalCents,
    discountCents,
    discountedSubtotalCents,
    taxableBaseCents,
    vatCents,
    totalCents,
    depositCents,
    balanceCents: totalCents - depositCents,
    costCents,
    marginCents: discountedSubtotalCents - costCents,
  };
}

/** Margin as basis points of the discounted subtotal. Integer, signed, derived, never stored. */
export function marginBps(q: Pick<PricedQuote, "marginCents" | "discountedSubtotalCents">): number {
  if (q.discountedSubtotalCents === 0) return 0;
  const magnitude = mulDivHalfUp(Math.abs(q.marginCents), 10_000, q.discountedSubtotalCents);
  return q.marginCents < 0 ? -magnitude : magnitude;
}
