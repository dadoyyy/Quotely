import Link from "next/link";
import { DownloadLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { INVOICE_LABELS, INVOICE_TONES, displayStatus } from "@/lib/invoices";
import { formatCents } from "@/lib/money-format";
import { todayIn } from "@/lib/quotes/model";
import type { InvoiceRow } from "@/lib/rows";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Invoices" };

type Row = Pick<InvoiceRow, "id" | "quote_id" | "invoice_number" | "issue_date" | "due_date" | "status" | "total_cents" | "paid_at"> & { customer?: string };

export default async function InvoicesPage() {
  const { org } = await requireContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, quote_id, invoice_number, issue_date, due_date, status, total_cents, paid_at, document_snapshot")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = ((data ?? []) as (Row & { document_snapshot: { customer?: { name?: string } } })[]).map((r) => ({ ...r, customer: r.document_snapshot?.customer?.name }));
  const today = todayIn(org.timezone);

  let outstanding = 0n;
  let overdue = 0n;
  for (const r of rows) {
    const s = displayStatus(r, today);
    if (s === "unpaid" || s === "overdue") outstanding += BigInt(r.total_cents);
    if (s === "overdue") overdue += BigInt(r.total_cents);
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Created from approved quotes."
        actions={rows.length ? <DownloadLink href="/app/export/invoices">Export CSV</DownloadLink> : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState title="No invoices yet">Open an approved quote and choose “Create invoice”.</EmptyState>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Card className="p-4"><p className="text-xs text-neutral-500">Outstanding</p><p className="text-xl font-semibold tabular-nums">{formatCents(Number(outstanding))}</p></Card>
            <Card className="p-4"><p className="text-xs text-neutral-500">Overdue</p><p className="text-xl font-semibold tabular-nums">{formatCents(Number(overdue))}</p></Card>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                <tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Due</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {rows.map((r) => {
                  const s = displayStatus(r, today);
                  return (
                    <tr key={r.id}>
                      <td className="p-3 font-medium"><Link href={`/app/invoices/${r.id}`} className="hover:underline">{r.invoice_number}</Link></td>
                      <td className="p-3">{r.customer ?? "—"}</td>
                      <td className="p-3">{r.due_date ?? "—"}</td>
                      <td className="p-3 text-right tabular-nums">{formatCents(r.total_cents)}</td>
                      <td className="p-3"><Badge tone={INVOICE_TONES[s]}>{INVOICE_LABELS[s]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
