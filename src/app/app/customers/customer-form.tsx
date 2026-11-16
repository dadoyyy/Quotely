import { CheckboxInput, Field, FormMessage, SubmitButton, TextArea, TextInput } from "@/components/form";
import type { CustomerRow } from "@/lib/rows";

/** The fields shared by "new" and "edit". Must sit inside an ActionForm. */
export function CustomerFields({ customer }: { customer?: CustomerRow }) {
  return (
    <>
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required>
          <TextInput name="name" defaultValue={customer?.name} autoComplete="off" required />
        </Field>
        <Field label="Company" name="company">
          <TextInput name="company" defaultValue={customer?.company ?? ""} autoComplete="off" />
        </Field>
        <Field label="Email" name="email" hint="Quotations are sent here.">
          <TextInput name="email" type="email" defaultValue={customer?.email ?? ""} autoComplete="off" />
        </Field>
        <Field label="Phone" name="phone">
          <TextInput name="phone" type="tel" defaultValue={customer?.phone ?? ""} autoComplete="off" />
        </Field>
        <Field label="TIN" name="tin" hint="Tax identification number, if they have one.">
          <TextInput name="tin" defaultValue={customer?.tin ?? ""} autoComplete="off" />
        </Field>
      </div>
      <Field label="Address" name="address">
        <TextArea name="address" defaultValue={customer?.address ?? ""} rows={2} />
      </Field>
      <Field label="Notes" name="notes" hint="Only you see these.">
        <TextArea name="notes" defaultValue={customer?.notes ?? ""} rows={3} />
      </Field>
      <CheckboxInput
        name="isVatExempt"
        label="VAT-exempt"
        hint="New quotations for this customer will charge no VAT."
        defaultChecked={customer?.is_vat_exempt ?? false}
      />
      <FormMessage />
      <div>
        <SubmitButton>{customer ? "Save changes" : "Add customer"}</SubmitButton>
      </div>
    </>
  );
}
