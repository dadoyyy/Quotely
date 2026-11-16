import { describe, expect, it } from "vitest";
import { generateToken, hashToken, looksLikeToken } from "./share-token";

describe("share tokens", () => {
  it("are long, URL-safe and unique", () => {
    const tokens = new Set(Array.from({ length: 500 }, generateToken));
    expect(tokens.size).toBe(500);
    for (const t of tokens) expect(looksLikeToken(t)).toBe(true);
  });
  it("hash to a stable 64-character digest that is not the token", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken(t)).not.toBe(hashToken(generateToken()));
  });
  it("reject junk before it reaches the database", () => {
    for (const bad of ["", "short", "a".repeat(44), `${"a".repeat(42)}!`, null, undefined, 42, "../etc/passwd"]) {
      expect(looksLikeToken(bad)).toBe(false);
    }
  });
});
