"use client";

import { createContext, useActionState, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/styles";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validation/form";

const Ctx = createContext<FormState>({});
export const useFormState = () => useContext(Ctx);

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** A form bound to a server action. Errors and the submitted values flow down to the fields. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const toast = useToast();

  // Every result of a save is announced: success as a toast, problems as a toast plus the inline note below.
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
    else if (state.ok) toast.success("Saved.");
  }, [state, toast]);

  return (
    <form action={formAction} className={className}>
      <Ctx.Provider value={state}>{children}</Ctx.Provider>
    </form>
  );
}

/** The problem, in place next to the fields. Successes are shown as toasts instead. */
export function FormMessage() {
  const { error } = useFormState();
  if (!error) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 animate-enter">
      <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
      {error}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  className,
  confirm,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "accent" | "secondary" | "danger" | "ghost";
  className?: string;
  /** Ask before submitting, for destructive actions. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant, "md", className)}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {pending && (
        <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <circle cx="12" cy="12" r="9" opacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
        </svg>
      )}
      {pending ? pendingText : children}
    </button>
  );
}

export function Field({
  label,
  name,
  hint,
  required,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const error = useFormState().fieldErrors?.[name];
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

const control = controlClass;

function useControl(name: string, initial?: string) {
  const state = useFormState();
  return {
    invalid: Boolean(state.fieldErrors?.[name]),
    value: state.values?.[name] ?? initial,
  };
}

type TextProps = Omit<ComponentProps<"input">, "defaultValue" | "name"> & { name: string; defaultValue?: string };

export function TextInput({ name, defaultValue, className, ...props }: TextProps) {
  const { invalid, value } = useControl(name, defaultValue);
  return (
    <input
      id={name}
      name={name}
      defaultValue={value}
      aria-invalid={invalid || undefined}
      className={cn(control, invalid && "border-red-500", className)}
      {...props}
    />
  );
}

export function TextArea({
  name,
  defaultValue,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "defaultValue" | "name"> & { name: string; defaultValue?: string }) {
  const { invalid, value } = useControl(name, defaultValue);
  return (
    <textarea
      id={name}
      name={name}
      defaultValue={value}
      aria-invalid={invalid || undefined}
      className={cn(control, "min-h-24", invalid && "border-red-500", className)}
      {...props}
    />
  );
}

export function SelectInput({
  name,
  defaultValue,
  className,
  children,
  ...props
}: Omit<ComponentProps<"select">, "defaultValue" | "name"> & { name: string; defaultValue?: string }) {
  const { invalid, value } = useControl(name, defaultValue);
  return (
    <select
      id={name}
      name={name}
      defaultValue={value}
      aria-invalid={invalid || undefined}
      className={cn(control, invalid && "border-red-500", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function CheckboxInput({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  const state = useFormState();
  const checked = state.values ? state.values[name] === "on" : defaultChecked;
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="mt-0.5 size-4 cursor-pointer rounded border-neutral-300 accent-brand-600"
      />
      <label htmlFor={name} className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </label>
    </div>
  );
}

const ICONS = {
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
} as const;

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[18px]", className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** A text input with a leading icon. Pass `type="password"` to get a show/hide toggle. */
export function IconInput({ name, defaultValue, icon, className, type = "text", ...props }: TextProps & { icon: keyof typeof ICONS }) {
  const { invalid, value } = useControl(name, defaultValue);
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="group relative">
      <Glyph d={ICONS[icon]} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-brand-700" />
      <input
        id={name}
        name={name}
        type={isPassword && shown ? "text" : type}
        defaultValue={value}
        aria-invalid={invalid || undefined}
        className={cn(control, "pl-10", isPassword && "pr-11", invalid && "border-red-500", className)}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
        >
          <Glyph d={shown ? "M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12 12 0 0 1-2.6 3.4M6.6 7.4A12.5 12.5 0 0 0 2.5 12c1 2 4.5 6 9.5 6 1.4 0 2.7-.3 3.8-.8M9.9 9.9a3 3 0 0 0 4.2 4.2" : "M2.5 12c1-2 4.5-6 9.5-6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"} />
        </button>
      )}
    </div>
  );
}
