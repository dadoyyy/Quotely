import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "../env";

/**
 * Service-role client: bypasses row-level security. The ONLY legitimate caller is the public
 * approval route, which authorizes by token hash instead. Never import this from a page,
 * a server action reachable by signed-in users, or any client component.
 */
export function createAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
