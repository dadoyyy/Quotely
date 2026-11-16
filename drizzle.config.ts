import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local on its own; Next.js does, so share it.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local yet
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://placeholder" },
});
