import { z } from "zod";

/** Public values are safe in the browser; everything else is server only. */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  AI_ENABLED: z.enum(["true", "false"]).default("true"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

function parse<S extends z.ZodType>(schema: S, source: unknown): z.output<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))].join(", ");
  throw new Error(`Missing or invalid environment variables: ${names}. Check .env.local against .env.example.`);
}

export function publicEnv() {
  // Referenced one by one so Next.js can inline them into browser code.
  return parse(publicSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  });
}

export function serverEnv() {
  return parse(serverSchema, {
    ...process.env,
    AI_ENABLED: process.env.AI_ENABLED || undefined,
  });
}
