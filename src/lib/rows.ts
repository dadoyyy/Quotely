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
