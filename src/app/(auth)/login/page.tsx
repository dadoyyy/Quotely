import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ActionForm, Field, FormMessage, SubmitButton, TextInput } from "@/components/form";
import { signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your quotations."
      footer={<>New here? <Link href="/signup" className="font-medium underline">Create an account</Link></>}
    >
      <ActionForm action={signIn} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" name="email" required>
          <TextInput name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" name="password" required>
          <TextInput name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormMessage />
        <SubmitButton pendingText="Signing in…" className="w-full">Sign in</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
