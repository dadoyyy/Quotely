import type { Metadata } from "next";
import { headers } from "next/headers";
import { QuoteDocument } from "@/components/quote-document";
import { loadPublicQuote } from "@/lib/public-quote";
import { isLikelyBot } from "@/lib/quotes/share";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "./print-button";
import { ResponsePanel } from "./response-panel";

// A private link: keep it out of search results and don't leak it through the Referer header.
export const metadata: Metadata = {
  title: "Quotation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

function Notice({ tone, children }: { tone: "green" | "red" | "amber" | "neutral"; children: React.ReactNode }) {
  const tones = {
    green: "border-green-200 bg-green-50 text-green-900",
    red: "border-red-200 bg-red-50 text-red-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-800",
  };
  return <div role="status" className={`rounded-lg border p-4 text-sm print:hidden ${tones[tone]}`}>{children}</div>;
}

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await loadPublicQuote(token);

  if (!quote) {
    return (
      <main className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-neutral-600">It may have expired or been replaced. Please ask the sender for a new link.</p>
      </main>
    );
  }

  // Count a view only when a person is likely there: link scanners and chat previews fetch pages too.
  const h = await headers();
  const ua = h.get("user-agent");
  if (!isLikelyBot(ua)) {
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
    const { error } = await createAdminClient().rpc("record_quote_view", { p_link_id: quote.linkId, p_ip: ip, p_user_agent: ua ?? "" });
    if (error) console.error("[view]", error.code, error.message);
  }

  const s = quote.snapshot;
  const when = quote.respondedAt ? new Date(quote.respondedAt).toLocaleDateString("en-PH", { dateStyle: "long" }) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-neutral-600">Quotation from <span className="font-medium">{s.business.name}</span></p>
        <PrintButton />
      </div>

      {quote.status === "approved" && <Notice tone="green">You approved this quote{when ? ` on ${when}` : ""}. Thank you.</Notice>}
      {quote.status === "changes_requested" && <Notice tone="amber">You asked for changes{when ? ` on ${when}` : ""}. {s.business.name} will send a revised quote.</Notice>}
      {quote.status === "rejected" && <Notice tone="neutral">You declined this quote{when ? ` on ${when}` : ""}.</Notice>}
      {quote.status === "superseded" && <Notice tone="amber">This quote has been replaced by a newer version. Please ask {s.business.name} for the latest link.</Notice>}
      {quote.status === "invoiced" && <Notice tone="green">This quote was approved and has been invoiced.</Notice>}
      {quote.isExpired && !["approved", "invoiced", "rejected", "changes_requested", "superseded"].includes(quote.status) && (
        <Notice tone="red">This quote expired on {s.quote.validUntil}. Please contact {s.business.name} if you&apos;d still like to go ahead.</Notice>
      )}

      <QuoteDocument snapshot={s} />

      {quote.canRespond && <ResponsePanel token={token} businessName={s.business.name} />}
    </main>
  );
}
