import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Phase 0 gate: one account cannot read or write another's rows.
 * Runs the real migrations on real Postgres (PGlite) with a stub of Supabase's `auth` schema.
 * auth.uid() is implemented the way Supabase does it: from request.jwt.claim.sub.
 */

const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
const U = { ownerA: id(1), staffA: id(2), viewerA: id(3), ownerB: id(4), newcomer: id(5) };
const ORG = { A: id(100), B: id(200) };
const CUSTOMER = { A: id(110), A2: id(111), B: id(210) };
const QUOTE = { A: id(120), B: id(220) };
const LINE = { A: id(130), B: id(230) };

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
    $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);

  const dir = join(process.cwd(), "drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }

  await db.exec(`
    insert into auth.users (id) values ('${U.ownerA}'), ('${U.staffA}'), ('${U.viewerA}'), ('${U.ownerB}'), ('${U.newcomer}');
    insert into organizations (id, name) values ('${ORG.A}', 'Acme Renovations'), ('${ORG.B}', 'Bravo Events');
    insert into memberships (org_id, user_id, role) values
      ('${ORG.A}', '${U.ownerA}', 'owner'), ('${ORG.A}', '${U.staffA}', 'staff'),
      ('${ORG.A}', '${U.viewerA}', 'viewer'), ('${ORG.B}', '${U.ownerB}', 'owner');
    insert into customers (id, org_id, name) values
      ('${CUSTOMER.A}', '${ORG.A}', 'Cruz'), ('${CUSTOMER.A2}', '${ORG.A}', 'Reyes'), ('${CUSTOMER.B}', '${ORG.B}', 'Dela Rosa');
    insert into quotes (id, org_id, customer_id, root_quote_id, title) values
      ('${QUOTE.A}', '${ORG.A}', '${CUSTOMER.A}', '${QUOTE.A}', 'Kitchen'),
      ('${QUOTE.B}', '${ORG.B}', '${CUSTOMER.B}', '${QUOTE.B}', 'Wedding');
    insert into quote_lines (id, org_id, quote_id, name) values
      ('${LINE.A}', '${ORG.A}', '${QUOTE.A}', 'Tiling'), ('${LINE.B}', '${ORG.B}', '${QUOTE.B}', 'Catering');
  `);
});

afterAll(async () => {
  await db.close();
});

/** Run as a signed-in user (or role) in a transaction that always rolls back, so tests stay independent. */
async function as<T>(uid: string | null, fn: (q: PGlite) => Promise<T>, role = "authenticated"): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    return await fn(db);
  } finally {
    await db.exec("rollback");
  }
}


/** Expect a statement to be refused, then recover the transaction so the test can carry on. */
async function denied(q: PGlite, sql: string, params: unknown[], pattern: RegExp) {
  await q.exec("savepoint denied");
  await expect(q.query(sql, params)).rejects.toThrow(pattern);
  await q.exec("rollback to savepoint denied");
}

const count = async (q: PGlite, table: string) =>
  Number((await q.query<{ n: string }>(`select count(*)::int as n from ${table}`)).rows[0].n);

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
