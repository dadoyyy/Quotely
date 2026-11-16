import { UNIT_LABELS } from "@/lib/constants";
import { formatBps, formatCents, milliToInput } from "@/lib/money-format";
import { safeBrandColor } from "@/lib/quotes/share";
import type { InvoiceInfo } from "@/lib/invoices";
import type { QuoteSnapshot } from "@/lib/quotes/snapshot";

/** What the customer sees and prints. Renders the stored snapshot only: never live rows, never cost. */
export function QuoteDocument({ snapshot: s, invoice, stamp }: { snapshot: QuoteSnapshot; invoice?: InvoiceInfo | null; stamp?: string | null }) {
  const brand = safeBrandColor(s.business.brandColor);
  const loose = s.lines.filter((l) => !l.sectionId || !s.sections.some((x) => x.id === l.sectionId));
  const groups = [
    ...(loose.length ? [{ id: "loose", title: null as string | null, lines: loose }] : []),
    ...s.sections.map((x) => ({ id: x.id, title: x.title || "Untitled section", lines: s.lines.filter((l) => l.sectionId === x.id) })).filter((g) => g.lines.length),
  ];
  const t = s.totals;

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-900 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none" style={{ borderTop: `4px solid ${brand}` }}>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.business.logoUrl && <img src={s.business.logoUrl} alt="" className="mb-3 h-12 w-auto" />}
          <h1 className="text-xl font-semibold" style={{ color: brand }}>{s.business.name}</h1>
          <div className="mt-1 space-y-0.5 text-neutral-600">
            {s.business.address && <p className="whitespace-pre-line">{s.business.address}</p>}
            {s.business.email && <p>{s.business.email}</p>}
            {s.business.phone && <p>{s.business.phone}</p>}
            {s.business.tin && <p>TIN {s.business.tin}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{invoice ? "Invoice" : "Quotation"}</p>
          <p className="text-lg font-semibold">{invoice ? invoice.number : (s.quote.number ?? "—")}</p>
          {invoice ? (
            <dl className="mt-2 space-y-0.5 text-neutral-600">
              <div>Issued {invoice.issueDate}</div>
              {invoice.dueDate && <div>Due {invoice.dueDate}</div>}
              {s.quote.number && <div>For quotation {s.quote.number}</div>}
            </dl>
          ) : (
            <>
              {s.quote.revision > 1 && <p className="text-neutral-500">Revision {s.quote.revision}</p>}
              <dl className="mt-2 space-y-0.5 text-neutral-600">
                {s.quote.issueDate && <div>Issued {s.quote.issueDate}</div>}
                {s.quote.validUntil && <div>Valid until {s.quote.validUntil}</div>}
              </dl>
            </>
          )}
          {stamp && <p className="mt-2 inline-block rounded border-2 border-current px-2 py-0.5 text-sm font-bold uppercase tracking-widest text-neutral-700">{stamp}</p>}
        </div>
      </header>

      <section className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{invoice ? "Bill to" : "Prepared for"}</p>
        <p className="mt-1 font-medium">{s.customer.name}</p>
        <div className="text-neutral-600">
          {s.customer.company && <p>{s.customer.company}</p>}
          {s.customer.address && <p className="whitespace-pre-line">{s.customer.address}</p>}
          {s.customer.email && <p>{s.customer.email}</p>}
          {s.customer.tin && <p>TIN {s.customer.tin}</p>}
        </div>
      </section>

      <h2 className="mt-8 text-lg font-semibold">{s.quote.title}</h2>
      {s.quote.scope && <p className="mt-2 whitespace-pre-wrap text-neutral-700">{s.quote.scope}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="stack-table w-full text-left">
          <thead className="border-b-2 text-xs uppercase tracking-wide text-neutral-500" style={{ borderColor: brand }}>
            <tr>
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="py-2 pl-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.id} className="divide-y divide-neutral-200 break-inside-avoid">
              {g.title && (
                <tr><th colSpan={4} className="bg-neutral-50 px-2 py-2 text-left font-semibold print:bg-transparent">{g.title}</th></tr>
              )}
              {g.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 pr-3">
                    <div className="font-medium">{l.name}</div>
                    {l.description && <div className="whitespace-pre-line text-xs text-neutral-500">{l.description}</div>}
                    {!l.isTaxable && !t.customerIsVatExempt && <div className="text-xs text-neutral-500">Not subject to VAT</div>}
                  </td>
                  <td data-label="Qty" className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{milliToInput(l.quantityMilli)} {UNIT_LABELS[l.unit]}</td>
                  <td data-label="Unit price" className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatCents(l.unitPriceCents)}</td>
                  <td data-label="Amount" className="whitespace-nowrap py-3 pl-3 text-right tabular-nums">
                    {formatCents(l.netCents)}
                    {l.lineDiscountBps > 0 && <div className="text-xs text-neutral-500">after {formatBps(l.lineDiscountBps)} discount</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 break-inside-avoid">
        <Row label="Subtotal" value={formatCents(t.subtotalCents)} />
        {t.discount.cents > 0 && (
          <Row label={t.discount.kind === "percent" ? `Discount (${formatBps(t.discount.value)})` : "Discount"} value={`−${formatCents(t.discount.cents)}`} />
        )}
        <Row label={t.customerIsVatExempt ? "VAT (exempt)" : `VAT (${formatBps(t.vatRateBps)})`} value={formatCents(t.vatCents)} />
        <div className="border-t-2 pt-2" style={{ borderColor: brand }}><Row label="Total" value={formatCents(t.totalCents)} strong /></div>
        {t.depositPercentBps > 0 && (
          <>
            <Row label={`Deposit due (${formatBps(t.depositPercentBps)})`} value={formatCents(t.depositCents)} />
            <Row label="Balance" value={formatCents(t.balanceCents)} />
          </>
        )}
      </dl>

      {s.quote.terms && (
        <section className="mt-8 break-inside-avoid border-t border-neutral-200 pt-4">
          <h3 className="font-semibold">Terms and conditions</h3>
          <p className="mt-1 whitespace-pre-wrap text-neutral-700">{s.quote.terms}</p>
        </section>
      )}
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 ${strong ? "text-base font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-neutral-600"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
