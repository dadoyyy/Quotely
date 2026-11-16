import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUSTOMER, LINE, ORG, QUOTE, U, as, closeDb, count, db, denied, id, setupDb } from "./helpers";

/** Phase 2: the atomic draft save and the draft-only delete guard. */

beforeAll(async () => {
  await setupDb();
  await db.exec(`
    insert into catalog_items (id, org_id, name) values
      ('${id(140)}', '${ORG.A}', 'Floor tile'), ('${id(240)}', '${ORG.B}', 'Banquet chairs');
  `);
});
afterAll(closeDb);

const SECTION = id(150);
const header = (over: Record<string, unknown> = {}) => ({
  customer_id: CUSTOMER.A, title: "Kitchen remodel", scope: "Full kitchen", terms: "50% down", notes: "",
  issue_date: "2026-11-16", valid_until: "2026-12-16", vat_rate_bps: 1200, customer_is_vat_exempt: false,
  deposit_percent_bps: 5000, discount_kind: "none", discount_value: 0, subtotal_cents: 100000,
  discount_cents: 0, vat_cents: 12000, total_cents: 112000, deposit_cents: 56000, ...over,
});
const sections = [{ id: SECTION, position: 0, title: "Tiling" }];
const line = (n: number, over: Record<string, unknown> = {}) => ({
  id: id(160 + n), section_id: SECTION, position: n, catalog_item_id: null, name: `Line ${n}`, description: "",
  kind: "service", unit: "sqm", quantity_milli: 2500, unit_cost_cents: 40000, markup_bps: 2500,
  unit_price_override_cents: null, unit_price_cents: 50000, line_discount_bps: 0, is_taxable: true, ...over,
});

const save = (q: Parameters<Parameters<typeof as>[1]>[0], quote = QUOTE.A, h = header(), s: unknown[] = sections, l: unknown[] = [line(1), line(2)]) =>
  q.query(`select save_quote_draft($1, $2::jsonb, $3::jsonb, $4::jsonb)`, [quote, JSON.stringify(h), JSON.stringify(s), JSON.stringify(l)]);

describe("save_quote_draft", () => {
  it("writes the header, sections and lines together", async () => {
    await as(U.staffA, async (q) => {
      await save(q);
      const r = await q.query<{ title: string; total_cents: number; deposit_cents: number }>(
        `select title, total_cents, deposit_cents from quotes where id = $1`, [QUOTE.A]);
      expect(r.rows[0]).toMatchObject({ title: "Kitchen remodel", total_cents: 112000, deposit_cents: 56000 });
      expect(await count(q, "quote_sections")).toBe(1);
      const lines = await q.query<{ name: string; quantity_milli: number }>(
        `select name, quantity_milli from quote_lines where quote_id = $1 order by position`, [QUOTE.A]);
      expect(lines.rows.map((x) => x.name)).toEqual(["Line 1", "Line 2"]);
      expect(lines.rows[0].quantity_milli).toBe(2500);
      const n = await q.query<{ notes: string | null }>(`select notes from quotes where id = $1`, [QUOTE.A]);
      expect(n.rows[0].notes).toBeNull(); // blank text is stored as null
    });
  });

  it("replaces, not appends, on every save", async () => {
    await as(U.ownerA, async (q) => {
      await save(q);
      await save(q, QUOTE.A, header({ title: "Revised" }), [], [line(1, { section_id: null })]);
      const lines = await q.query(`select 1 from quote_lines where quote_id = $1`, [QUOTE.A]);
      expect(lines.rows).toHaveLength(1);
      expect(await count(q, "quote_sections")).toBe(0);
      const r = await q.query<{ title: string }>(`select title from quotes where id = $1`, [QUOTE.A]);
      expect(r.rows[0].title).toBe("Revised");
    });
  });

  it("accepts an empty quote", async () => {
    await as(U.ownerA, async (q) => {
      await save(q, QUOTE.A, header(), [], []);
      expect(await count(q, "quote_lines")).toBe(0);
    });
  });

  it("refuses viewers and other organizations", async () => {
    await as(U.viewerA, async (q) => {
      await denied(q, `select save_quote_draft($1, $2::jsonb, '[]', '[]')`, [QUOTE.A, JSON.stringify(header())], /not found|row-level security|violates/);
    });
    await as(U.ownerB, async (q) => {
      await denied(q, `select save_quote_draft($1, $2::jsonb, '[]', '[]')`, [QUOTE.A, JSON.stringify(header())], /not found/);
    });
  });

  it("refuses a quote that has been sent", async () => {
    await as(U.ownerA, async (q) => {
      await q.query(`update quotes set status = 'sent' where id = $1`, [QUOTE.A]);
      await denied(q, `select save_quote_draft($1, $2::jsonb, '[]', '[]')`, [QUOTE.A, JSON.stringify(header())], /can no longer be edited/);
    });
  });

  it("refuses a catalog item from another organization", async () => {
    await as(U.ownerA, async (q) => {
      await denied(q, `select save_quote_draft($1, $2::jsonb, $3::jsonb, $4::jsonb)`,
        [QUOTE.A, JSON.stringify(header()), "[]", JSON.stringify([line(1, { section_id: null, catalog_item_id: id(240) })])], /outside this organization/);
      await save(q, QUOTE.A, header(), [], [line(1, { section_id: null, catalog_item_id: id(140) })]); // own item is fine
    });
  });

  it("refuses another organization's customer", async () => {
    await as(U.ownerA, async (q) => {
      await denied(q, `select save_quote_draft($1, $2::jsonb, '[]', '[]')`,
        [QUOTE.A, JSON.stringify(header({ customer_id: CUSTOMER.B }))], /violates|foreign key|row-level/);
    });
  });

  it("is all-or-nothing: a bad line leaves the previous save intact", async () => {
    await as(U.ownerA, async (q) => {
      await save(q, QUOTE.A, header({ title: "Good" }), [], [line(1, { section_id: null })]);
      await denied(q, `select save_quote_draft($1, $2::jsonb, $3::jsonb, $4::jsonb)`,
        [QUOTE.A, JSON.stringify(header({ title: "Bad" })), "[]", JSON.stringify([line(1, { section_id: null }), line(2, { section_id: null, kind: "nonsense" })])], /invalid input value/);
      const r = await q.query<{ title: string }>(`select title from quotes where id = $1`, [QUOTE.A]);
      expect(r.rows[0].title).toBe("Good");
      expect(await count(q, "quote_lines")).toBe(1);
    });
  });
});

describe("deleting quotes", () => {
  it("lets a draft be deleted with its lines", async () => {
    await as(U.ownerA, async (q) => {
      const r = await q.query(`delete from quotes where id = $1 returning id`, [QUOTE.A]);
      expect(r.rows).toHaveLength(1);
      expect(await count(q, "quote_lines")).toBe(0);
    });
  });

  it("never lets a sent quote be deleted", async () => {
    await as(U.ownerA, async (q) => {
      await q.query(`update quotes set status = 'sent' where id = $1`, [QUOTE.A]);
      await denied(q, `delete from quotes where id = $1`, [QUOTE.A], /cannot be deleted/);
    });
    // untouched, along with its lines
    expect(Number((await db.query<{ n: string }>(`select count(*) as n from quote_lines where id = $1`, [LINE.A])).rows[0].n)).toBe(1);
  });
});
