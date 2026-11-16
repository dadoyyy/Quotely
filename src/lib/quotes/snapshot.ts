/**
 * The customer-facing document: the ONE place that decides what a customer may see.
 *
 * It is built by whitelisting fields, never by copying a row and deleting some, so a column added to
 * the database later cannot leak by accident. Cost, markup, margin, internal notes and ids of
 * people or organizations are not in it by construction, and a test proves it.
 *
 * It is stored on the quote when it is sent and never rewritten: what the customer approves is
 * exactly what was sent.
 */
import { z } from "zod";
import { UNITS } from "../constants";
import { priceQuote } from "../pricing/engine";
import type { CustomerRow, OrganizationRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "../rows";
import { rowsToPricingInput } from "./model";

const nullableText = z.string().nullable();

export const snapshotSchema = z.object({
  version: z.literal(1),
  currency: z.literal("PHP"),
  quote: z.object({
    number: z.string().nullable(),
    title: z.string(),
    scope: nullableText,
    terms: nullableText,
    issueDate: nullableText,
    validUntil: nullableText,
    revision: z.number().int(),
    sentAt: nullableText,
  }),
  business: z.object({
    name: z.string(),
    logoUrl: nullableText,
    address: nullableText,
    email: nullableText,
    phone: nullableText,
    tin: nullableText,
    brandColor: z.string(),
  }),
  customer: z.object({
    name: z.string(),
    company: nullableText,
    email: nullableText,
    phone: nullableText,
    address: nullableText,
    tin: nullableText,
  }),
  sections: z.array(z.object({ id: z.string(), title: z.string() })),
  lines: z.array(
    z.object({
      id: z.string(),
      sectionId: nullableText,
      name: z.string(),
      description: nullableText,
      unit: z.enum(UNITS),
      quantityMilli: z.number().int(),
      unitPriceCents: z.number().int(),
      lineDiscountBps: z.number().int(),
      netCents: z.number().int(),
      isTaxable: z.boolean(),
    }),
  ),
  totals: z.object({
    subtotalCents: z.number().int(),
    discount: z.object({ kind: z.enum(["none", "percent", "fixed"]), value: z.number().int(), cents: z.number().int() }),
    customerIsVatExempt: z.boolean(),
    vatRateBps: z.number().int(),
    vatCents: z.number().int(),
    totalCents: z.number().int(),
    depositPercentBps: z.number().int(),
    depositCents: z.number().int(),
    balanceCents: z.number().int(),
  }),
});

export type QuoteSnapshot = z.infer<typeof snapshotSchema>;


export interface SnapshotSource {
  quote: QuoteRow;
  sections: QuoteSectionRow[];
  lines: QuoteLineRow[];
  customer: CustomerRow;
  org: OrganizationRow;
}

/** The number and send time are filled in by the database at the moment of sending. */
export function buildSnapshot({ quote, sections, lines, customer, org }: SnapshotSource): QuoteSnapshot {
  const priced = priceQuote(rowsToPricingInput(quote, lines));
  const byId = new Map(priced.lines.map((l) => [l.id, l]));
  const ordered = [...lines].sort((a, b) => a.position - b.position);

  return {
    version: 1,
    currency: "PHP",
    quote: {
      number: quote.quote_number,
      title: quote.title,
      scope: quote.scope,
      terms: quote.terms,
      issueDate: quote.issue_date,
      validUntil: quote.valid_until,
      revision: quote.version,
      sentAt: null,
    },
    business: {
      name: org.name,
      logoUrl: org.logo_url,
      address: org.address,
      email: org.email,
      phone: org.phone,
      tin: org.tin,
      brandColor: org.brand_color,
    },
    customer: {
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      tin: customer.tin,
    },
    sections: [...sections].sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, title: s.title })),
    lines: ordered.map((l) => {
      const p = byId.get(l.id)!;
      return {
        id: l.id,
        sectionId: l.section_id,
        name: l.name,
        description: l.description,
        unit: l.unit,
        quantityMilli: l.quantity_milli,
        unitPriceCents: p.unitPriceCents,
        lineDiscountBps: l.line_discount_bps,
        netCents: p.netCents,
        isTaxable: l.is_taxable,
      };
    }),
    totals: {
      subtotalCents: priced.subtotalCents,
      discount: { kind: quote.discount_kind, value: quote.discount_value, cents: priced.discountCents },
      customerIsVatExempt: quote.customer_is_vat_exempt,
      vatRateBps: quote.vat_rate_bps,
      vatCents: priced.vatCents,
      totalCents: priced.totalCents,
      depositPercentBps: quote.deposit_percent_bps,
      depositCents: priced.depositCents,
      balanceCents: priced.balanceCents,
    },
  };
}
