import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ActionForm, FormMessage, SelectInput, SubmitButton } from "@/components/form";
import { SAMPLE_CATALOGS } from "@/lib/seed/catalogs";
import { importSampleCatalog } from "./actions";
import { controlClass } from "@/components/ui/styles";
import { requireContext } from "@/lib/auth";
import { KIND_LABELS, UNIT_LABELS } from "@/lib/constants";
import { formatBps, formatCents } from "@/lib/money-format";
import type { CatalogItemRow } from "@/lib/rows";
import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Price list" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; archived?: string }>;
}) {
  const { q, category, archived } = await searchParams;
  const { canWrite } = await requireContext();
  const term = sanitizeSearch(q);
  const showArchived = archived === "1";

  const supabase = await createClient();
  let query = supabase.from("catalog_items").select("*").order("category", { nullsFirst: false }).order("name").limit(500);
  if (!showArchived) query = query.eq("is_active", true);
  if (category) query = query.eq("category", category);
  if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`);

  const [{ data, error }, { data: catRows }] = await Promise.all([
    query,
    supabase.from("catalog_items").select("category").not("category", "is", null).limit(1000),
  ]);
  const items = (data ?? []) as CatalogItemRow[];
  const categories = [...new Set((catRows ?? []).map((r) => r.category as string))].sort();
  const filtered = Boolean(term || category || showArchived);

  return (
    <>
      <PageHeader
        title="Price list"
        description="The services, labor and materials you quote. Prices here are starting points; you can change them on each quotation."
        actions={canWrite && <ButtonLink href="/app/catalog/new">Add item</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} placeholder="Search items" aria-label="Search items" className={`${controlClass} max-w-xs`} />
        <select name="category" defaultValue={category ?? ""} aria-label="Category" className={`${controlClass} max-w-xs`}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} className="h-4 w-4" />
          Show archived
        </label>
        <button type="submit" className={buttonClass("secondary")}>Filter</button>
        {filtered && <Link href="/app/catalog" className={buttonClass("ghost")}>Clear</Link>}
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600">Couldn&apos;t load the price list. Try refreshing.</p>
      ) : items.length === 0 ? (
        <EmptyState title={filtered ? "Nothing matches those filters" : "Your price list is empty"}>
          {!filtered && (canWrite ? <>Add the things you charge for, like labor, materials and fixed fees.</> : <>Ask the owner to add items.</>)}
          {!filtered && canWrite && (
            <ActionForm action={importSampleCatalog} className="mx-auto mt-4 flex max-w-md flex-col items-center gap-3">
              <p>Or start from a sample and change the prices to yours:</p>
              <SelectInput name="sample" aria-label="Sample price list">
                {SAMPLE_CATALOGS.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.items.length} items)</option>)}
              </SelectInput>
              <FormMessage />
              <SubmitButton variant="secondary" pendingText="Adding…">Add sample items</SubmitButton>
            </ActionForm>
          )}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Markup</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {items.map((i) => (
                <tr key={i.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${i.is_active ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3">
                    <Link href={`/app/catalog/${i.id}`} className="font-medium hover:underline">{i.name}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                      {i.category && <span>{i.category}</span>}
                      <Badge>{KIND_LABELS[i.kind]}</Badge>
                      {!i.is_taxable && <Badge tone="amber">No VAT</Badge>}
                      {!i.is_active && <Badge tone="red">Archived</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">per {UNIT_LABELS[i.unit]}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">{i.default_cost_cents ? formatCents(i.default_cost_cents) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">{i.default_markup_bps ? formatBps(i.default_markup_bps) : "—"}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCents(i.default_price_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
