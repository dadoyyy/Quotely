import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { UNIT_LABELS } from "@/lib/constants";
import { formatBps, formatCents, milliToInput } from "@/lib/money-format";
import { marginBps, priceQuote } from "@/lib/pricing/engine";
import { groupLines, stateFromRows, rowsToPricingInput } from "@/lib/quotes/model";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/quotes/status";
import type { CustomerRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "@/lib/rows";
import { buildTimeline, type TimelineComment, type TimelineEvent } from "@/lib/quotes/timeline";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { deleteDraftQuote } from "../actions";
import { SharePanel } from "./share-panel";

export const metadata = { title: "Quote" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { canWrite, role, org } = await requireContext();

  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const quote = data as QuoteRow;

  const [sectionsRes, linesRes, customerRes, eventsRes, commentsRes] = await Promise.all([
    supabase.from("quote_sections").select("*").eq("quote_id", id),
    supabase.from("quote_lines").select("*").eq("quote_id", id),
    supabase.from("customers").select("*").eq("id", quote.customer_id).maybeSingle(),
    supabase.from("quote_events").select("id, type, actor_type, actor_label, created_at").eq("quote_id", id),
    supabase.from("quote_comments").select("id, author_label, body, created_at").eq("quote_id", id),
  ]);
  const timeline = buildTimeline((eventsRes.data ?? []) as TimelineEvent[], (commentsRes.data ?? []) as TimelineComment[]);
  const sections = (sectionsRes.data ?? []) as QuoteSectionRow[];
  const lines = (linesRes.data ?? []) as QuoteLineRow[];
  const customer = customerRes.data as CustomerRow | null;

  const state = stateFromRows(quote, sections, lines);
  const priced = priceQuote(rowsToPricingInput(quote, lines));
  const pricedById = new Map(priced.lines.map((l) => [l.id, l]));
  const rowById = new Map(lines.map((l) => [l.id, l]));
  const groups = groupLines(state);
  const isDraft = quote.status === "draft";
  const showMargin = role !== "viewer";

  return (
    <>
      <PageHeader
        title={quote.title || "Untitled quote"}
        description={`${quote.quote_number ?? "Draft, not numbered yet"}${quote.version > 1 ? ` · version ${quote.version}` : ""}`}
        actions={
          <>
            <Badge tone={STATUS_TONES[quote.status]}>{STATUS_LABELS[quote.status]}</Badge>
            {isDraft && canWrite && <ButtonLink href={`/app/quotes/${id}/edit`}>Edit quote</ButtonLink>}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card className="grid gap-4 p-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-neutral-500">Customer</p>
              <p className="font-medium">{customer ? <Link href={`/app/customers/${customer.id}`} className="hover:underline">{customer.name}</Link> : "—"}</p>
              {customer?.company && <p className="text-neutral-500">{customer.company}</p>}
            </div>
            <div><p className="text-neutral-500">Issued</p><p className="font-medium">{quote.issue_date ?? "—"}</p></div>
            <div><p className="text-neutral-500">Valid until</p><p className="font-medium">{quote.valid_until ?? "—"}</p></div>
          </Card>

          {quote.scope && (
            <Card className="p-5 text-sm">
              <h2 className="mb-1 font-medium">Scope of work</h2>
              <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{quote.scope}</p>
            </Card>
          )}

          <Card className="overflow-x-auto">
            {lines.length === 0 ? (
              <p className="p-5 text-sm text-neutral-500">No items yet.{isDraft && canWrite && <> <Link href={`/app/quotes/${id}/edit`} className="underline">Add some</Link>.</>}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit price</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.section?.id ?? "loose"} className="divide-y divide-neutral-200 border-b border-neutral-200 last:border-b-0 dark:divide-neutral-800 dark:border-neutral-800">
                    {g.section && (
                      <tr className="bg-neutral-50 dark:bg-neutral-800/50"><th colSpan={4} className="px-4 py-2 text-left font-semibold">{g.section.title || "Untitled section"}</th></tr>
                    )}
                    {g.lines.map((l) => {
                      const p = pricedById.get(l.id)!;
                      const row = rowById.get(l.id)!;
                      return (
                        <tr key={l.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{l.name}</div>
                            {l.description && <div className="text-xs text-neutral-500">{l.description}</div>}
                            {!row.is_taxable && <div className="text-xs text-neutral-500">No VAT</div>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{milliToInput(row.quantity_milli)} {UNIT_LABELS[row.unit]}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCents(p.unitPriceCents)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCents(p.netCents)}
                            {p.lineDiscountCents > 0 && <div className="text-xs text-neutral-500">−{formatBps(row.line_discount_bps)}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            )}
          </Card>

          {quote.terms && (
            <Card className="p-5 text-sm">
              <h2 className="mb-1 font-medium">Terms</h2>
              <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{quote.terms}</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 text-sm">
            <dl className="space-y-2">
              <Row label="Subtotal" value={formatCents(priced.subtotalCents)} />
              {priced.discountCents > 0 && <Row label="Discount" value={`−${formatCents(priced.discountCents)}`} />}
              <Row label={`VAT ${formatBps(quote.vat_rate_bps)}${quote.customer_is_vat_exempt ? " (exempt)" : ""}`} value={formatCents(priced.vatCents)} />
              <div className="border-t border-neutral-200 pt-2 dark:border-neutral-800"><Row label="Total" value={formatCents(priced.totalCents)} strong /></div>
              {quote.deposit_percent_bps > 0 && (
                <>
                  <Row label={`Deposit ${formatBps(quote.deposit_percent_bps)}`} value={formatCents(priced.depositCents)} />
                  <Row label="Balance" value={formatCents(priced.balanceCents)} />
                </>
              )}
            </dl>
          </Card>

          {showMargin && (
            <Card className="border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">Internal · never shown to your customer</p>
              <dl className="space-y-2">
                <Row label="Your cost" value={formatCents(priced.costCents)} />
                <Row label="Margin" value={`${formatCents(priced.marginCents)} · ${formatBps(Math.abs(marginBps(priced)))}${marginBps(priced) < 0 ? " below cost" : ""}`} />
              </dl>
            </Card>
          )}

          {canWrite && <SharePanel quoteId={quote.id} mode={isDraft ? "send" : "renew"} />}

          {timeline.length > 0 && (
            <Card className="p-5 text-sm">
              <h2 className="mb-3 font-medium">Activity</h2>
              <ol className="space-y-3">
                {timeline.map((t) => (
                  <li key={t.key}>
                    <p className="font-medium">{t.title}</p>
                    {t.body && <p className="mt-0.5 whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">&ldquo;{t.body}&rdquo;</p>}
                    <p className="text-xs text-neutral-500">{new Date(t.at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: org.timezone })}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {isDraft && canWrite && (
            <Card className="p-5">
              <h2 className="font-medium">Delete draft</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Only drafts can be deleted. This can&apos;t be undone.</p>
              <ActionForm action={deleteDraftQuote} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={quote.id} />
                <FormMessage />
                <SubmitButton variant="danger" pendingText="Deleting…" confirm="Delete this draft? This can't be undone.">Delete draft</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-base font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-neutral-600 dark:text-neutral-400"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
