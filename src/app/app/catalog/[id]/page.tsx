import { notFound } from "next/navigation";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import type { CatalogItemRow } from "@/lib/rows";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { deleteCatalogItem, setCatalogItemActive, updateCatalogItem } from "../actions";
import { CatalogFields } from "../catalog-form";

export const metadata = { title: "Price list item" };

export default async function EditCatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { canWrite } = await requireContext();

  const supabase = await createClient();
  const [{ data }, { data: catRows }] = await Promise.all([
    supabase.from("catalog_items").select("*").eq("id", id).maybeSingle(),
    supabase.from("catalog_items").select("category").not("category", "is", null).limit(1000),
  ]);
  if (!data) notFound();
  const item = data as CatalogItemRow;
  const categories = [...new Set((catRows ?? []).map((r) => r.category as string))].sort();

  return (
    <>
      <PageHeader title={item.name} description={item.is_active ? undefined : "Archived: hidden from new quotations."} />
      {canWrite ? (
        <div className="space-y-6">
          <Card className="p-6">
            <ActionForm action={updateCatalogItem} className="space-y-4">
              <CatalogFields item={item} categories={categories} />
            </ActionForm>
          </Card>
          <Card className="space-y-6 p-6">
            <div>
              <h2 className="font-medium">{item.is_active ? "Archive" : "Restore"}</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {item.is_active
                  ? "Hides this item from new quotations. Quotations that already use it are not affected."
                  : "Makes this item available for new quotations again."}
              </p>
              <ActionForm action={setCatalogItemActive} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="active" value={item.is_active ? "false" : "true"} />
                <FormMessage />
                <SubmitButton variant="secondary" pendingText="Saving…">{item.is_active ? "Archive item" : "Restore item"}</SubmitButton>
              </ActionForm>
            </div>
            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <h2 className="font-medium">Delete item</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                This can&apos;t be undone. Archiving is usually better.
              </p>
              <ActionForm action={deleteCatalogItem} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={item.id} />
                <FormMessage />
                <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete ${item.name}? This can't be undone.`}>Delete item</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6 text-sm text-neutral-600">Your role can view this item but not change it.</Card>
      )}
    </>
  );
}
