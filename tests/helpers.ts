import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

/** Shared fixtures for the database tests: real migrations on real Postgres (PGlite), stubbed Supabase `auth`. */

export const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
export const U = { ownerA: id(1), staffA: id(2), viewerA: id(3), ownerB: id(4), newcomer: id(5) };
export const ORG = { A: id(100), B: id(200) };
export const CUSTOMER = { A: id(110), A2: id(111), B: id(210) };
export const QUOTE = { A: id(120), B: id(220) };
export const LINE = { A: id(130), B: id(230) };

export let db: PGlite;

export async function setupDb() {
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
}

export async function closeDb() {
  await db.close();
}

/** Run as a signed-in user (or role) in a transaction that always rolls back, so tests stay independent. */
export async function as<T>(uid: string | null, fn: (q: PGlite) => Promise<T>, role = "authenticated"): Promise<T> {
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
export async function denied(q: PGlite, sql: string, params: unknown[], pattern: RegExp) {
  await q.exec("savepoint denied");
  await expect(q.query(sql, params)).rejects.toThrow(pattern);
  await q.exec("rollback to savepoint denied");
}

export const count = async (q: PGlite, table: string) =>
  Number((await q.query<{ n: string }>(`select count(*)::int as n from ${table}`)).rows[0].n);

