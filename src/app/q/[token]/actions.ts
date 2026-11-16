"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { loadPublicQuote } from "@/lib/public-quote";
import { createAdminClient } from "@/lib/supabase/admin";

export type RespondState = { ok?: boolean; error?: string; status?: string };

const ACTIONS = new Set(["approve", "reject", "changes"]);

/** The customer's answer. The database enforces who may answer what, and once. */
export async function respond(token: string, _prev: RespondState, fd: FormData): Promise<RespondState> {
  const action = String(fd.get("action") ?? "");
  if (!ACTIONS.has(action)) return { error: "Choose what you'd like to do." };
  if (action === "approve" && fd.get("accept") !== "on") return { error: "Please tick the box to confirm you accept this quote." };

  const quote = await loadPublicQuote(token);
  if (!quote) return { error: "This link is no longer valid. Ask the sender for a new one." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("respond_to_quote", {
    p_link_id: quote.linkId,
    p_action: action,
    p_name: String(fd.get("name") ?? ""),
    p_note: String(fd.get("note") ?? ""),
    p_ip: ip ?? "",
    p_user_agent: h.get("user-agent") ?? "",
  });
  if (error) {
    // Raised by our own function with a message meant for the customer.
    if (error.code === "23514" || error.code === "22023") return { error: error.message };
    console.error("[respond]", error.code, error.message);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/q/${token}`);
  return { ok: true, status: String(data) };
}
