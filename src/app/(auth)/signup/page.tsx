import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, Field, FormMessage, IconInput, SubmitButton } from "@/components/form";
import { PasswordFields } from "@/components/password-fields";
import { signUp } from "../actions";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard
      mode="signup"
      title="Create your account"
      subtitle="Next you'll set up your business."
      footer={<>Already have an account? <Link href="/login" className="font-medium underline">Sign in</Link></>}
    >
      <ActionForm action={signUp} className="space-y-4">
        <Field label="Email" name="email" required>
          <IconInput icon="mail" placeholder="you@business.com" name="email" type="email" autoComplete="email" required />
        </Field>
        <PasswordFields />
        <FormMessage />
        <SubmitButton pendingText="Creating account…" className="w-full">Create account</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
