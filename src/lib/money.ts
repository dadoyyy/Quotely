/**
 * Money is an integer count of centavos. No floating point ever enters pricing.
 * Every multiplication-then-division goes through mulDivHalfUp, which is exact
 * (BigInt) and rounds half up. Math.round is banned in this path by ESLint.
 */
export type Cents = number & { readonly __brand: "Cents" };

export function cents(n: number): Cents {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Cents must be a safe integer, got ${n}`);
  }
  return n as Cents;
}

function assertNonNegativeInt(name: string, n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer, got ${n}`);
  }
}

/** round-half-up(a * b / d) computed exactly. a, b >= 0 and d > 0, all integers. */
export function mulDivHalfUp(a: number, b: number, d: number): number {
  assertNonNegativeInt("a", a);
  assertNonNegativeInt("b", b);
  if (!Number.isSafeInteger(d) || d <= 0) {
    throw new RangeError(`d must be a positive safe integer, got ${d}`);
  }
  const D = BigInt(d);
  const result = (2n * BigInt(a) * BigInt(b) + D) / (2n * D);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Result exceeds the safe integer range");
  }
  return Number(result);
}

/**
 * Split `total` across `weights` proportionally. Largest remainder method, so
 * the parts always sum to `total` exactly. Ties go to the earlier line.
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  assertNonNegativeInt("total", total);
  weights.forEach((w, i) => assertNonNegativeInt(`weights[${i}]`, w));
  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  if (total > sum) {
    throw new RangeError("Cannot allocate more than the sum of the weights");
  }
  const T = BigInt(total);
  const S = BigInt(sum);
  const parts = weights.map((w) => {
    const num = T * BigInt(w);
    return { q: num / S, r: num % S };
  });
  const leftover = Number(T - parts.reduce((acc, p) => acc + p.q, 0n));
  const order = parts
    .map((_, i) => i)
    .sort((i, j) => {
      const a = parts[i].r;
      const b = parts[j].r;
      if (a === b) return i - j;
      return a > b ? -1 : 1;
    });
  const out = parts.map((p) => Number(p.q));
  for (let k = 0; k < leftover; k++) out[order[k]] += 1;
  return out;
}
