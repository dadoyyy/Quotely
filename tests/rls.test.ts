import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUSTOMER, LINE, ORG, QUOTE, U, as, closeDb, count, db, denied, id, setupDb } from "./helpers";

/**
 * Phase 0 gate: one account cannot read or write another's rows.
 * Runs the real migrations on real Postgres (PGlite) with a stub of Supabase's `auth` schema.
 */

beforeAll(setupDb);
afterAll(closeDb);

describe("tenant isolation", () => {
  it("shows a member only their own organization's rows", async () => {
    await as(U.ownerA, async (q) => {
      const names = (await q.query<{ name: string }>(`select name from customers order by name`)).rows.map((r) => r.name);
      expect(names).toEqual(["Cruz", "Reyes"]);
      expect(await count(q, "organizations")).toBe(1);
      expect(await count(q, "quotes")).toBe(1);
      expect(await count(q, "quote_lines")).toBe(1);
    });
    await as(U.ownerB, async (q) => {
      expect(await count(q, "customers")).toBe(1);
    });
  });

  it("hides another organization's quote even when asked for it by id", async () => {
    await as(U.ownerA, async (q) => {
      const r = await q.query(`select id from quotes where id = $1`, [QUOTE.B]);
      expect(r.rows).toHaveLength(0);
    });
  });

  it("refuses an insert into another organization", async () => {
    await as(U.ownerA, async (q) => {
      await expect(
        q.query(`insert into customers (org_id, name) values ($1, 'Intruder')`, [ORG.B]),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("silently updates and deletes nothing in another organization", async () => {
    await as(U.ownerA, async (q) => {
      const upd = await q.query(`update customers set name = 'Pwned' where id = $1 returning id`, [CUSTOMER.B]);
      expect(upd.rows).toHaveLength(0);
      const del = await q.query(`delete from customers where id = $1 returning id`, [CUSTOMER.B]);
      expect(del.rows).toHaveLength(0);
    });
    // and the row is untouched
    const r = await db.query<{ name: string }>(`select name from customers where id = $1`, [CUSTOMER.B]);
    expect(r.rows[0].name).toBe("Dela Rosa");
  });

  it("gives anonymous callers no access at all", async () => {
    await as(null, async (q) => {
      await denied(q, `select count(*) from customers`, [], /permission denied/);
      await denied(q, `select count(*) from quotes`, [], /permission denied/);
      await denied(q, `insert into customers (org_id, name) values ($1, 'x')`, [ORG.A], /permission denied/);
    }, "anon");
  });

  it("gives an authenticated user with no membership nothing", async () => {
    await as(U.newcomer, async (q) => {
      expect(await count(q, "customers")).toBe(0);
      expect(await count(q, "organizations")).toBe(0);
    });
  });

  it("will not let a quote point at another organization's customer", async () => {
    await as(U.ownerA, async (q) => {
      await expect(
        q.query(
          `insert into quotes (id, org_id, customer_id, root_quote_id) values ($1, $2, $3, $1)`,
          [id(900), ORG.A, CUSTOMER.B],
        ),
      ).rejects.toThrow(/quotes_customer_fk/);
    });
  });

  it("will not let a line point at another organization's quote", async () => {
    await as(U.ownerA, async (q) => {
      await expect(
        q.query(`insert into quote_lines (org_id, quote_id, name) values ($1, $2, 'Sneaky')`, [ORG.A, QUOTE.B]),
      ).rejects.toThrow(/quote_lines_quote_fk/);
    });
  });
});

describe("roles", () => {
  it("lets staff write but not manage members or settings", async () => {
    await as(U.staffA, async (q) => {
      await q.query(`insert into customers (org_id, name) values ($1, 'New client')`, [ORG.A]);
      await denied(
        q,
        `insert into memberships (org_id, user_id, role) values ($1, $2, 'staff')`,
        [ORG.A, U.newcomer],
        /row-level security/,
      );
      const upd = await q.query(`update organizations set name = 'Hijacked' where id = $1 returning id`, [ORG.A]);
      expect(upd.rows).toHaveLength(0);
    });
  });

  it("lets the owner change settings", async () => {
    await as(U.ownerA, async (q) => {
      const upd = await q.query(`update organizations set name = 'Acme Co' where id = $1 returning id`, [ORG.A]);
      expect(upd.rows).toHaveLength(1);
    });
  });

  it("lets a viewer read but not write", async () => {
    await as(U.viewerA, async (q) => {
      expect(await count(q, "customers")).toBe(2);
      await denied(q, `insert into customers (org_id, name) values ($1, 'Nope')`, [ORG.A], /row-level security/);
      const upd = await q.query(`update customers set name = 'Nope' where id = $1 returning id`, [CUSTOMER.A]);
      expect(upd.rows).toHaveLength(0);
    });
  });

  it("keeps the audit trail append-only", async () => {
    await as(U.staffA, async (q) => {
      await q.query(
        `insert into quote_events (org_id, quote_id, type, actor_type) values ($1, $2, 'created', 'staff')`,
        [ORG.A, QUOTE.A],
      );
      await denied(q, `update quote_events set type = 'tampered'`, [], /permission denied/);
      await denied(q, `delete from quote_events`, [], /permission denied/);
      expect(await count(q, "quote_events")).toBe(1);
    });
  });
});

describe("frozen quotes", () => {
  const send = (q: PGlite) =>
    q.query(
      `update quotes set status = 'sent', document_snapshot = '{"total":100}'::jsonb, sent_at = now() where id = $1`,
      [QUOTE.A],
    );

  it("lets a draft's lines change freely", async () => {
    await as(U.staffA, async (q) => {
      await q.query(`update quote_lines set name = 'Tiling v2' where id = $1`, [LINE.A]);
      await q.query(`insert into quote_lines (org_id, quote_id, name) values ($1, $2, 'Grout')`, [ORG.A, QUOTE.A]);
      await q.query(`delete from quote_lines where id = $1`, [LINE.A]);
    });
  });

  it("locks the lines once the quote is sent", async () => {
    await as(U.staffA, async (q) => {
      await send(q);
      await expect(q.query(`update quote_lines set name = 'Edited' where id = $1`, [LINE.A])).rejects.toThrow(/can no longer be edited/);
    });
    await as(U.staffA, async (q) => {
      await send(q);
      await expect(
        q.query(`insert into quote_lines (org_id, quote_id, name) values ($1, $2, 'Late add')`, [ORG.A, QUOTE.A]),
      ).rejects.toThrow(/can no longer be edited/);
    });
    await as(U.staffA, async (q) => {
      await send(q);
      await expect(q.query(`delete from quote_lines where id = $1`, [LINE.A])).rejects.toThrow(/can no longer be edited/);
    });
  });

  it("never lets a snapshot be rewritten", async () => {
    await as(U.staffA, async (q) => {
      await send(q);
      await expect(
        q.query(`update quotes set document_snapshot = '{"total":1}'::jsonb where id = $1`, [QUOTE.A]),
      ).rejects.toThrow(/immutable/);
    });
  });
});

describe("status state machine", () => {
  const move = (q: PGlite, to: string) => q.query(`update quotes set status = $2 where id = $1`, [QUOTE.A, to]);

  it("walks the happy path", async () => {
    await as(U.staffA, async (q) => {
      for (const s of ["sent", "viewed", "approved", "invoiced"]) await move(q, s);
      const r = await q.query<{ status: string }>(`select status from quotes where id = $1`, [QUOTE.A]);
      expect(r.rows[0].status).toBe("invoiced");
    });
  });

  it("refuses to skip sending", async () => {
    await as(U.staffA, async (q) => {
      await expect(move(q, "approved")).rejects.toThrow(/illegal quote status change/);
    });
  });

  it("refuses to un-send or un-approve", async () => {
    await as(U.staffA, async (q) => {
      await move(q, "sent");
      await expect(move(q, "draft")).rejects.toThrow(/illegal quote status change/);
    });
    await as(U.staffA, async (q) => {
      for (const s of ["sent", "approved"]) await move(q, s);
      await expect(move(q, "viewed")).rejects.toThrow(/illegal quote status change/);
    });
  });

  it("treats rejected as final", async () => {
    await as(U.staffA, async (q) => {
      for (const s of ["sent", "rejected"]) await move(q, s);
      await expect(move(q, "approved")).rejects.toThrow(/illegal quote status change/);
    });
  });
});

describe("numbering and signup", () => {
  it("allocates sequential quote numbers per organization", async () => {
    await as(U.staffA, async (q) => {
      const a = (await q.query<{ n: string }>(`select public.next_quote_number($1) as n`, [ORG.A])).rows[0].n;
      const b = (await q.query<{ n: string }>(`select public.next_quote_number($1) as n`, [ORG.A])).rows[0].n;
      expect(a).toMatch(/^QUO-\d{4}-0001$/);
      expect(b).toMatch(/^QUO-\d{4}-0002$/);
    });
    await as(U.ownerB, async (q) => {
      const n = (await q.query<{ n: string }>(`select public.next_quote_number($1) as n`, [ORG.B])).rows[0].n;
      expect(n).toMatch(/^QUO-\d{4}-0001$/); // its own counter
    });
  });

  it("refuses numbers to viewers and to other organizations", async () => {
    await as(U.viewerA, async (q) => {
      await expect(q.query(`select public.next_quote_number($1)`, [ORG.A])).rejects.toThrow(/not allowed/);
    });
    await as(U.ownerB, async (q) => {
      await expect(q.query(`select public.next_quote_number($1)`, [ORG.A])).rejects.toThrow(/not allowed/);
    });
  });

  it("lets a new user create an organization and become its owner", async () => {
    await as(U.newcomer, async (q) => {
      const orgId = (await q.query<{ id: string }>(`select public.create_organization('Fresh Start') as id`)).rows[0].id;
      const m = await q.query<{ role: string }>(`select role from memberships where org_id = $1`, [orgId]);
      expect(m.rows.map((r) => r.role)).toEqual(["owner"]);
      expect(await count(q, "organizations")).toBe(1);
    });
  });

  it("refuses organization signup without a session", async () => {
    await as(null, async (q) => {
      await expect(q.query(`select public.create_organization('Ghost')`)).rejects.toThrow();
    });
  });
});
