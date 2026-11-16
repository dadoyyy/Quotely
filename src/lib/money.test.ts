import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { allocateProportionally, cents, mulDivHalfUp } from "./money";

describe("mulDivHalfUp", () => {
  it("rounds half up", () => {
    expect(mulDivHalfUp(1, 1, 2)).toBe(1); // 0.5 -> 1
    expect(mulDivHalfUp(1, 1, 3)).toBe(0); // 0.333 -> 0
    expect(mulDivHalfUp(2, 1, 3)).toBe(1); // 0.667 -> 1
    expect(mulDivHalfUp(5, 1, 10)).toBe(1);
    expect(mulDivHalfUp(4, 1, 10)).toBe(0);
    expect(mulDivHalfUp(114687500, 1, 1000)).toBe(114688);
  });

  it("is exact where doubles would not be", () => {
    // 9_007_199_254_740_991 is the largest safe integer; a double product would lose bits.
    expect(mulDivHalfUp(3_000_000_000, 3_000_000_000, 3_000_000_000)).toBe(3_000_000_000);
  });

  it("rejects negatives, fractions and a zero divisor", () => {
    expect(() => mulDivHalfUp(-1, 1, 1)).toThrow(RangeError);
    expect(() => mulDivHalfUp(1.5, 1, 1)).toThrow(RangeError);
    expect(() => mulDivHalfUp(1, 1, 0)).toThrow(RangeError);
  });
});

describe("cents", () => {
  it("only accepts safe integers", () => {
    expect(cents(12_345)).toBe(12_345);
    expect(() => cents(1.5)).toThrow(RangeError);
    expect(() => cents(Number.NaN)).toThrow(RangeError);
  });
});

describe("allocateProportionally", () => {
  it("sums to the total exactly, giving leftovers to the largest remainders", () => {
    expect(allocateProportionally(114688, [1518750, 675000, 100000])).toEqual([75938, 33750, 5000]);
    expect(allocateProportionally(1, [1, 1, 1])).toEqual([1, 0, 0]);
    expect(allocateProportionally(0, [5, 5])).toEqual([0, 0]);
    expect(allocateProportionally(10, [0, 0])).toEqual([0, 0].map(() => 0));
  });

  it("never loses or invents a centavo, and never exceeds a weight", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1_000_000_000 }), { minLength: 1, maxLength: 15 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (weights, fraction) => {
          const sum = weights.reduce((a, b) => a + b, 0);
          const total = mulDivHalfUp(sum, Math.floor(fraction * 10_000), 10_000);
          const parts = allocateProportionally(total, weights);
          expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
          parts.forEach((p, i) => expect(p).toBeLessThanOrEqual(weights[i]));
        },
      ),
    );
  });
});
