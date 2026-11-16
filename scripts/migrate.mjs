// Applies drizzle/*.sql to the database in DATABASE_URL (from .env.local), in order, and says what happened.
// Replaces `drizzle-kit migrate`, which exited silently on some setups.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("No .env.local found. Run this from the project root.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is empty in .env.local.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 20, onnotice: () => {} });
try {
  const before = await sql`select to_regclass('drizzle.__drizzle_migrations') as t`;
  const had = before[0].t
    ? (await sql`select count(*)::int n from drizzle.__drizzle_migrations`)[0].n
    : 0;
  console.log(`Connected. Migrations already applied: ${had}. Applying the rest...`);
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  const after = (await sql`select count(*)::int n from drizzle.__drizzle_migrations`)[0].n;
  console.log(`Done. Migrations applied in total: ${after}.`);
} catch (e) {
  console.error("\nMigration FAILED. Nothing from the failing step was kept.");
  console.error(`  code:    ${e.code ?? e.cause?.code ?? "(none)"}`);
  console.error(`  message: ${e.cause?.message ?? e.message}`);
  if (e.cause?.where) console.error(`  where:   ${e.cause.where}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
