import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink, DownloadLink, buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/styles";
import { requireContext } from "@/lib/auth";
import { formatCents } from "@/lib/money-format";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/quotes/status";
import type { QuoteRow, QuoteStatus } from "@/lib/rows";
import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Quotes" };

const STATUSES = Object.keys(STATUS_LABELS) as QuoteStatus[];

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const { canWrite, org } = await requireContext();
  const term = sanitizeSearch(q);
  const statusFilter = STATUSES.find((s) => s === status);

  const supabase = await createClient();
  // Keep statuses honest: anything past its valid-until date is marked expired before we list.
  await supabase.rpc("expire_overdue_quotes", { p_org: org.id });
  let query = supabase
    .from("quotes")
    .select("id, customer_id, quote_number, version, status, title, total_cents, valid_until, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (term) query = query.or(`title.ilike.%${term}%,quote_number.ilike.%${term}%`);
  const { data, error } = await query;
  const quotes = (data ?? []) as Pick<QuoteRow, "id" | "customer_id" | "quote_number" | "version" | "status" | "title" | "total_cents" | "valid_until" | "updated_at">[];

  // Customers are fetched separately rather than embedded, so one missing row can never hide a quote.
  const ids = [...new Set(quotes.map((x) => x.customer_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: customers } = await supabase.from("customers").select("id, name").in("id", ids);
    for (const c of customers ?? []) names.set(c.id, c.name);
  }

  // Counts for the chips ignore the filter, so they always show the whole pipeline.
  const { data: all } = await supabase.from("quotes").select("status").limit(5000);
  const counts = new Map<string, number>();
  for (const r of all ?? []) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const chips: { label: string; status?: QuoteStatus; count: number }[] = [
    { label: "All", count: all?.length ?? 0 },
    ...STATUSES.filter((s) => counts.get(s)).map((s) => ({ label: STATUS_LABELS[s], status: s, count: counts.get(s) ?? 0 })),
  ];
  const chipHref = (st?: QuoteStatus) => {
    const p = new URLSearchParams();
    if (term) p.set("q", term);
    if (st) p.set("status", st);
    const qs = p.toString();
    return qs ? `/app/quotes?${qs}` : "/app/quotes";
  };

  const filtered = Boolean(term || statusFilter);
  return (
    <>
      <PageHeader
        title="Quotes"
        description="Every quotation you've written."
        actions={
          <>
            <DownloadLink href="/app/export/quotes">Export CSV</DownloadLink>
            {canWrite && <ButtonLink href="/app/quotes/new">New quote</ButtonLink>}
          </>
        }
      />

      <nav aria-label="Filter by status" className="mb-3 flex flex-wrap gap-1.5">
        {chips.map((c) => {
          const active = (c.status ?? undefined) === statusFilter;
          return (
            <Link
              key={c.label}
              href={chipHref(c.status)}
              aria-current={active ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"}`}
            >
              {c.label} <span className="opacity-70">{c.count}</span>
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} placeholder="Search title or number" aria-label="Search quotes" className={`${controlClass} max-w-xs`} />
        <select name="status" defaultValue={statusFilter ?? ""} aria-label="Filter by status" className={`${controlClass} w-auto`}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button type="submit" className={buttonClass("secondary")}>Filter</button>
        {filtered && <Link href="/app/quotes" className={buttonClass("ghost")}>Clear</Link>}
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600">Couldn&apos;t load quotes. Try refreshing.</p>
      ) : quotes.length === 0 ? (
        <EmptyState title={filtered ? "No quotes match that" : "No quotes yet"}>
          {!filtered && (canWrite ? <>Start your first quotation: pick a customer, add items, done.</> : <>Ask a teammate to create quotes.</>)}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Quote</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {quotes.map((x) => (
                <tr key={x.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/quotes/${x.id}`} className="font-medium hover:underline">{x.title || "Untitled"}</Link>
                    <div className="text-xs text-neutral-500">{x.quote_number ?? "Not numbered yet"}{x.version > 1 && ` · v${x.version}`}</div>
                  </td>
                  <td className="px-4 py-3">{names.get(x.customer_id) ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONES[x.status]}>{STATUS_LABELS[x.status]}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCents(x.total_cents)}</td>
                  <td className="px-4 py-3 text-neutral-600">{x.valid_until ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {quotes.length === 200 && <p className="mt-3 text-xs text-neutral-500">Showing the 200 most recent. Use search to narrow down.</p>}
    </>
  );
}
