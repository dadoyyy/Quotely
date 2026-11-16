import "server-only";
import { snapshotSchema, type QuoteSnapshot } from "./quotes/snapshot";
import type { QuoteStatus } from "./rows";
import { hashToken, looksLikeToken } from "./share-token";
import { createAdminClient } from "./supabase/admin";
import { todayIn } from "./quotes/model";

export interface PublicQuote {
  linkId: string;
  quoteId: string;
  status: QuoteStatus;
  respondedAt: string | null;
  snapshot: QuoteSnapshot;
  /** Past its valid-until date: can be read, can no longer be accepted. */
  isExpired: boolean;
  /** Still open to an answer. */
  canRespond: boolean;
}

/**
 * Look a share link up by the hash of its token. The service-role client is used here and nowhere
 * near a signed-in page: the token is the authorization. Anything wrong with the link (unknown,
 * revoked, expired) returns null, so a visitor can't tell those apart.
 */
export async function loadPublicQuote(token: string): Promise<PublicQuote | null> {
  if (!looksLikeToken(token)) return null;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("quote_share_links")
    .select("id, quote_id, org_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!link || link.revoked_at || new Date(link.expires_at) <= new Date()) return null;

  const [{ data: quote }, { data: org }] = await Promise.all([
    admin.from("quotes").select("id, status, valid_until, responded_at, document_snapshot").eq("id", link.quote_id).maybeSingle(),
    admin.from("organizations").select("timezone").eq("id", link.org_id).maybeSingle(),
  ]);
  if (!quote || quote.status === "draft") return null;

  const parsed = snapshotSchema.safeParse(quote.document_snapshot);
  if (!parsed.success) {
    console.error("[public-quote] stored snapshot failed validation", quote.id);
    return null;
  }

  const status = quote.status as QuoteStatus;
  const isExpired = status === "expired" || Boolean(quote.valid_until && quote.valid_until < todayIn(org?.timezone ?? "UTC"));
  return {
    linkId: link.id,
    quoteId: quote.id,
    status,
    respondedAt: quote.responded_at,
    snapshot: parsed.data,
    isExpired,
    canRespond: (status === "sent" || status === "viewed") && !isExpired,
  };
}
