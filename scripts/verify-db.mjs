// Prints what the migrations created in your database. Reads DATABASE_URL from .env.local.
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("No .env.local found. Run this from the project root.");
  process.exit(1);
}

const expected = { tables: 13, rls: 13 };
const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 20 });
try {
  const [{ n: tables }] = await sql`select count(*)::int n from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`;
  const [{ n: rls }] = await sql`select count(*)::int n from pg_tables where schemaname = 'public' and rowsecurity`;
  const [{ n: policies }] = await sql`select count(*)::int n from pg_policies where schemaname = 'public'`;
  const [{ n: migrations }] = await sql`select count(*)::int n from drizzle.__drizzle_migrations`;
  const fns = await sql`select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname in ('is_org_member','can_write_org','is_org_owner','create_organization','next_quote_number','next_invoice_number','save_quote_draft','send_quote','renew_share_link','record_quote_view','respond_to_quote','create_revision','expire_overdue_quotes','create_invoice','set_invoice_status') order by 1`;

  const ok = tables === expected.tables && rls === expected.rls && migrations === 7 && fns.length === 15;
  console.log({ tables, tablesWithRLS: rls, policies, migrationsApplied: migrations, functions: fns.map((f) => f.proname) });
  console.log(ok ? "OK: schema, row-level security and functions are all in place." : "NOT COMPLETE: run `npm run db:migrate` and try again.");
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  console.error("Could not check the database:", e.code ?? "", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
