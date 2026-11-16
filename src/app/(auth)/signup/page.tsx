import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, Field, FormMessage, SubmitButton, TextInput } from "@/components/form";
import { signUp } from "../actions";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Next you'll set up your business."
      footer={<>Already have an account? <Link href="/login" className="font-medium underline">Sign in</Link></>}
    >
      <ActionForm action={signUp} className="space-y-4">
        <Field label="Email" name="email" required>
          <TextInput name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" name="password" hint="At least 8 characters." required>
          <TextInput name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <FormMessage />
        <SubmitButton pendingText="Creating account…" className="w-full">Create account</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
