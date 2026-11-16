"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";
import { formValues, parseForm, type FormState } from "@/lib/validation/form";

const toRow = (d: CustomerInput) => ({
  name: d.name,
  company: d.company,
  email: d.email,
  phone: d.phone,
  address: d.address,
  tin: d.tin,
  is_vat_exempt: d.isVatExempt,
  notes: d.notes,
});

export async function createCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseForm(customerSchema, fd);
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values: formValues(fd) };

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view customers but not change them.", values: formValues(fd) };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({ org_id: org.id, ...toRow(parsed.data) });
  if (error) return { error: friendlyError(error, "customer"), values: formValues(fd) };

  revalidatePath("/app/customers");
  redirect("/app/customers");
}

export async function updateCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That customer couldn't be found." };
  const parsed = parseForm(customerSchema, fd);
  if (!parsed.ok) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors, values: formValues(fd) };

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view customers but not change them.", values: formValues(fd) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("org_id", org.id)
    .select("id");
  if (error) return { error: friendlyError(error, "customer"), values: formValues(fd) };
  if (!data?.length) return { error: "That customer couldn't be found, or you can't change it.", values: formValues(fd) };

  revalidatePath("/app/customers");
  redirect("/app/customers");
}

export async function deleteCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = fd.get("id");
  if (!isUuid(id)) return { error: "That customer couldn't be found." };

  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view customers but not change them." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").delete().eq("id", id).eq("org_id", org.id).select("id");
  if (error) {
    // A customer with quotes is protected by a foreign key.
    return { error: error.code === "23503" ? "This customer has quotes, so it can't be deleted." : friendlyError(error, "customer") };
  }
  if (!data?.length) return { error: "That customer couldn't be found, or you can't delete it." };

  revalidatePath("/app/customers");
  redirect("/app/customers");
}
