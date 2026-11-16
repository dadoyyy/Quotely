"use client";

import { createContext, useActionState, useContext, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/styles";
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
  return (
    <form action={formAction} className={className}>
      <Ctx.Provider value={state}>{children}</Ctx.Provider>
    </form>
  );
}

export function FormMessage() {
  const { error, message, ok } = useFormState();
  if (error) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p
        role="status"
        className={cn(
          "rounded-md border px-3 py-2 text-sm",
          ok
            ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
            : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900",
        )}
      >
        {message}
      </p>
    );
  }
  return null;
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
  variant?: "primary" | "secondary" | "danger" | "ghost";
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
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
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
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-neutral-900 dark:accent-neutral-100"
      />
      <label htmlFor={name} className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>}
      </label>
    </div>
  );
}
