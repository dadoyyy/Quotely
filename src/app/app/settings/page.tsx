import { ActionForm, CheckboxInput, Field, FormMessage, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { bpsToInput } from "@/lib/money-format";
import { updateSettings } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { org, isOwner } = await requireContext();
  return (
    <>
      <PageHeader title="Settings" description="Your business details and the defaults new quotations start from." />
      {!isOwner && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Only the owner can change these.
        </p>
      )}
      <Card className="p-6">
        <ActionForm action={updateSettings} className="space-y-6">
          <fieldset disabled={!isOwner} className="space-y-6">
            <section className="space-y-4">
              <h2 className="font-medium">Business</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name" name="name" required>
                  <TextInput name="name" defaultValue={org.name} required />
                </Field>
                <Field label="TIN" name="tin">
                  <TextInput name="tin" defaultValue={org.tin ?? ""} />
                </Field>
                <Field label="Email" name="email" hint="Shown on quotations and used as the reply-to address.">
                  <TextInput name="email" type="email" defaultValue={org.email ?? ""} />
                </Field>
                <Field label="Phone" name="phone">
                  <TextInput name="phone" type="tel" defaultValue={org.phone ?? ""} />
                </Field>
              </div>
              <Field label="Address" name="address">
                <TextArea name="address" defaultValue={org.address ?? ""} rows={2} />
              </Field>
            </section>

            <section className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <h2 className="font-medium">Quotation defaults</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="VAT rate (%)" name="vatRateBps" hint="Applied to taxable lines. 12 in the Philippines." required>
                  <TextInput name="vatRateBps" inputMode="decimal" defaultValue={bpsToInput(org.vat_rate_bps)} required />
                </Field>
                <Field label="Valid for (days)" name="defaultValidityDays" hint="How long a quotation stays open after it's sent." required>
                  <TextInput name="defaultValidityDays" type="number" min={1} max={365} defaultValue={String(org.default_validity_days)} required />
                </Field>
                <Field label="Quotation number prefix" name="quoteNumberPrefix" hint="Numbers look like QUO-2026-0001." required>
                  <TextInput name="quoteNumberPrefix" defaultValue={org.quote_number_prefix} maxLength={8} required />
                </Field>
                <Field label="Invoice number prefix" name="invoiceNumberPrefix" required>
                  <TextInput name="invoiceNumberPrefix" defaultValue={org.invoice_number_prefix} maxLength={8} required />
                </Field>
              </div>
              <Field label="Default terms" name="defaultTerms" hint="Printed on every quotation unless you change it there.">
                <TextArea name="defaultTerms" defaultValue={org.default_terms ?? ""} rows={5} />
              </Field>
            </section>

            <section className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <h2 className="font-medium">AI drafting</h2>
              <CheckboxInput
                name="aiEnabled"
                label="Let my team draft quotes with AI"
                hint="Your team describes a job, and the AI suggests items from your price list. It never sets prices. When used, the description and any photos are sent to Google's Gemini."
                defaultChecked={org.ai_enabled}
              />
            </section>
          </fieldset>
          <FormMessage />
          {isOwner && <SubmitButton>Save settings</SubmitButton>}
        </ActionForm>
      </Card>
    </>
  );
}
