import { describe, expect, it } from "vitest";
import { priceQuote } from "../pricing/engine";
import type { CustomerRow, OrganizationRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "../rows";
import { rowsToPricingInput } from "./model";
import { buildSnapshot, snapshotSchema } from "./snapshot";

const SECRET_NOTE = "INTERNAL-SENTINEL-NOTE";
const SECRET_COST = 987_654; // centavos, chosen so it appears nowhere by coincidence

const quote: QuoteRow = {
  id: "q", org_id: "ORG-ID-SENTINEL", customer_id: "CUSTOMER-ID-SENTINEL", root_quote_id: "q", quote_number: null, version: 2,
  status: "draft", title: "Kitchen", scope: "Full kitchen", terms: "50% down", notes: SECRET_NOTE, issue_date: "2026-11-16",
  valid_until: "2026-12-16", vat_rate_bps: 1200, customer_is_vat_exempt: false, deposit_percent_bps: 5000,
  discount_kind: "percent", discount_value: 500, subtotal_cents: 0, discount_cents: 0, vat_cents: 0, total_cents: 0,
  deposit_cents: 0, sent_at: null, responded_at: null, created_at: "", updated_at: "",
};
const sections: QuoteSectionRow[] = [{ id: "s2", org_id: "o", quote_id: "q", position: 1, title: "Second" }, { id: "s1", org_id: "o", quote_id: "q", position: 0, title: "First" }];
const line = (over: Partial<QuoteLineRow>): QuoteLineRow => ({
  id: "l", org_id: "o", quote_id: "q", section_id: null, position: 0, catalog_item_id: "CATALOG-SENTINEL", name: "Tiling",
  description: "Porcelain", kind: "material", unit: "sqm", quantity_milli: 40_500, unit_cost_cents: SECRET_COST,
  markup_bps: 3_333, unit_price_override_cents: null, unit_price_cents: 0, line_discount_bps: 0, is_taxable: true, ...over,
});
const lines = [
  line({ id: "b", position: 1, name: "Grout", unit_price_override_cents: 5_000, section_id: "s2" }),
  line({ id: "a", position: 0, section_id: "s1" }),
];
const customer = { id: "CUSTOMER-ID-SENTINEL", org_id: "ORG-ID-SENTINEL", name: "Maria Cruz", company: null, email: "m@x.ph", phone: null, address: null, tin: null, is_vat_exempt: false, notes: "CUSTOMER-NOTE-SENTINEL", created_at: "" } as CustomerRow;
const org = {
  id: "ORG-ID-SENTINEL", name: "Acme", logo_url: null, address: "Manila", email: "a@acme.ph", phone: null, tin: "123", brand_color: "#112233",
  timezone: "Asia/Manila", vat_rate_bps: 1200, default_validity_days: 30, default_terms: null, quote_number_prefix: "Q",
  invoice_number_prefix: "INV", ai_enabled: true,
} as OrganizationRow;

describe("customer snapshot", () => {
  const snap = buildSnapshot({ quote, sections, lines, customer, org });
  const text = JSON.stringify(snap);

  it("never contains anything internal", () => {
    for (const secret of [SECRET_NOTE, String(SECRET_COST), "ORG-ID-SENTINEL", "CUSTOMER-ID-SENTINEL", "CATALOG-SENTINEL", "CUSTOMER-NOTE-SENTINEL", "3333"]) {
      expect(text, secret).not.toContain(secret);
    }
    const keys: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
    };
    walk(snap);
    expect(keys.filter((k) => /cost|markup|margin|notes?$|org|created|catalog|aiEnabled|timezone/i.test(k))).toEqual([]);
  });

  it("matches the pricing engine to the centavo", () => {
    const priced = priceQuote(rowsToPricingInput(quote, lines));
    expect(snap.totals).toMatchObject({
      subtotalCents: priced.subtotalCents, vatCents: priced.vatCents, totalCents: priced.totalCents,
      depositCents: priced.depositCents, balanceCents: priced.balanceCents,
    });
    expect(snap.totals.discount).toEqual({ kind: "percent", value: 500, cents: priced.discountCents });
    // line amounts add up to the subtotal
    expect(snap.lines.reduce((s, l) => s + l.netCents, 0)).toBe(snap.totals.subtotalCents);
  });

  it("keeps the order the user arranged, and carries the revision", () => {
    expect(snap.lines.map((l) => l.id)).toEqual(["a", "b"]);
    expect(snap.sections.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(snap.quote.revision).toBe(2);
  });

  it("leaves the number and send time to the database", () => {
    expect(snap.quote.number).toBeNull();
    expect(snap.quote.sentAt).toBeNull();
  });

  it("round-trips through its schema, and rejects a malformed one", () => {
    expect(snapshotSchema.parse(JSON.parse(text))).toEqual(snap);
    expect(snapshotSchema.safeParse({ ...snap, version: 2 }).success).toBe(false);
  });
});
