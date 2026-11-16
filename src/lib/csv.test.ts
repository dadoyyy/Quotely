import { describe, expect, it } from "vitest";
import { csvCell, pesos, toCsv } from "./csv";

describe("csv", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("x\ny")).toBe('"x\ny"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });
  it("neutralises spreadsheet formulas in text but leaves real numbers alone", () => {
    for (const bad of ["=HYPERLINK(\"x\")", "+1", "-2+3", "@SUM(A1)", "\tcmd"]) expect(csvCell(bad).replace(/^"/, "")).toMatch(/^'/);
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("Juan - Tile")).toBe("Juan - Tile");
  });
  it("starts with a BOM and uses CRLF", () => {
    const out = toCsv(["a", "b"], [["1", "x,y"]]);
    expect(out.startsWith("﻿a,b\r\n")).toBe(true);
    expect(out.endsWith('1,"x,y"\r\n')).toBe(true);
  });
  it("formats centavos exactly", () => {
    expect(pesos(123456)).toBe("1234.56");
    expect(pesos("5")).toBe("0.05");
    expect(pesos(0)).toBe("0.00");
    expect(pesos(-250)).toBe("-2.50");
    expect(pesos("99999999999999999")).toBe("999999999999999.99");
    expect(pesos(null)).toBe("");
  });
});
