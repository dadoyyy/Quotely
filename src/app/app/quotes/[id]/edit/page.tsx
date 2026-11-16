import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { stateFromRows } from "@/lib/quotes/model";
import type { CatalogItemRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "@/lib/rows";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable } from "@/lib/ai/config";
import { QuoteBuilder } from "./quote-builder";

export const metadata = { title: "Edit quote" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { org, canWrite } = await requireContext();

  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const quote = data as QuoteRow;
  if (quote.status !== "draft" || !canWrite) redirect(`/app/quotes/${id}`);

  const [sections, lines, customers, catalog] = await Promise.all([
    supabase.from("quote_sections").select("*").eq("quote_id", id),
    supabase.from("quote_lines").select("*").eq("quote_id", id),
    supabase.from("customers").select("id, name, company, is_vat_exempt").order("name").limit(500),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("name").limit(1000),
  ]);

  return (
    <QuoteBuilder
      quoteId={id}
      quoteNumber={quote.quote_number ? `${quote.quote_number}${quote.version > 1 ? ` · version ${quote.version}` : ""}` : null}
      initial={stateFromRows(quote, (sections.data ?? []) as QuoteSectionRow[], (lines.data ?? []) as QuoteLineRow[])}
      customers={customers.data ?? []}
      catalog={(catalog.data ?? []) as CatalogItemRow[]}
      aiEnabled={aiAvailable(org.ai_enabled)}
    />
  );
}
