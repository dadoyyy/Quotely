"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { addDays, todayIn } from "@/lib/quotes/model";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

function rpcError(error: { code?: string; message?: string }): string {
  if (error.code === "P0002") return "That couldn't be found, or you can't change it.";
  if (error.code === "23514") return error.message ?? "That isn't allowed.";
  return friendlyError(error, "invoice");
}

/** Invoice an approved quote. The due date defaults to 14 days out when left blank. */
export async function createInvoice(_prev: FormState, fd: FormData): Promise<FormState> {
  const quoteId = String(fd.get("quoteId") ?? "");
  if (!isUuid(quoteId)) return { error: "That quote couldn't be found." };
  const { org, canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view invoices but not create them." };

  const today = todayIn(org.timezone);
  const dueRaw = String(fd.get("dueDate") ?? "").trim();
  if (dueRaw && !validDate(dueRaw)) return { error: "Enter the due date as a real date.", fieldErrors: { dueDate: "Enter a real date" } };
  const due = dueRaw || addDays(today, 14);

  const supabase = await createClient();
  const id = randomUUID();
  const { error } = await supabase.rpc("create_invoice", { p_quote_id: quoteId, p_invoice_id: id, p_issue_date: today, p_due_date: due });
  if (error) return { error: rpcError(error) };

  revalidatePath("/app/quotes");
  revalidatePath("/app/invoices");
  redirect(`/app/invoices/${id}`);
}

async function setStatus(fd: FormData, status: "paid" | "unpaid" | "void"): Promise<FormState> {
  const id = String(fd.get("id") ?? "");
  if (!isUuid(id)) return { error: "That invoice couldn't be found." };
  const { canWrite } = await requireContext();
  if (!canWrite) return { error: "Your role can view invoices but not change them." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_invoice_status", {
    p_invoice_id: id,
    p_status: status,
    p_method: status === "paid" ? String(fd.get("method") ?? "") : null,
    p_reference: status === "paid" ? String(fd.get("reference") ?? "") : null,
  });
  if (error) return { error: rpcError(error) };
  revalidatePath(`/app/invoices/${id}`);
  revalidatePath("/app/invoices");
  return { ok: true };
}

export const markInvoicePaid = async (_p: FormState, fd: FormData) => setStatus(fd, "paid");
export const markInvoiceUnpaid = async (_p: FormState, fd: FormData) => setStatus(fd, "unpaid");
export const voidInvoice = async (_p: FormState, fd: FormData) => setStatus(fd, "void");
