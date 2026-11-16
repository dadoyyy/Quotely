import { describe, expect, it } from "vitest";
import { milliToInput, parseQuantityToMilli } from "./money-format";

describe("quantity", () => {
  it("parses up to three decimals", () => {
    expect(parseQuantityToMilli("2.5")).toBe(2500);
    expect(parseQuantityToMilli("40.125")).toBe(40_125);
    expect(parseQuantityToMilli("1,000")).toBe(1_000_000);
    expect(parseQuantityToMilli(".25")).toBe(250);
    expect(parseQuantityToMilli(" 3 ")).toBe(3000);
  });
  it("rejects zero, negatives, junk, extra decimals and absurd sizes", () => {
    for (const bad of ["", "0", "0.000", "-1", "abc", "1.2345", "1e3", "100000.001", "9".repeat(20)]) {
      expect(parseQuantityToMilli(bad), bad).toBeNull();
    }
    expect(parseQuantityToMilli("100000")).toBe(100_000_000);
  });
  it("round-trips", () => {
    for (const m of [1, 250, 1000, 2500, 40_125, 100_000_000]) expect(parseQuantityToMilli(milliToInput(m))).toBe(m);
    expect(milliToInput(2500)).toBe("2.5");
    expect(milliToInput(1000)).toBe("1");
  });
});
