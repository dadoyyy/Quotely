import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "../lib/env";
import * as schema from "./schema";

/**
 * Direct Postgres connection as the database owner, which bypasses row-level security.
 * Use it for migrations, seeds and trusted server jobs. User-facing reads and writes should go
 * through the session-bound Supabase client so RLS stays in force.
 */
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

export function getDb() {
  globalForDb.pg ??= postgres(serverEnv().DATABASE_URL, { prepare: false });
  return drizzle(globalForDb.pg, { schema });
}

export { schema };
