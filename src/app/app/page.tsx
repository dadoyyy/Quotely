import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requireContext } from "@/lib/auth";
import { formatBps, formatCents } from "@/lib/money-format";
import { computeStats, followUps, type QuoteSummary } from "@/lib/quotes/insights";
import { todayIn } from "@/lib/quotes/model";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/quotes/status";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

async function count(table: "customers" | "catalog_items") {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

const money = (c: number | null) => (c === null ? "—" : formatCents(c));

export default async function DashboardPage() {
  const { org, canWrite } = await requireContext();
  const supabase = await createClient();
  await supabase.rpc("expire_overdue_quotes", { p_org: org.id });

  const [customers, items, quotesRes] = await Promise.all([
    count("customers"),
    count("catalog_items"),
    // Only the latest version of each quote matters for the pipeline.
    supabase.from("quotes").select("id, title, quote_number, version, status, total_cents, valid_until, sent_at, responded_at, updated_at, customer_id").order("updated_at", { ascending: false }).limit(2000),
  ]);
  const quotes = (quotesRes.data ?? []) as QuoteSummary[];
  const stats = computeStats(quotes, org.timezone);
  const attention = followUps(quotes, todayIn(org.timezone)).slice(0, 8);

  const names = new Map<string, string>();
  const ids = [...new Set(attention.map((a) => a.quote.customer_id))];
  if (ids.length) {
    const { data } = await supabase.from("customers").select("id, name").in("id", ids);
    for (const c of data ?? []) names.set(c.id, c.name);
  }

  const setupDone = customers > 0 && items > 0 && quotes.length > 0;
  const tiles = [
    { label: "Waiting on customers", value: money(stats.openValueCents), note: `${stats.counts.sent + stats.counts.viewed + stats.counts.changes_requested} open quotes` },
    { label: "Won this month", value: money(stats.wonThisMonthCents), note: "Approved or invoiced" },
    { label: "Win rate", value: stats.winRateBps === null ? "—" : formatBps(stats.winRateBps), note: stats.decided ? `${stats.decided} decided` : "Nothing decided yet" },
    { label: "Drafts", value: String(stats.counts.draft), note: "Not sent yet" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${org.name}.`}
        actions={canWrite && <ButtonLink href="/app/quotes/new">New quote</ButtonLink>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{t.note}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-medium">Needs your attention</h2>
      {attention.length === 0 ? (
        <Card className="p-5 text-sm text-neutral-600">
          {quotes.length === 0 ? "Once you send quotes, anything that needs a follow-up shows up here." : "Nothing needs following up right now."}
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-200">
          {attention.map((a) => (
            <div key={a.quote.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div className="min-w-0">
                <Link href={`/app/quotes/${a.quote.id}`} className="font-medium hover:underline">{a.quote.title || "Untitled"}</Link>
                <p className="text-neutral-600">
                  {names.get(a.quote.customer_id) ?? "—"} · {formatCents(a.quote.total_cents)}
                </p>
                <p className={a.severity === "high" ? "text-red-700" : "text-neutral-600"}>{a.reason}</p>
              </div>
              <Badge tone={STATUS_TONES[a.quote.status]}>{STATUS_LABELS[a.quote.status]}</Badge>
            </div>
          ))}
        </Card>
      )}

      {!setupDone && (
        <>
          <h2 className="mb-2 mt-8 font-medium">Getting started</h2>
          <Card className="divide-y divide-neutral-200">
            {[
              { done: true, label: "Create your business", href: "/app/settings", note: org.name },
              { done: customers > 0, label: "Add your customers", href: "/app/customers/new", note: `${customers} so far` },
              { done: items > 0, label: "Build your price list", href: "/app/catalog/new", note: `${items} items so far` },
              { done: quotes.length > 0, label: "Create your first quotation", href: "/app/quotes/new", note: `${quotes.length} so far` },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.done ? "bg-green-600 text-white" : "border border-neutral-300 text-neutral-400"}`}>{s.done ? "✓" : ""}</span>
                  <Link href={s.href} className="font-medium hover:underline">{s.label}</Link>
                </div>
                <span className="text-sm text-neutral-500">{s.note}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
