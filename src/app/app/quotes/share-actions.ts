"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { friendlyError } from "@/lib/errors";
import { PricingError } from "@/lib/pricing/engine";
import { buildSnapshot } from "@/lib/quotes/snapshot";
import { linkExpiry } from "@/lib/quotes/share";
import type { ShareState } from "@/lib/quotes/share-state";
import type { CustomerRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "@/lib/rows";
import { isUuid } from "@/lib/search";
import { generateToken, hashToken } from "@/lib/share-token";
import { createClient } from "@/lib/supabase/server";

const linkFor = (token: string) => `${publicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/q/${token}`;

/** Messages raised by our own database functions are written for people, so they can be shown as they are. */
function rpcError(error: { code?: string; message?: string }): string {
  if (error.code === "P0002") return "That quote couldn't be found, or you can't change it.";
  if (error.code === "23514" || error.code === "40001") return error.message ?? "That isn't allowed.";
  return friendlyError(error, "quote");
}

/** Freeze a draft and make its link. */
export async function sendQuote(_prev: ShareState, fd: FormData): Promise<ShareState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That quote couldn't be found." };
  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view quotes but not send them." };

  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!data) return { error: "That quote couldn't be found." };
  const quote = data as QuoteRow;
  if (quote.status !== "draft") return { error: "This quote was already sent." };

  const [sections, lines, customer] = await Promise.all([
    supabase.from("quote_sections").select("*").eq("quote_id", id),
    supabase.from("quote_lines").select("*").eq("quote_id", id),
    supabase.from("customers").select("*").eq("id", quote.customer_id).maybeSingle(),
  ]);
  if (!customer.data) return { error: "This quote's customer no longer exists." };
  if (!quote.title.trim()) return { error: "Give the quote a title before sending." };

  let snapshot;
  try {
    snapshot = buildSnapshot({
      quote,
      sections: (sections.data ?? []) as QuoteSectionRow[],
      lines: (lines.data ?? []) as QuoteLineRow[],
      customer: customer.data as CustomerRow,
      org,
    });
  } catch (e) {
    if (e instanceof PricingError) return { error: e.message };
    throw e;
  }

  const token = generateToken();
  const { data: number, error } = await supabase.rpc("send_quote", {
    p_quote_id: id,
    p_expected_updated_at: quote.updated_at,
    p_snapshot: snapshot,
    p_token_hash: hashToken(token),
    p_expires_at: linkExpiry(quote.valid_until),
  });
  if (error) return { error: rpcError(error) };

  revalidatePath("/app/quotes");
  revalidatePath(`/app/quotes/${id}`);
  return { ok: true, link: linkFor(token), number: String(number) };
}

/** A new link for a sent quote. Every earlier link stops working. */
export async function renewShareLink(_prev: ShareState, fd: FormData): Promise<ShareState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That quote couldn't be found." };
  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view quotes but not change them." };

  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("valid_until").eq("id", id).eq("org_id", org.id).maybeSingle();
  if (!data) return { error: "That quote couldn't be found." };

  const token = generateToken();
  const { error } = await supabase.rpc("renew_share_link", {
    p_quote_id: id,
    p_token_hash: hashToken(token),
    p_expires_at: linkExpiry(data.valid_until),
  });
  if (error) return { error: rpcError(error) };

  revalidatePath(`/app/quotes/${id}`);
  return { ok: true, link: linkFor(token) };
}
