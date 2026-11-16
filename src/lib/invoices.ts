import type { InvoiceRow } from "./rows";

export const INVOICE_LABELS = { unpaid: "Unpaid", paid: "Paid", void: "Void", overdue: "Overdue" } as const;
export const INVOICE_TONES = { unpaid: "blue", paid: "green", void: "neutral", overdue: "red" } as const;
export type InvoiceDisplayStatus = keyof typeof INVOICE_LABELS;

/** Unpaid past its due date reads as overdue. `today` is a YYYY-MM-DD in the organisation's timezone. */
export function displayStatus(inv: Pick<InvoiceRow, "status" | "due_date">, today: string): InvoiceDisplayStatus {
  if (inv.status === "unpaid" && inv.due_date && inv.due_date < today) return "overdue";
  return inv.status;
}

export interface InvoiceInfo {
  number: string;
  issueDate: string;
  dueDate: string | null;
}

/** The invoice block that create_invoice stamps into the stored snapshot. */
export function invoiceInfo(snapshot: unknown): InvoiceInfo | null {
  const inv = (snapshot as { invoice?: Record<string, unknown> } | null)?.invoice;
  if (!inv || typeof inv.number !== "string" || typeof inv.issueDate !== "string") return null;
  return { number: inv.number, issueDate: inv.issueDate, dueDate: typeof inv.dueDate === "string" ? inv.dueDate : null };
}
