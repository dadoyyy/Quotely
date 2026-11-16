import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  it("allows paths on this site, with queries", () => {
    expect(safeNext("/app/customers")).toBe("/app/customers");
    expect(safeNext("/app/customers?q=cruz")).toBe("/app/customers?q=cruz");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "app/customers",
    "/ok\r\nSet-Cookie: x=1",
    "",
  ])("falls back for %j", (value) => {
    expect(safeNext(value)).toBe("/app");
  });

  it("falls back for non-strings and honours a custom fallback", () => {
    expect(safeNext(undefined)).toBe("/app");
    expect(safeNext(null, "/login")).toBe("/login");
    expect(safeNext(["/a"])).toBe("/app");
  });
});
