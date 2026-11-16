"use client";

import { createContext, useActionState, useContext, useEffect, type ComponentProps, type ReactNode } from "react";
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
