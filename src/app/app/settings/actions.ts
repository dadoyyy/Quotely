"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { formValues, parseForm, type FormState } from "@/lib/validation/form";
import { settingsSchema } from "@/lib/validation/settings";

export async function updateSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseForm(settingsSchema, fd);
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values: formValues(fd) };

  const { org, isOwner } = await requireContext();
  if (!isOwner) return { error: "Only the owner can change business settings.", values: formValues(fd) };

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: d.name,
      email: d.email,
      phone: d.phone,
      address: d.address,
      tin: d.tin,
      vat_rate_bps: d.vatRateBps,
      default_validity_days: d.defaultValidityDays,
      default_terms: d.defaultTerms,
      quote_number_prefix: d.quoteNumberPrefix,
      invoice_number_prefix: d.invoiceNumberPrefix,
    })
    .eq("id", org.id)
    .select("id");
  if (error) return { error: friendlyError(error, "setting"), values: formValues(fd) };
  if (!data?.length) return { error: "Your changes weren't saved. You may not have permission.", values: formValues(fd) };

  revalidatePath("/app", "layout");
  return { ok: true, message: "Settings saved.", values: formValues(fd) };
}
