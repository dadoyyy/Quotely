import { mulDivHalfUp } from "../money";

/** A catalog item's default selling price: a typed price wins, otherwise cost plus markup. */
export function resolvePrice(d: { costCents: number; markupBps: number; priceCents: number | null }): number {
  return d.priceCents ?? mulDivHalfUp(d.costCents, 10_000 + d.markupBps, 10_000);
}
