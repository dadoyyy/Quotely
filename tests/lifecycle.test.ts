import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { LINE, ORG, QUOTE, U, as, closeDb, db, denied, id, setupDb } from "./helpers";

/** Phase 4: revisions, superseding, and expiry. */

beforeAll(async () => {
  await setupDb();
  // Give quote A a section and a second line so copying is meaningful.
  await db.exec(`
    insert into quote_sections (id, org_id, quote_id, position, title) values ('${id(150)}', '${ORG.A}', '${QUOTE.A}', 0, 'Floors');
    update quote_lines set section_id = '${id(150)}', quantity_milli = 40500, unit_cost_cents = 30000, markup_bps = 2500,
      unit_price_cents = 37500 where id = '${LINE.A}';
    insert into quote_lines (id, org_id, quote_id, position, name, unit_price_override_cents, unit_price_cents)
      values ('${id(131)}', '${ORG.A}', '${QUOTE.A}', 1, 'Permit', 100000, 100000);
  `);
});
afterAll(closeDb);

const TOKEN = (n: number) => createHash("sha256").update(`t${n}`).digest("hex");
const future = "2099-01-01T00:00:00Z";
const snap = JSON.stringify({ quote: { title: "Kitchen" } });
const REV = (n: number) => id(300 + n);

async function send(q: PGlite, quote: string, token: number) {
  const u = (await q.query<{ u: string }>(`select updated_at::text u from quotes where id = $1`, [quote])).rows[0].u;
  return (await q.query<{ n: string }>(`select send_quote($1, $2::timestamptz, $3::jsonb, $4, $5::timestamptz) n`, [quote, u, snap, TOKEN(token), future])).rows[0].n;
}
const revise = (q: PGlite, from: string, to: string) =>
  q.query(`select create_revision($1, $2, '2026-11-16', '2026-12-16')`, [from, to]);
const status = async (q: PGlite, quote: string) => (await q.query<{ s: string }>(`select status s from quotes where id = $1`, [quote])).rows[0].s;

