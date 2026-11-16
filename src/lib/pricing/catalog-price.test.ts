import { describe, expect, it } from "vitest";
import { resolvePrice } from "./catalog-price";

describe("resolvePrice", () => {
  it("adds markup to cost", () => {
    expect(resolvePrice({ costCents: 30_000, markupBps: 2_500, priceCents: null })).toBe(37_500);
  });

  it("rounds half up", () => {
    // 1.50 cost at 10% markup is 1.65 exactly; 0.05 at 10% is 0.055 -> 0.06
    expect(resolvePrice({ costCents: 150, markupBps: 1_000, priceCents: null })).toBe(165);
    expect(resolvePrice({ costCents: 5, markupBps: 1_000, priceCents: null })).toBe(6);
  });

  it("lets a typed price win over cost and markup", () => {
    expect(resolvePrice({ costCents: 30_000, markupBps: 2_500, priceCents: 99_900 })).toBe(99_900);
    expect(resolvePrice({ costCents: 0, markupBps: 0, priceCents: 0 })).toBe(0);
  });

  it("is zero when nothing is set", () => {
    expect(resolvePrice({ costCents: 0, markupBps: 0, priceCents: null })).toBe(0);
  });
});
