import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { OrganizationRow } from "./rows";
import { createClient } from "./supabase/server";

export type Role = "owner" | "staff" | "viewer";

/** The signed-in user, verified with Supabase Auth (not just read from the cookie). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** The user's organization and role. One organization per user for now. */
export const getMembership = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const org = (Array.isArray(data.organizations) ? data.organizations[0] : data.organizations) as OrganizationRow | null;
  return org ? { role: data.role as Role, org } : null;
});

/** For pages and actions behind login: sends people to login or onboarding as needed. */
export async function requireContext() {
  const user = await getUser();
  if (!user) redirect("/login");
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return {
    user,
    org: membership.org,
    role: membership.role,
    canWrite: membership.role !== "viewer",
    isOwner: membership.role === "owner",
  };
}
