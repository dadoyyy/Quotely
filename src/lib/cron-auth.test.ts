import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

const secret = "a-long-enough-secret-value";
describe("cron authorization", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
    for (const bad of [null, "", secret, `bearer ${secret}`, `Bearer ${secret}x`, "Bearer wrong-secret-of-equal-len!"]) {
      expect(isAuthorizedCron(bad, secret), String(bad)).toBe(false);
    }
  });
  it("is closed when no usable secret is configured", () => {
    expect(isAuthorizedCron("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer short", "short")).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
  });
});
