"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { PricingError, priceQuote } from "@/lib/pricing/engine";
import { addDays, payloadToPricingInput, todayIn } from "@/lib/quotes/model";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { formValues, type FormState } from "@/lib/validation/form";
import { quotePayloadSchema } from "@/lib/validation/quote";

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Start a draft from a customer and a title; the rest is copied from the business's defaults. */
export async function createQuote(_prev: FormState, fd: FormData): Promise<FormState> {
  const customerId = fd.get("customerId");
  const title = String(fd.get("title") ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!isUuid(customerId)) fieldErrors.customerId = "Choose a customer";
  if (!title) fieldErrors.title = "Give the quote a title";
  else if (title.length > 200) fieldErrors.title = "Keep it under 200 characters";
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields.", fieldErrors, values: formValues(fd) };

  const { org, user, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view quotes but not create them.", values: formValues(fd) };

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("id, is_vat_exempt").eq("id", customerId as string).eq("org_id", org.id).maybeSingle();
  if (!customer) return { error: "That customer couldn't be found.", values: formValues(fd) };

  const today = todayIn(org.timezone);
  const id = crypto.randomUUID();
  const { error } = await supabase.from("quotes").insert({
    id,
    org_id: org.id,
    customer_id: customer.id,
    root_quote_id: id,
    title,
    terms: org.default_terms,
    issue_date: today,
    valid_until: addDays(today, org.default_validity_days),
    vat_rate_bps: org.vat_rate_bps,
    customer_is_vat_exempt: customer.is_vat_exempt,
    created_by: user.id,
  });
  if (error) return { error: friendlyError(error, "quote"), values: formValues(fd) };

  revalidatePath("/app/quotes");
  redirect(`/app/quotes/${id}/edit`);
}

/**
 * Save a draft. The browser's totals are a preview: everything is parsed again here and priced by
 * the same engine, and only the server's numbers are stored.
 */
export async function saveQuoteDraft(quoteId: string, payload: unknown): Promise<SaveResult> {
  if (!isUuid(quoteId)) return { ok: false, error: "That quote couldn't be found." };
  const parsed = quotePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Some fields need attention before this can be saved.", fieldErrors };
  }
  const q = parsed.data;

  const { canWrite } = await requireContext();
  if (!canWrite) return { ok: false, error: "Your role can view quotes but not change them." };

  let priced;
  try {
    priced = priceQuote(payloadToPricingInput(q));
  } catch (e) {
    if (e instanceof PricingError) return { ok: false, error: e.message };
    throw e;
  }
  const byId = new Map(priced.lines.map((l) => [l.id, l]));

  const quote = {
    customer_id: q.customerId,
    title: q.title,
    scope: q.scope,
    terms: q.terms,
    notes: q.notes,
    issue_date: q.issueDate,
    valid_until: q.validUntil,
    vat_rate_bps: q.vatRateBps,
    customer_is_vat_exempt: q.customerIsVatExempt,
    deposit_percent_bps: q.depositPercentBps,
    discount_kind: q.discount.kind,
    discount_value: q.discount.kind === "percent" ? q.discount.bps : q.discount.kind === "fixed" ? q.discount.cents : 0,
    subtotal_cents: priced.subtotalCents,
    discount_cents: priced.discountCents,
    vat_cents: priced.vatCents,
    total_cents: priced.totalCents,
    deposit_cents: priced.depositCents,
  };
  const sections = q.sections.map((s, position) => ({ id: s.id, position, title: s.title }));
  const lines = q.lines.map((l, position) => ({
    id: l.id,
    section_id: l.sectionId,
    position,
    catalog_item_id: l.catalogItemId,
    name: l.name,
    description: l.description,
    kind: l.kind,
    unit: l.unit,
    quantity_milli: l.quantityMilli,
    unit_cost_cents: l.unitCostCents,
    markup_bps: l.markupBps,
    unit_price_override_cents: l.unitPriceOverrideCents,
    unit_price_cents: byId.get(l.id)!.unitPriceCents,
    line_discount_bps: l.lineDiscountBps,
    is_taxable: l.isTaxable,
  }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_quote_draft", {
    p_quote_id: quoteId,
    p_quote: quote,
    p_sections: sections,
    p_lines: lines,
  });
  if (error) {
    if (error.code === "P0002") return { ok: false, error: "That quote couldn't be found, or you can't change it." };
    if (error.code === "23514") return { ok: false, error: "This quote has already been sent and can no longer be edited." };
    if (error.code === "23503") return { ok: false, error: "A customer or price-list item on this quote no longer exists." };
    return { ok: false, error: friendlyError(error, "quote") };
  }

  revalidatePath("/app/quotes");
  revalidatePath(`/app/quotes/${quoteId}`);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function deleteDraftQuote(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That quote couldn't be found." };
  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view quotes but not delete them." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("quotes").delete().eq("id", id).eq("org_id", org.id).select("id");
  if (error) {
    return { error: error.code === "23514" ? "Only drafts can be deleted. A sent quote is part of your records." : friendlyError(error, "quote") };
  }
  if (!data?.length) return { error: "That quote couldn't be found, or you can't delete it." };

  revalidatePath("/app/quotes");
  redirect("/app/quotes");
}

/** Copy a sent quote into a new draft (next version). The old one stays as it is until the new one is sent. */
export async function createQuoteRevision(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That quote couldn't be found." };
  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view quotes but not revise them." };

  const today = todayIn(org.timezone);
  const newId = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_revision", {
    p_quote_id: id,
    p_new_id: newId,
    p_issue_date: today,
    p_valid_until: addDays(today, org.default_validity_days),
  });
  if (error) {
    if (error.code === "P0002") return { error: "That quote couldn't be found, or you can't change it." };
    if (error.code === "23514") return { error: error.message };
    return { error: friendlyError(error, "quote") };
  }

  revalidatePath("/app/quotes");
  redirect(`/app/quotes/${newId}/edit`);
}
