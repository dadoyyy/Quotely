export type QuoteDiscount =
  | { kind: "none" }
  | { kind: "percent"; bps: number }
  | { kind: "fixed"; cents: number };

export interface PricingLineInput {
  id: string;
  /** Quantity in thousandths: 40.5 sqm is 40500. */
  quantityMilli: number;
  unitCostCents: number;
  /** Markup over cost in basis points: 2500 is 25%. Ignored when an override is set. */
  markupBps: number;
  /** A manually typed selling price wins over cost + markup. */
  unitPriceOverrideCents?: number | null;
  lineDiscountBps: number;
  isTaxable: boolean;
}

export interface PricingInput {
  lines: PricingLineInput[];
  quoteDiscount: QuoteDiscount;
  vatRateBps: number;
  customerIsVatExempt: boolean;
  depositPercentBps: number;
}

export interface PricedLine {
  id: string;
  unitPriceCents: number;
  /** quantity x unit price, before any discount. */
  grossCents: number;
  lineDiscountCents: number;
  /** gross minus the line discount. */
  netCents: number;
  /** This line's share of the quote-level discount. */
  allocatedDiscountCents: number;
  /** Net minus allocated discount, or 0 if the line is untaxed or the customer is exempt. */
  taxableBaseCents: number;
  /** Internal only. Must never reach the customer. */
  costCents: number;
}

export interface PricedQuote {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  discountedSubtotalCents: number;
  taxableBaseCents: number;
  vatCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  /** Internal only. */
  costCents: number;
  /** Internal only. May be negative. */
  marginCents: number;
}
