import { CheckboxInput, Field, FormMessage, SelectInput, SubmitButton, TextArea, TextInput } from "@/components/form";
import { CATALOG_KINDS, KIND_LABELS, UNITS, UNIT_LABELS } from "@/lib/constants";
import { bpsToInput, centsToInput } from "@/lib/money-format";
import type { CatalogItemRow } from "@/lib/rows";

/** Shared by "new" and "edit". Must sit inside an ActionForm. */
export function CatalogFields({ item, categories }: { item?: CatalogItemRow; categories: string[] }) {
  // A price that differs from cost + markup was typed by hand; show it so it survives an edit.
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      {!item && <input type="hidden" name="isActive" value="true" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required>
          <TextInput name="name" defaultValue={item?.name} autoComplete="off" required />
        </Field>
        <Field label="Category" name="category" hint="Groups items in your list, e.g. Tiling, Catering.">
          <TextInput name="category" list="category-options" defaultValue={item?.category ?? ""} autoComplete="off" />
          <datalist id="category-options">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Type" name="kind" required>
          <SelectInput name="kind" defaultValue={item?.kind ?? "service"}>
            {CATALOG_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </SelectInput>
        </Field>
        <Field label="Unit" name="unit" required>
          <SelectInput name="unit" defaultValue={item?.unit ?? "lot"}>
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </SelectInput>
        </Field>
        <Field label="Your cost (₱)" name="costCents" hint="What it costs you per unit. Leave blank if you only set a price.">
          <TextInput name="costCents" inputMode="decimal" placeholder="0.00" defaultValue={item && item.default_cost_cents ? centsToInput(item.default_cost_cents) : ""} />
        </Field>
        <Field label="Markup (%)" name="markupBps" hint="Added on top of your cost.">
          <TextInput name="markupBps" inputMode="decimal" placeholder="0" defaultValue={item && item.default_markup_bps ? bpsToInput(item.default_markup_bps) : ""} />
        </Field>
        <Field label="Selling price (₱)" name="priceCents" hint="Optional. Leave blank to work it out from cost and markup.">
          <TextInput name="priceCents" inputMode="decimal" placeholder="Worked out for you" defaultValue={item && item.default_price_cents ? centsToInput(item.default_price_cents) : ""} />
        </Field>
        <Field label="SKU / code" name="sku">
          <TextInput name="sku" defaultValue={item?.sku ?? ""} autoComplete="off" />
        </Field>
      </div>
      <Field label="Description" name="description" hint="Shown on the quotation line.">
        <TextArea name="description" defaultValue={item?.description ?? ""} rows={2} />
      </Field>
      <CheckboxInput name="isTaxable" label="Charge VAT" hint="Untick for items that are not subject to VAT." defaultChecked={item?.is_taxable ?? true} />
      <FormMessage />
      <div>
        <SubmitButton>{item ? "Save changes" : "Add item"}</SubmitButton>
      </div>
    </>
  );
}
