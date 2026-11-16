import { describe, expect, it } from "vitest";
import type { CatalogItemRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "../rows";
import {
  type HeaderDraft, type LineDraft, type QuoteDraftState, addDays, applyCatalogItem, buildQuote, duplicateLine,
  emptyLine, groupLines, moveLine, removeSection, rowsToPricingInput, stateFromRows, todayIn,
} from "./model";
import { priceQuote } from "../pricing/engine";

let n = 0;
const mk = (over: Partial<LineDraft> = {}): LineDraft => ({ ...emptyLine(null, () => `id${++n}`), name: "Item", ...over });
const header = (over: Partial<HeaderDraft> = {}): HeaderDraft => ({
  customerId: "c1", title: "Kitchen", scope: "", terms: "", notes: "", issueDate: "2026-11-16", validUntil: "2026-12-16",
  vatRate: "12", vatExempt: false, depositPercent: "50", discountKind: "percent", discountValue: "5", ...over,
});

/** The same worked example as the pricing engine's tests, typed the way a person would. */
const example = (): QuoteDraftState => ({
  header: header(),
  sections: [],
  lines: [
    mk({ id: "a", name: "Tiling", quantity: "40.5", cost: "300", markup: "25", unit: "sqm" }),
    mk({ id: "b", name: "Carpentry", quantity: "3", cost: "1,800", price: "2500", discount: "10", unit: "day" }),
    mk({ id: "c", name: "Permit", quantity: "1", price: "1000", taxable: false, kind: "fee" }),
  ],
});

describe("buildQuote", () => {
  it("prices what the user typed, to the centavo", () => {
    const b = buildQuote(example());
    expect(b.payload).not.toBeNull();
    expect(b.priced).toMatchObject({
      subtotalCents: 2_293_750, discountCents: 114_688, vatCents: 250_087, totalCents: 2_429_149,
      depositCents: 1_214_575, marginCents: 424_062,
    });
  });

  it("agrees with pricing the payload directly (the server does exactly this)", () => {
    const b = buildQuote(example());
    expect(b.payload!.lines[0]).toMatchObject({ quantityMilli: 40_500, unitCostCents: 30_000, markupBps: 2_500 });
    expect(b.payload!.lines[1]).toMatchObject({ unitPriceOverrideCents: 250_000, lineDiscountBps: 1_000 });
    expect(b.payload!.discount).toEqual({ kind: "percent", bps: 500 });
  });

  it("reports each bad field on its line yet still shows totals for the rest", () => {
    const s = example();
    s.lines[0] = { ...s.lines[0], quantity: "abc", name: " " };
    s.lines[1] = { ...s.lines[1], discount: "150" };
    const b = buildQuote(s);
    expect(b.payload).toBeNull();
    expect(b.lineErrors.a).toMatchObject({ quantity: expect.any(String), name: expect.any(String) });
    expect(b.lineErrors.b.discount).toMatch(/100%/);
    expect(b.priced).not.toBeNull();
  });

  it("validates the header", () => {
    const b = buildQuote({ ...example(), header: header({ customerId: "", title: " ", vatRate: "x", validUntil: "2026-11-01", depositPercent: "101", discountValue: "-1" }) });
    expect(Object.keys(b.headerErrors).sort()).toEqual(["customerId", "depositPercent", "discountValue", "title", "validUntil", "vatRate"]);
  });

  it("treats a blank discount value as no discount and blank money fields as zero", () => {
    const b = buildQuote({ ...example(), header: header({ discountValue: "", depositPercent: "" }) });
    expect(b.payload!.discount).toEqual({ kind: "none" });
    expect(b.priced!.depositCents).toBe(0);
  });

  it("supports a fixed discount", () => {
    const b = buildQuote({ ...example(), header: header({ discountKind: "fixed", discountValue: "1,000.50" }) });
    expect(b.priced!.discountCents).toBe(100_050);
  });

  it("flags amounts too large instead of computing nonsense", () => {
    const s = example();
    s.lines = Array.from({ length: 12 }, (_, i) => mk({ id: `x${i}`, quantity: "100000", price: "100000000" }));
    const b = buildQuote(s);
    expect(b.pricingError).toMatch(/too large/);
    expect(b.payload).toBeNull();
  });

  it("makes a customer-exempt quote VAT-free", () => {
    const b = buildQuote({ ...example(), header: header({ vatExempt: true }) });
    expect(b.priced!.vatCents).toBe(0);
  });

  it("treats a line pointing at a missing section as unsectioned", () => {
    const s = example();
    s.lines[0].sectionId = "gone";
    expect(buildQuote(s).payload!.lines[0].sectionId).toBeNull();
  });
});

describe("line operations", () => {
  const lines = [
    mk({ id: "1", sectionId: null }), mk({ id: "2", sectionId: "s" }), mk({ id: "3", sectionId: null }),
    mk({ id: "4", sectionId: "s" }),
  ];
  it("moves within the same section only", () => {
    expect(moveLine(lines, "1", 1).map((l) => l.id)).toEqual(["3", "2", "1", "4"]);
    expect(moveLine(lines, "2", 1).map((l) => l.id)).toEqual(["1", "4", "3", "2"]);
    expect(moveLine(lines, "1", -1)).toBe(lines);
    expect(moveLine(lines, "4", 1)).toBe(lines);
    expect(moveLine(lines, "nope", 1)).toBe(lines);
  });
  it("duplicates just below with a fresh id", () => {
    const out = duplicateLine(lines, "1", () => "copy");
    expect(out.map((l) => l.id)).toEqual(["1", "copy", "2", "3", "4"]);
    expect(out[1]).toMatchObject({ name: "Item", sectionId: null });
  });
  it("keeps a removed section's lines", () => {
    const out = removeSection({ header: header(), sections: [{ id: "s", title: "S" }], lines }, "s");
    expect(out.sections).toEqual([]);
    expect(out.lines.every((l) => l.sectionId === null)).toBe(true);
  });
  it("groups loose lines first, then sections in order, including empty ones", () => {
    const g = groupLines({ sections: [{ id: "s", title: "S" }, { id: "t", title: "T" }], lines });
    expect(g.map((x) => [x.section?.id ?? null, x.lines.map((l) => l.id)])).toEqual([
      [null, ["1", "3"]], ["s", ["2", "4"]], ["t", []],
    ]);
    expect(groupLines({ sections: [], lines: [] })).toEqual([{ section: null, lines: [] }]);
  });
});

describe("applyCatalogItem", () => {
  const item = (over: Partial<CatalogItemRow> = {}): CatalogItemRow => ({
    id: "cat1", org_id: "o", sku: null, name: "Floor tile", description: "Porcelain", kind: "material", unit: "sqm",
    default_cost_cents: 30_000, default_markup_bps: 2_500, default_price_cents: 37_500, is_taxable: true,
    category: null, is_active: true, ...over,
  });
  it("copies the item and lets a formula price keep following cost + markup", () => {
    const l = applyCatalogItem(mk({ quantity: "" }), item());
    expect(l).toMatchObject({ catalogItemId: "cat1", name: "Floor tile", unit: "sqm", cost: "300.00", markup: "25", price: "", quantity: "1" });
  });
  it("keeps a hand-set catalog price as an override", () => {
    expect(applyCatalogItem(mk(), item({ default_price_cents: 40_000 })).price).toBe("400.00");
  });
  it("keeps the quantity already typed", () => {
    expect(applyCatalogItem(mk({ quantity: "7" }), item()).quantity).toBe("7");
  });
});

describe("dates", () => {
  it("adds days across month and year ends and leap days", () => {
    expect(addDays("2026-11-16", 30)).toBe("2026-12-16");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("reads today in the business's time zone", () => {
    const t = new Date("2026-11-16T20:30:00Z");
    expect(todayIn("Asia/Manila", t)).toBe("2026-11-17");
    expect(todayIn("America/Los_Angeles", t)).toBe("2026-11-16");
    expect(todayIn("Not/AZone", t)).toBe("2026-11-16");
  });
});

describe("rows <-> state", () => {
  const quote: QuoteRow = {
    id: "q", org_id: "o", customer_id: "c1", root_quote_id: "q", quote_number: null, version: 1, status: "draft",
    title: "Kitchen", scope: null, terms: "50% down", notes: null, issue_date: "2026-11-16", valid_until: "2026-12-16",
    vat_rate_bps: 1200, customer_is_vat_exempt: false, deposit_percent_bps: 5000, discount_kind: "percent",
    discount_value: 500, subtotal_cents: 0, discount_cents: 0, vat_cents: 0, total_cents: 0, deposit_cents: 0,
    sent_at: null, responded_at: null, created_at: "", updated_at: "",
  };
  const row = (over: Partial<QuoteLineRow>): QuoteLineRow => ({
    id: "l", org_id: "o", quote_id: "q", section_id: null, position: 0, catalog_item_id: null, name: "Tiling",
    description: null, kind: "service", unit: "sqm", quantity_milli: 40_500, unit_cost_cents: 30_000, markup_bps: 2_500,
    unit_price_override_cents: null, unit_price_cents: 37_500, line_discount_bps: 0, is_taxable: true, ...over,
  });
  const sections: QuoteSectionRow[] = [{ id: "s", org_id: "o", quote_id: "q", position: 0, title: "Floors" }];
  const lines = [row({ id: "l2", position: 1, name: "Grout", unit_price_override_cents: 5_000 }), row({ id: "l1", position: 0, section_id: "s" })];

  it("loads sorted, formatted for editing", () => {
    const s = stateFromRows(quote, sections, lines);
    expect(s.lines.map((l) => l.id)).toEqual(["l1", "l2"]);
    expect(s.lines[0]).toMatchObject({ quantity: "40.5", cost: "300.00", markup: "25", price: "", sectionId: "s" });
    expect(s.lines[1].price).toBe("50.00");
    expect(s.header).toMatchObject({ vatRate: "12", depositPercent: "50", discountKind: "percent", discountValue: "5" });
  });

  it("round-trips: editing nothing and re-parsing reproduces the stored pricing inputs", () => {
    const s = stateFromRows(quote, sections, lines);
    const built = buildQuote(s);
    expect(built.payload).not.toBeNull();
    const fromRows = priceQuote(rowsToPricingInput(quote, lines));
    expect(built.priced).toEqual(fromRows);
  });
});
