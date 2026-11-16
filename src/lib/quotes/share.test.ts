import { describe, expect, it } from "vitest";
import { isLikelyBot, linkExpiry, safeBrandColor } from "./share";

describe("share helpers", () => {
  it("expires a link 30 days after the quote does", () => {
    expect(linkExpiry("2026-12-16")).toBe("2027-01-15T23:59:59Z");
    expect(linkExpiry(null, new Date("2026-01-01T00:00:00Z"))).toBe("2026-04-01T00:00:00.000Z");
  });
  it("lets only a plain hex colour into a style", () => {
    expect(safeBrandColor("#1a2B3c")).toBe("#1a2B3c");
    for (const bad of ["red", "#fff", "#12345g", "#123456; background:url(x)", "url(javascript:1)", ""]) {
      expect(safeBrandColor(bad)).toBe("#171717");
    }
  });
  it("does not count scanners as customer views", () => {
    expect(isLikelyBot(null)).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelyBot("WhatsApp/2.23 A")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
    expect(isLikelyBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36")).toBe(false);
  });
});
