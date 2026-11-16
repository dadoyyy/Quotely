import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "../env";

/**
 * Service-role client: bypasses row-level security. The ONLY legitimate callers are the public
 * approval route (authorizes by token hash) and the daily cron route (authorizes by CRON_SECRET). Never import this from a page,
 * a server action reachable by signed-in users, or any client component.
 */
export function createAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
