import { z } from "zod";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
  /** What was submitted, so a failed save does not wipe the form (React resets uncontrolled inputs). */
  values?: Record<string, string>;
};

/** Text values from a submission, to hand back in FormState. */
export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string> };

/** Plain object from FormData: text fields as strings, unchecked checkboxes simply absent. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string" && !(key in out)) out[key] = value;
  }
  return out;
}

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData): ParseResult<z.output<S>> {
  const result = schema.safeParse(formToObject(fd));
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}

/** Blank or missing (a disabled input is not submitted) both mean "no value". */
export const emptyToNull = (v: unknown) =>
  v === undefined || (typeof v === "string" && v.trim() === "") ? null : v;

/** For fields read as text before conversion: missing becomes blank. */
export const missingToBlank = (v: unknown) => (v === undefined || v === null ? "" : v);

/** A trimmed optional text field: blank becomes null. */
export const optionalText = (max = 500) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Keep it under ${max} characters`).nullable());

/** A checkbox: present means on. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
