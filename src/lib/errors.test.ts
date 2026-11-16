import { describe, expect, it, vi } from "vitest";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("explains permission problems, however Postgres words them", () => {
    expect(friendlyError({ code: "42501" })).toMatch(/permission/);
    expect(friendlyError({ message: 'new row violates row-level security policy for table "customers"' })).toMatch(/permission/);
    expect(friendlyError({ message: "permission denied for table quote_events" })).toMatch(/permission/);
  });

  it("explains references and duplicates using the subject", () => {
    expect(friendlyError({ code: "23503" }, "customer")).toBe("This customer is still in use, so it can't be removed.");
    expect(friendlyError({ code: "23505" }, "customer")).toBe("That customer already exists.");
  });

  it("never leaks raw database text for unknown errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = friendlyError({ code: "XX000", message: 'relation "secret_table" does not exist' });
    expect(out).toBe("Something went wrong. Please try again.");
    expect(out).not.toMatch(/secret_table/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
