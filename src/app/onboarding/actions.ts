"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { organizationSchema } from "@/lib/validation/auth";
import { formValues, parseForm, type FormState } from "@/lib/validation/form";

export async function createOrganization(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseForm(organizationSchema, fd);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: formValues(fd) };
  if (!(await getUser())) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { org_name: parsed.data.name });
  if (error) return { error: friendlyError(error, "business"), values: formValues(fd) };
  redirect("/app");
}
