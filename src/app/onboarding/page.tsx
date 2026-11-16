import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, Field, FormMessage, SubmitButton, TextInput } from "@/components/form";
import { getMembership, getUser } from "@/lib/auth";
import { createOrganization } from "./actions";

export const metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  if (!(await getUser())) redirect("/login");
  if (await getMembership()) redirect("/app");
  return (
    <AuthCard title="Set up your business" subtitle="This name appears on your quotations. You can change it later.">
      <ActionForm action={createOrganization} className="space-y-4">
        <Field label="Business name" name="name" required>
          <TextInput name="name" placeholder="e.g. Reyes Renovations" autoComplete="organization" required />
        </Field>
        <FormMessage />
        <SubmitButton pendingText="Creating…" className="w-full">Continue</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
