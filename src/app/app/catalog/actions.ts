"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { resolvePrice } from "@/lib/pricing/catalog-price";
import { sampleCatalog } from "@/lib/seed/catalogs";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { catalogItemSchema, type CatalogItemInput } from "@/lib/validation/catalog";
import { formValues, parseForm, type FormState } from "@/lib/validation/form";

const toRow = (d: CatalogItemInput) => ({
  name: d.name,
  sku: d.sku,
  description: d.description,
  category: d.category,
  kind: d.kind,
  unit: d.unit,
  default_cost_cents: d.costCents,
  default_markup_bps: d.markupBps,
  default_price_cents: resolvePrice(d),
  is_taxable: d.isTaxable,
  is_active: d.isActive,
});

export async function createCatalogItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseForm(catalogItemSchema, fd);
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values: formValues(fd) };

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view the price list but not change it.", values: formValues(fd) };

  const supabase = await createClient();
  const { error } = await supabase.from("catalog_items").insert({ org_id: org.id, ...toRow(parsed.data) });
  if (error) return { error: friendlyError(error, "item"), values: formValues(fd) };

  revalidatePath("/app/catalog");
  redirect("/app/catalog");
}

export async function updateCatalogItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That item couldn't be found." };
  const parsed = parseForm(catalogItemSchema, fd);
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values: formValues(fd) };

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view the price list but not change it.", values: formValues(fd) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("org_id", org.id)
    .select("id");
  if (error) return { error: friendlyError(error, "item"), values: formValues(fd) };
  if (!data?.length) return { error: "That item couldn't be found, or you can't change it.", values: formValues(fd) };

  revalidatePath("/app/catalog");
  redirect("/app/catalog");
}

/** Archive hides an item from new quotes; quotes already written keep their copy. */
export async function setCatalogItemActive(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That item couldn't be found." };
  const active = fd.get("active") === "true";

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view the price list but not change it." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update({ is_active: active })
    .eq("id", id)
    .eq("org_id", org.id)
    .select("id");
  if (error) return { error: friendlyError(error, "item") };
  if (!data?.length) return { error: "That item couldn't be found, or you can't change it." };

  revalidatePath("/app/catalog");
  redirect("/app/catalog");
}

export async function deleteCatalogItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That item couldn't be found." };

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view the price list but not change it." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("catalog_items").delete().eq("id", id).eq("org_id", org.id).select("id");
  if (error) return { error: friendlyError(error, "item") };
  if (!data?.length) return { error: "That item couldn't be found, or you can't delete it." };

  revalidatePath("/app/catalog");
  redirect("/app/catalog");
}

/** Add a starter price list. Items whose name already exists are skipped, so it is safe to run twice. */
export async function importSampleCatalog(_prev: FormState, fd: FormData): Promise<FormState> {
  const sample = sampleCatalog(String(fd.get("sample") ?? ""));
  if (!sample) return { error: "Pick one of the sample price lists." };
  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view the price list but not change it." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("catalog_items").select("name").limit(2000);
  const have = new Set((existing ?? []).map((r) => String(r.name).trim().toLowerCase()));
  const fresh = sample.items.filter((i) => !have.has(i.name.trim().toLowerCase()));
  if (fresh.length) {
    const { error } = await supabase.from("catalog_items").insert(
      fresh.map((i) => ({
        org_id: org.id,
        name: i.name,
        description: i.description ?? null,
        category: i.category,
        kind: i.kind,
        unit: i.unit,
        default_cost_cents: i.costCents,
        default_markup_bps: i.markupBps,
        default_price_cents: resolvePrice({ costCents: i.costCents, markupBps: i.markupBps, priceCents: null }),
        is_taxable: true,
        is_active: true,
      })),
    );
    if (error) return { error: friendlyError(error, "item") };
  }
  revalidatePath("/app/catalog");
  return { ok: true, message: fresh.length ? `Added ${fresh.length} items. Adjust the prices to match yours.` : "Those items are already in your price list." };
}
