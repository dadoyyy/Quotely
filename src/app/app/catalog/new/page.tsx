import { ActionForm } from "@/components/form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCatalogItem } from "../actions";
import { CatalogFields } from "../catalog-form";

export const metadata = { title: "Add item" };

export default async function NewCatalogItemPage() {
  const { canWrite } = await requireContext();
  const supabase = await createClient();
  const { data } = await supabase.from("catalog_items").select("category").not("category", "is", null).limit(1000);
  const categories = [...new Set((data ?? []).map((r) => r.category as string))].sort();

  return (
    <>
      <PageHeader title="Add item" />
      {canWrite ? (
        <Card className="p-6">
          <ActionForm action={createCatalogItem} className="space-y-4">
            <CatalogFields categories={categories} />
          </ActionForm>
        </Card>
      ) : (
        <p className="text-sm text-neutral-600">Your role can view the price list but not add to it.</p>
      )}
    </>
  );
}
