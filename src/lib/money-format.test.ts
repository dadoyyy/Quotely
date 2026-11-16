import { describe, expect, it } from "vitest";
import {
  bpsToInput,
  centsToInput,
  formatBps,
  formatCents,
  parsePercentToBps,
  parsePesosToCents,
} from "./money-format";

describe("parsePesosToCents", () => {
  it.each([
    ["1250", 125_000],
    ["1,250.50", 125_050],
    ["₱1,250.5", 125_050],
    ["PHP 99", 9_900],
    ["  0.07 ", 7],
    [".5", 50],
    ["12.", 1_200],
    ["0", 0],
  ])("reads %j as %i centavos", (input, cents) => {
    expect(parsePesosToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1.234", "1e3", "12,50,0x", "1.2.3", "₱", "∞"])("rejects %j", (input) => {
    expect(parsePesosToCents(input)).toBeNull();
  });

  it("stays exact on large amounts a double could not hold", () => {
    expect(parsePesosToCents("90,071,992,547,409.91")).toBe(9_007_199_254_740_991);
    expect(parsePesosToCents("90,071,992,547,409.92")).toBeNull(); // one centavo past the safe range
  });
});

describe("formatCents", () => {
  it("formats with grouping and two decimals", () => {
    expect(formatCents(0)).toBe("₱0.00");
    expect(formatCents(5)).toBe("₱0.05");
    expect(formatCents(125_050)).toBe("₱1,250.50");
    expect(formatCents(2_429_149)).toBe("₱24,291.49");
    expect(formatCents(-2_000)).toBe("-₱20.00");
    expect(formatCents(9_007_199_254_740_991)).toBe("₱90,071,992,547,409.91");
  });

  it("refuses a fractional centavo rather than guessing", () => {
    expect(() => formatCents(1.5)).toThrow(RangeError);
  });
});

describe("percentages", () => {
  it.each([
    ["12", 1_200],
    ["12.5", 1_250],
    ["12.5%", 1_250],
    ["0.05", 5],
    [" 100 % ", 10_000],
    [".5", 50],
  ])("reads %j as %i bps", (input, bps) => {
    expect(parsePercentToBps(input)).toBe(bps);
  });

  it.each(["", "abc", "-1", "1.234", "1,5"])("rejects %j", (input) => {
    expect(parsePercentToBps(input)).toBeNull();
  });

  it("formats basis points back", () => {
    expect(formatBps(1_200)).toBe("12%");
    expect(formatBps(1_250)).toBe("12.5%");
    expect(formatBps(5)).toBe("0.05%");
    expect(formatBps(0)).toBe("0%");
    expect(bpsToInput(1_250)).toBe("12.5");
  });
});

describe("round trips", () => {
  it("pre-fills inputs that parse back to the same value", () => {
    for (const cents of [0, 5, 100, 125_050, 9_999_999]) {
      expect(parsePesosToCents(centsToInput(cents))).toBe(cents);
    }
    for (const bps of [0, 5, 50, 1_200, 1_250, 10_000]) {
      expect(parsePercentToBps(bpsToInput(bps))).toBe(bps);
    }
  });
});