describe("create_revision", () => {
  it("copies a sent quote into a new draft: same number, next version, new line ids", async () => {
    await as(U.staffA, async (q) => {
      const num = await send(q, QUOTE.A, 1);
      await revise(q, QUOTE.A, REV(1));
      const r = (await q.query<{ quote_number: string; version: number; status: string; root: string; same_root: boolean; title: string }>(
        `select quote_number, version, status, root_quote_id = $2 as same_root, root_quote_id::text as root, title from quotes where id = $1`, [REV(1), QUOTE.A])).rows[0];
      expect(r).toMatchObject({ quote_number: num, version: 2, status: "draft", same_root: true, title: "Kitchen" });
      const lines = (await q.query<{ name: string; section_id: string | null; quantity_milli: number; unit_price_cents: number; id: string }>(
        `select id, name, section_id, quantity_milli, unit_price_cents from quote_lines where quote_id = $1 order by position`, [REV(1)])).rows;
      expect(lines.map((l) => l.name)).toEqual(["Tiling", "Permit"]);
      expect(lines[0]).toMatchObject({ quantity_milli: 40500, unit_price_cents: 37500 });
      expect(lines[0].id).not.toBe(LINE.A);
      // the section was copied with a new id and the line follows it
      const sec = (await q.query<{ id: string; title: string }>(`select id, title from quote_sections where quote_id = $1`, [REV(1)])).rows;
      expect(sec).toHaveLength(1);
      expect(sec[0].id).not.toBe(id(150));
      expect(lines[0].section_id).toBe(sec[0].id);
      expect(lines[1].section_id).toBeNull();
      // the original is untouched for now
      expect(await status(q, QUOTE.A)).toBe("sent");
    });
  });

  it("leaves the original open until the revision is sent, then supersedes it and kills its link", async () => {
    await as(U.ownerA, async (q) => {
      await send(q, QUOTE.A, 1);
      await revise(q, QUOTE.A, REV(1));
      await send(q, REV(1), 2);
      expect(await status(q, QUOTE.A)).toBe("superseded");
      expect(await status(q, REV(1))).toBe("sent");
      const old = (await q.query<{ revoked: boolean }>(`select revoked_at is not null as revoked from quote_share_links where quote_id = $1`, [QUOTE.A])).rows[0];
      expect(old.revoked).toBe(true);
      const ev = (await q.query<{ type: string }>(`select type from quote_events where quote_id = $1 order by created_at, type`, [QUOTE.A])).rows.map((e) => e.type);
      expect(ev).toContain("superseded");
      // the new version keeps its number, and numbers are not consumed by revisions
      const nums = (await q.query<{ quote_number: string }>(`select distinct quote_number from quotes where root_quote_id = $1`, [QUOTE.A])).rows;
      expect(nums).toHaveLength(1);
    });
  });

  it("revises only quotes that can be revised, and only the latest version", async () => {
    await as(U.ownerA, async (q) => {
      await denied(q, `select create_revision($1, $2, null, null)`, [QUOTE.A, REV(2)], /draft quote can't be revised/); // still a draft
      await send(q, QUOTE.A, 1);
      await revise(q, QUOTE.A, REV(1));
      await denied(q, `select create_revision($1, $2, null, null)`, [QUOTE.A, REV(2)], /newer version/);
    });
  });

  it("refuses an approved quote", async () => {
    await as(U.ownerA, async (q) => {
      await send(q, QUOTE.A, 1);
      await q.query(`update quotes set status = 'approved' where id = $1`, [QUOTE.A]);
      await denied(q, `select create_revision($1, $2, null, null)`, [QUOTE.A, REV(3)], /approved quote can't be revised/);
    });
  });

  it("refuses viewers and other organizations", async () => {
    // Send as the owner, then carry on in the same transaction as someone else.
    const asOther = async (uid: string, expected: RegExp) =>
      as(U.ownerA, async (q) => {
        await send(q, QUOTE.A, 1);
        await q.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
        await denied(q, `select create_revision($1, $2, null, null)`, [QUOTE.A, REV(4)], expected);
      });
    await asOther(U.viewerA, /not found|row-level security/);
    await asOther(U.ownerB, /not found/);
  });

  it("is atomic: a clash on the new id leaves nothing behind", async () => {
    await as(U.ownerA, async (q) => {
      await send(q, QUOTE.A, 1);
      await denied(q, `select create_revision($1, $1, null, null)`, [QUOTE.A], /duplicate key|unique/);
      expect((await q.query(`select 1 from quotes where root_quote_id = $1`, [QUOTE.A])).rows).toHaveLength(1);
    });
  });
});

describe("expire_overdue_quotes", () => {
  const backdate = (q: PGlite, quote: string) => q.query(`update quotes set valid_until = '2000-01-01' where id = $1`, [quote]);

  it("expires open quotes past their date for the caller's own business, and logs it", async () => {
    await as(U.ownerA, async (q) => {
      await send(q, QUOTE.A, 1);
      await backdate(q, QUOTE.A);
      const n = (await q.query<{ n: number }>(`select expire_overdue_quotes($1) n`, [ORG.A])).rows[0].n;
      expect(n).toBe(1);
      expect(await status(q, QUOTE.A)).toBe("expired");
      const ev = (await q.query<{ actor_type: string }>(`select actor_type from quote_events where type = 'expired'`)).rows;
      expect(ev).toEqual([{ actor_type: "system" }]);
      expect((await q.query<{ n: number }>(`select expire_overdue_quotes($1) n`, [ORG.A])).rows[0].n).toBe(0); // idempotent
    });
  });

  it("leaves drafts, quotes still in date, and answered quotes alone", async () => {
    await as(U.ownerA, async (q) => {
      await backdate(q, QUOTE.A); // a draft with a past date
      expect((await q.query<{ n: number }>(`select expire_overdue_quotes($1) n`, [ORG.A])).rows[0].n).toBe(0);
      expect(await status(q, QUOTE.A)).toBe("draft");
    });
    await as(U.ownerA, async (q) => {
      await send(q, QUOTE.A, 1);
      await q.query(`update quotes set status = 'approved' where id = $1`, [QUOTE.A]);
      await backdate(q, QUOTE.A);
      expect((await q.query<{ n: number }>(`select expire_overdue_quotes($1) n`, [ORG.A])).rows[0].n).toBe(0);
    });
  });

  it("will not sweep another business, or everything, for a signed-in user", async () => {
    await as(U.ownerA, async (q) => {
      await denied(q, `select expire_overdue_quotes($1)`, [ORG.B], /not allowed/);
      await denied(q, `select expire_overdue_quotes()`, [], /not allowed/);
    });
    await as(null, async (q) => {
      await denied(q, `select expire_overdue_quotes()`, [], /permission denied/);
    }, "anon");
  });

  it("lets the scheduled job (no user) sweep every business", async () => {
    await as(U.ownerA, async (q) => {
      await send(q, QUOTE.A, 1);
      await backdate(q, QUOTE.A);
      await q.exec("reset role");
      await q.exec("set local role service_role");
      await q.query(`select set_config('request.jwt.claim.sub', '', true)`);
      expect((await q.query<{ n: number }>(`select expire_overdue_quotes() n`)).rows[0].n).toBeGreaterThanOrEqual(1);
      expect(await status(q, QUOTE.A)).toBe("expired");
    });
  });
});

