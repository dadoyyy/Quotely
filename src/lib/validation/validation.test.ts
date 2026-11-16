import { describe, expect, it } from "vitest";
import * as schema from "../../db/schema";
import { CATALOG_KINDS, UNITS } from "../constants";
import { signupSchema } from "./auth";
import { catalogItemSchema } from "./catalog";
import { customerSchema } from "./customer";
import { parseForm } from "./form";
import { settingsSchema } from "./settings";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

describe("option lists", () => {
  it("match the database enums exactly", () => {
    expect([...CATALOG_KINDS]).toEqual(schema.catalogKind.enumValues);
    expect([...UNITS]).toEqual(schema.unitOfMeasure.enumValues);
  });
});

describe("customerSchema", () => {
  it("accepts a minimal customer and nulls the blanks", () => {
    const r = parseForm(customerSchema, form({ name: "  Juan dela Cruz ", email: "", phone: "" }));
    expect(r).toEqual({
      ok: true,
      data: {
        name: "Juan dela Cruz", company: null, email: null, phone: null,
        address: null, tin: null, isVatExempt: false, notes: null,
      },
    });
  });

  it("reads the VAT-exempt checkbox", () => {
    const r = parseForm(customerSchema, form({ name: "Acme", isVatExempt: "on" }));
    expect(r.ok && r.data.isVatExempt).toBe(true);
  });

  it("reports the name and email problems by field", () => {
    const r = parseForm(customerSchema, form({ name: " ", email: "not-an-email" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.name).toBe("Name is required");
      expect(r.fieldErrors.email).toBe("Enter a valid email address");
    }
  });
});

describe("catalogItemSchema", () => {
  const base = { name: "Floor tiling", kind: "labor", unit: "sqm" };

  it("turns typed amounts into centavos and basis points", () => {
    const r = parseForm(catalogItemSchema, form({ ...base, costCents: "300", markupBps: "25", priceCents: "", isTaxable: "on", isActive: "on" }));
    expect(r.ok && r.data).toMatchObject({
      costCents: 30_000, markupBps: 2_500, priceCents: null, isTaxable: true, isActive: true, category: null,
    });
  });

  it("treats blank cost and markup as zero", () => {
    const r = parseForm(catalogItemSchema, form({ ...base, costCents: "", markupBps: "" }));
    expect(r.ok && r.data).toMatchObject({ costCents: 0, markupBps: 0, priceCents: null, isTaxable: false });
  });

  it("keeps a typed selling price", () => {
    const r = parseForm(catalogItemSchema, form({ ...base, costCents: "", markupBps: "", priceCents: "2,500" }));
    expect(r.ok && r.data.priceCents).toBe(250_000);
  });

  it("rejects bad amounts, units and kinds with field messages", () => {
    const r = parseForm(catalogItemSchema, form({ name: "x", kind: "gizmo", unit: "parsec", costCents: "abc", markupBps: "-3" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(["costCents", "kind", "markupBps", "unit"]);
      expect(r.fieldErrors.costCents).toBe("Enter an amount like 1,250.50");
    }
  });
});

describe("settingsSchema", () => {
  const ok = {
    name: "Acme Renovations", vatRateBps: "12", defaultValidityDays: "30",
    quoteNumberPrefix: "quo", invoiceNumberPrefix: "inv",
  };

  it("normalizes prefixes and the VAT rate", () => {
    const r = parseForm(settingsSchema, form(ok));
    expect(r.ok && r.data).toMatchObject({ vatRateBps: 1_200, defaultValidityDays: 30, quoteNumberPrefix: "QUO", invoiceNumberPrefix: "INV" });
  });

  it("rejects an impossible VAT rate, validity and prefix", () => {
    const r = parseForm(settingsSchema, form({ ...ok, vatRateBps: "120", defaultValidityDays: "0", quoteNumberPrefix: "too long prefix!" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["defaultValidityDays", "quoteNumberPrefix", "vatRateBps"]);
  });
});

describe("signupSchema password rules", () => {
  const ok = { email: "a@b.co", password: "Str0ng!pass", confirmPassword: "Str0ng!pass" };
  const msg = (v: object) => {
    const r = signupSchema.safeParse(v);
    return r.success ? null : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
  };
  it("accepts a password meeting every rule when confirmed", () => {
    expect(signupSchema.safeParse(ok).success).toBe(true);
  });
  it.each([
    ["Sh0rt!", "8 characters"],
    ["alllowercase1!", "uppercase"],
    ["ALLUPPERCASE1!", "lowercase"],
    ["NoNumbers!!", "number"],
    ["NoSymbol123", "symbol"],
  ])("rejects %s", (password, word) => {
    const e = msg({ ...ok, password, confirmPassword: password });
    expect(e?.password).toContain(word);
  });
  it("rejects a confirmation that differs", () => {
    expect(msg({ ...ok, confirmPassword: "Str0ng!pasS" })?.confirmPassword).toBe("Passwords don't match");
  });
  it("rejects a missing confirmation", () => {
    expect(msg({ email: ok.email, password: ok.password })?.confirmPassword).toBeDefined();
  });
});
