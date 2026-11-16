import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Field, FormMessage, SubmitButton, TextInput } from "@/components/form";
import { QuoteDocument } from "@/components/quote-document";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { INVOICE_LABELS, INVOICE_TONES, displayStatus, invoiceInfo } from "@/lib/invoices";
import { todayIn } from "@/lib/quotes/model";
import { snapshotSchema } from "@/lib/quotes/snapshot";
import type { InvoiceRow } from "@/lib/rows";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/app/q/[token]/print-button";
import { markInvoicePaid, markInvoiceUnpaid, voidInvoice } from "../actions";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { org, canWrite } = await requireContext();
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const inv = data as InvoiceRow;
  const parsed = snapshotSchema.safeParse(inv.document_snapshot);
  const info = invoiceInfo(inv.document_snapshot);
  const status = displayStatus(inv, todayIn(org.timezone));
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: org.timezone });

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={inv.invoice_number}
          description={parsed.success ? parsed.data.customer.name : undefined}
          actions={
            <>
              <Badge tone={INVOICE_TONES[status]}>{INVOICE_LABELS[status]}</Badge>
              <Link href={`/app/quotes/${inv.quote_id}`} className="text-sm underline">View quote</Link>
              <PrintButton />
            </>
          }
        />
        {inv.status === "paid" && inv.paid_at && (
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
            Paid {when(inv.paid_at)}{inv.paid_method ? ` by ${inv.paid_method}` : ""}{inv.paid_reference ? ` (ref ${inv.paid_reference})` : ""}.
          </p>
        )}
        {canWrite && inv.status === "unpaid" && (
          <Card className="mb-4 space-y-3 p-5">
            <h2 className="font-medium">Record payment</h2>
            <ActionForm action={markInvoicePaid} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={inv.id} />
              <Field label="Method" name="method"><TextInput name="method" placeholder="GCash, bank transfer, cash" maxLength={60} /></Field>
              <Field label="Reference" name="reference"><TextInput name="reference" placeholder="Optional" maxLength={120} /></Field>
              <div className="flex items-end"><SubmitButton pendingText="Saving…">Mark as paid</SubmitButton></div>
              <div className="sm:col-span-3"><FormMessage /></div>
            </ActionForm>
            <ActionForm action={voidInvoice} className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <input type="hidden" name="id" value={inv.id} />
              <FormMessage />
              <SubmitButton variant="danger" pendingText="Voiding…" confirm="Void this invoice? A voided invoice can't be reopened.">Void invoice</SubmitButton>
            </ActionForm>
          </Card>
        )}
        {canWrite && inv.status === "paid" && (
          <ActionForm action={markInvoiceUnpaid} className="mb-4">
            <input type="hidden" name="id" value={inv.id} />
            <FormMessage />
            <SubmitButton variant="secondary" pendingText="Saving…" confirm="Mark this invoice as unpaid again?">Undo payment</SubmitButton>
          </ActionForm>
        )}
      </div>
      {parsed.success ? (
        <QuoteDocument snapshot={parsed.data} invoice={info} stamp={inv.status === "paid" ? "Paid" : inv.status === "void" ? "Void" : null} />
      ) : (
        <Card className="p-5 text-sm">This invoice&apos;s stored document couldn&apos;t be read.</Card>
      )}
    </>
  );
}
