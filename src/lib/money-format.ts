/**
 * Parsing and formatting for money and percentages typed by people.
 * Everything is exact integer math; no floats ever hold an amount.
 */

/** "1,250.50", "₱1250", "PHP 99" -> centavos. Null when it is not a plain non-negative amount. */
export function parsePesosToCents(input: string): number | null {
  const s = input.trim().replace(/^(php|₱)\s*/i, "").replace(/[,\s]/g, "");
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(s)) return null;
  const [whole = "", frac = ""] = s.split(".");
  const cents = BigInt(whole || "0") * 100n + BigInt(frac.padEnd(2, "0") || "0");
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(cents);
}

/** 125050 -> "₱1,250.50". Handles negatives (a margin can be below zero). */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError(`Not a whole number of centavos: ${cents}`);
  const abs = BigInt(Math.abs(cents));
  const pesos = (abs / 100n).toLocaleString("en-US");
  const centavos = (abs % 100n).toString().padStart(2, "0");
  return `${cents < 0 ? "-" : ""}₱${pesos}.${centavos}`;
}

/** "12.5" or "12.5%" -> 1250 basis points. Up to two decimals. */
export function parsePercentToBps(input: string): number | null {
  const s = input.trim().replace(/%$/, "").trim();
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(s)) return null;
  const [whole = "", frac = ""] = s.split(".");
  const bps = Number(whole || "0") * 100 + Number(frac.padEnd(2, "0") || "0");
  return Number.isSafeInteger(bps) ? bps : null;
}

/** 1250 -> "12.5%", 1200 -> "12%", 5 -> "0.05%". */
export function formatBps(bps: number): string {
  if (!Number.isSafeInteger(bps) || bps < 0) throw new RangeError(`Not valid basis points: ${bps}`);
  const whole = Math.floor(bps / 100);
  const frac = String(bps % 100).padStart(2, "0").replace(/0+$/, "");
  return `${whole}${frac ? `.${frac}` : ""}%`;
}

/** 1250 -> "12.5", for pre-filling a percent input. */
export function bpsToInput(bps: number): string {
  return formatBps(bps).replace(/%$/, "");
}

/** 125050 -> "1250.50", for pre-filling an amount input. */
export function centsToInput(cents: number): string {
  return formatCents(cents).replace(/^(-?)₱/, "$1").replace(/,/g, "");
}
