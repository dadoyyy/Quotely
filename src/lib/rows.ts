/** Row shapes as Supabase returns them (snake_case). They mirror src/db/schema.ts. */
export interface OrganizationRow {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  tin: string | null;
  brand_color: string;
  timezone: string;
  vat_rate_bps: number;
  default_validity_days: number;
  default_terms: string | null;
  quote_number_prefix: string;
  invoice_number_prefix: string;
  ai_enabled: boolean;
}

export interface CustomerRow {
  id: string;
  org_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tin: string | null;
  is_vat_exempt: boolean;
  notes: string | null;
  created_at: string;
}

export interface CatalogItemRow {
  id: string;
  org_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  kind: "service" | "material" | "labor" | "fee";
  unit: "hour" | "day" | "sqm" | "lm" | "piece" | "head" | "set" | "lot";
  default_cost_cents: number;
  default_markup_bps: number;
  default_price_cents: number;
  is_taxable: boolean;
  category: string | null;
  is_active: boolean;
}

export type QuoteStatus =
  | "draft" | "sent" | "viewed" | "approved" | "rejected" | "changes_requested" | "expired" | "superseded" | "invoiced";

export interface QuoteRow {
  id: string;
  org_id: string;
  customer_id: string;
  root_quote_id: string;
  quote_number: string | null;
  version: number;
  status: QuoteStatus;
  title: string;
  scope: string | null;
  terms: string | null;
  notes: string | null;
  issue_date: string | null;
  valid_until: string | null;
  vat_rate_bps: number;
  customer_is_vat_exempt: boolean;
  deposit_percent_bps: number;
  discount_kind: "none" | "percent" | "fixed";
  discount_value: number;
  subtotal_cents: number;
  discount_cents: number;
  vat_cents: number;
  total_cents: number;
  deposit_cents: number;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteSectionRow {
  id: string;
  org_id: string;
  quote_id: string;
  position: number;
  title: string;
}

export interface QuoteLineRow {
  id: string;
  org_id: string;
  quote_id: string;
  section_id: string | null;
  position: number;
  catalog_item_id: string | null;
  name: string;
  description: string | null;
  kind: "service" | "material" | "labor" | "fee";
  unit: "hour" | "day" | "sqm" | "lm" | "piece" | "head" | "set" | "lot";
  quantity_milli: number;
  unit_cost_cents: number;
  markup_bps: number;
  unit_price_override_cents: number | null;
  unit_price_cents: number;
  line_discount_bps: number;
  is_taxable: boolean;
}
