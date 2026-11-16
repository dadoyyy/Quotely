"use server";

import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { parseForm, type FormState } from "@/lib/validation/form";

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  const parsed = parseForm(loginSchema, fd);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const wrong = /invalid login credentials/i.test(error.message);
    const unconfirmed = /email not confirmed/i.test(error.message);
    return {
      error: wrong
        ? "Wrong email or password."
        : unconfirmed
          ? "Confirm your email first: check your inbox for the link we sent."
          : "We couldn't sign you in. Please try again.",
      values: { email },
    };
  }
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  const parsed = parseForm(signupSchema, fd);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: { email } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) {
    const limited = /rate limit/i.test(error.message);
    return {
      error: limited
        ? "Too many sign-up emails were sent. Wait a few minutes, or turn off email confirmation in Supabase while developing."
        : error.message,
      values: { email },
    };
  }
  if (data.session) redirect("/app"); // email confirmation is off: already signed in
  return { ok: true, message: "Almost there. Check your email and click the link to confirm your account.", values: { email } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
