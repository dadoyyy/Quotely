import { NextResponse, type NextRequest } from "next/server";
import { requireContext } from "@/lib/auth";
import { pesos, toCsv, type Cell } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LIMIT = 10000;
const file = (name: string, org: string, body: string) =>
  new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-${org.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "export"}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });

/** Download quotes, invoices or customers as CSV. Row-level security scopes it to the signed-in business. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { org } = await requireContext();
  const supabase = await createClient();

  if (kind === "quotes") {
    const { data, error } = await supabase
      .from("quotes")
      .select("quote_number, version, status, title, customer_id, issue_date, valid_until, subtotal_cents, vat_cents, total_cents, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) return NextResponse.json({ error: "export failed" }, { status: 500 });
    const { data: customers } = await supabase.from("customers").select("id, name").limit(LIMIT);
    const names = new Map((customers ?? []).map((c) => [c.id, c.name]));
    return file("quotes", org.name, toCsv(
      ["Quote number", "Version", "Status", "Title", "Customer", "Issued", "Valid until", "Subtotal", "VAT", "Total", "Sent at"],
      (data ?? []).map((q): Cell[] => [q.quote_number, q.version, q.status, q.title, names.get(q.customer_id), q.issue_date, q.valid_until, pesos(q.subtotal_cents), pesos(q.vat_cents), pesos(q.total_cents), q.sent_at]),
    ));
  }

  if (kind === "invoices") {
    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number, status, issue_date, due_date, total_cents, paid_at, paid_method, paid_reference, document_snapshot")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) return NextResponse.json({ error: "export failed" }, { status: 500 });
    return file("invoices", org.name, toCsv(
      ["Invoice number", "Customer", "Status", "Issued", "Due", "Total", "Paid at", "Payment method", "Payment reference"],
      (data ?? []).map((i): Cell[] => [i.invoice_number, (i.document_snapshot as { customer?: { name?: string } })?.customer?.name, i.status, i.issue_date, i.due_date, pesos(i.total_cents), i.paid_at, i.paid_method, i.paid_reference]),
    ));
  }

  if (kind === "customers") {
    const { data, error } = await supabase
      .from("customers")
      .select("name, company, email, phone, address, tin, is_vat_exempt")
      .order("name")
      .limit(LIMIT);
    if (error) return NextResponse.json({ error: "export failed" }, { status: 500 });
    return file("customers", org.name, toCsv(
      ["Name", "Company", "Email", "Phone", "Address", "TIN", "VAT exempt"],
      (data ?? []).map((c): Cell[] => [c.name, c.company, c.email, c.phone, c.address, c.tin, c.is_vat_exempt ? "yes" : "no"]),
    ));
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
