/**
 * CSV for Excel and Google Sheets. Two things matter beyond quoting:
 *  - a cell starting with = + - @ (or a tab/CR) is a formula to a spreadsheet, so customer-typed text is
 *    prefixed with an apostrophe to keep it as text;
 *  - a byte-order mark lets Excel read UTF-8 (peso signs, accents) correctly.
 */
export type Cell = string | number | null | undefined;

const DANGEROUS = /^[=+\-@\t\r]/;

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? String(value) : value;
  // Real numbers are safe as they are; only text can smuggle in a formula.
  if (typeof value === "string" && DANGEROUS.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Whole centavos as a plain decimal ("1234.50"): no symbol or commas, so a spreadsheet can sum it. */
export function pesos(cents: number | string | bigint | null | undefined): string {
  if (cents === null || cents === undefined || cents === "") return "";
  const c = BigInt(cents);
  const neg = c < 0n;
  const abs = neg ? -c : c;
  return `${neg ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}
