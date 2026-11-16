import { describe, expect, it } from "vitest";
import { CATALOG_KINDS, UNITS } from "../constants";
import { LIMITS } from "../pricing/engine";
import { resolvePrice } from "../pricing/catalog-price";
import { SAMPLE_CATALOGS, sampleCatalog } from "./catalogs";

describe("sample price lists", () => {
  it("has the three industries", () => {
    expect(SAMPLE_CATALOGS.map((c) => c.id)).toEqual(["renovation", "events", "aircon"]);
    expect(sampleCatalog("nope")).toBeUndefined();
  });
  for (const c of SAMPLE_CATALOGS) {
    describe(c.label, () => {
      it("has valid kinds, units and sensible money", () => {
        expect(c.items.length).toBeGreaterThanOrEqual(10);
        for (const i of c.items) {
          expect(CATALOG_KINDS).toContain(i.kind);
          expect(UNITS).toContain(i.unit);
          expect(Number.isInteger(i.costCents) && i.costCents > 0 && i.costCents <= LIMITS.maxUnitCents).toBe(true);
          expect(Number.isInteger(i.markupBps) && i.markupBps >= 0 && i.markupBps <= LIMITS.maxMarkupBps).toBe(true);
          expect(resolvePrice({ costCents: i.costCents, markupBps: i.markupBps, priceCents: null })).toBeGreaterThan(i.costCents);
          expect(i.name.length).toBeLessThanOrEqual(200);
          expect((i.description ?? "").length).toBeLessThanOrEqual(1000);
        }
      });
      it("has no duplicate names, ignoring case", () => {
        const names = c.items.map((i) => i.name.trim().toLowerCase());
        expect(new Set(names).size).toBe(names.length);
      });
    });
  }
});
