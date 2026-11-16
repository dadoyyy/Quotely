"use client";

import { useEffect, useRef, useState } from "react";
import { Field, IconInput } from "@/components/form";
import { PASSWORD_RULES, passwordScore } from "@/lib/password";
import { cn } from "@/lib/cn";

const LEVELS = [
  { label: "Too weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-brand-700" },
  { label: "Strong", bar: "bg-brand-500", text: "text-brand-700" },
  { label: "Excellent", bar: "bg-brand-600", text: "text-brand-700" },
] as const;

const Tick = ({ ok }: { ok: boolean }) => (
  <span className={cn("grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-200", ok ? "bg-brand-400 text-neutral-900" : "bg-neutral-200 text-transparent")}>
    <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  </span>
);

/** New password + confirmation, with a live strength meter and checklist. The server re-checks every rule. */
export function PasswordFields() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const box = useRef<HTMLDivElement>(null);
  // React clears uncontrolled inputs after a form action finishes; keep the checklist in step with that.
  useEffect(() => {
    const form = box.current?.closest("form");
    const clear = () => { setPw(""); setConfirm(""); };
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);
  const score = passwordScore(pw);
  const level = LEVELS[pw ? score : 0];
  const matches = confirm.length > 0 && confirm === pw;
  const mismatch = confirm.length > 0 && confirm !== pw;

  return (
    <div ref={box} className="space-y-4">
      <div className="space-y-3">
        <Field label="Password" name="password" required>
          <IconInput icon="lock" name="password" type="password" autoComplete="new-password" placeholder="Create a password" required onChange={(e) => setPw(e.target.value)} />
        </Field>
        <div aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1" aria-hidden>
              {PASSWORD_RULES.map((r, i) => (
                <span key={r.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", pw && i < score ? level.bar : "bg-neutral-200")} />
              ))}
            </div>
            <span className={cn("w-16 text-right text-xs font-semibold", pw ? level.text : "text-neutral-400")}>{pw ? level.label : "Strength"}</span>
          </div>
          <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-xs text-neutral-600 sm:grid-cols-2">
            {PASSWORD_RULES.map((r) => (
              <li key={r.id} className={cn("flex items-center gap-2", r.test(pw) && "text-neutral-900")}>
                <Tick ok={r.test(pw)} />
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-1.5">
        <Field label="Confirm password" name="confirmPassword" required>
          <IconInput icon="lock" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Type it again" required onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <p aria-live="polite" className={cn("flex h-4 items-center gap-1.5 text-xs", matches ? "text-brand-700" : mismatch ? "text-red-600" : "text-transparent")}>
          {matches ? <><Tick ok />Passwords match</> : mismatch ? "Passwords don't match yet" : "."}
        </p>
      </div>
    </div>
  );
}
