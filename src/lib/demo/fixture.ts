import { priceQuote } from "../pricing/engine";
import { resolvePrice } from "../pricing/catalog-price";
import type { PricedQuote } from "../pricing/types";
import type { QuoteSnapshot } from "../quotes/snapshot";
import { SAMPLE_CATALOGS, type SeedItem } from "../seed/catalogs";

/**
 * The public demo is built from the same sample price list and the same pricing engine the app uses,
 * with no database, so it can never show stale numbers or expose anyone's data.
 */
const renovation = SAMPLE_CATALOGS.find((c) => c.id === "renovation")!.items;
const item = (name: string): SeedItem => {
  const found = renovation.find((i) => i.name === name);
  if (!found) throw new Error(`demo item missing from the sample price list: ${name}`);
  return found;
};

interface DemoLine { id: string; section: string | null; item: SeedItem; quantityMilli: number; lineDiscountBps?: number; taxable?: boolean }

const SECTIONS = [
  { id: "bath", title: "Bathroom" },
  { id: "living", title: "Living room" },
];

export const DEMO_LINES: DemoLine[] = [
  { id: "l1", section: "bath", item: item("Demolition and hauling"), quantityMilli: 1000 },
  { id: "l2", section: "bath", item: item("Floor tile installation"), quantityMilli: 12500 },
  { id: "l3", section: "bath", item: item("Porcelain tile 60x60"), quantityMilli: 13500 },
  { id: "l4", section: "bath", item: item("Tile adhesive 25 kg"), quantityMilli: 6000 },
  { id: "l5", section: "living", item: item("Interior repaint"), quantityMilli: 42000 },
  { id: "l6", section: "living", item: item("Latex paint, semi-gloss 4 L"), quantityMilli: 5000 },
  { id: "l7", section: null, item: item("Permit processing assistance"), quantityMilli: 1000, taxable: false },
];

export const DEMO_VAT_BPS = 1200;
export const DEMO_DISCOUNT_BPS = 500;
export const DEMO_DEPOSIT_BPS = 5000;

export function buildDemo() {
  const priced: PricedQuote = priceQuote({
    lines: DEMO_LINES.map((l) => ({
      id: l.id,
      quantityMilli: l.quantityMilli,
      unitCostCents: l.item.costCents,
      markupBps: l.item.markupBps,
      unitPriceOverrideCents: null,
      lineDiscountBps: l.lineDiscountBps ?? 0,
      isTaxable: l.taxable ?? true,
    })),
    quoteDiscount: { kind: "percent", bps: DEMO_DISCOUNT_BPS },
    vatRateBps: DEMO_VAT_BPS,
    customerIsVatExempt: false,
    depositPercentBps: DEMO_DEPOSIT_BPS,
  });
  const byId = new Map(priced.lines.map((l) => [l.id, l]));

  // Only what a customer may see: no cost, no markup, no margin.
  const snapshot: QuoteSnapshot = {
    version: 1,
    currency: "PHP",
    quote: {
      number: "QT-2026-0042",
      title: "Bathroom and living room refresh",
      scope: "Replace the bathroom floor tiles and repaint the living room. Work takes about five working days.",
      terms: "50% down payment to schedule the work, balance on completion. Price valid for 30 days.",
      issueDate: "2026-11-16",
      validUntil: "2026-12-16",
      revision: 1,
      sentAt: null,
    },
    business: { name: "Sample Renovations Co.", logoUrl: null, address: "123 Sample Street, Quezon City", email: "hello@example.com", phone: null, tin: null, brandColor: "#0f766e" },
    customer: { name: "Maria Santos", company: null, email: null, phone: null, address: "Sample Village, Pasig City", tin: null },
    sections: SECTIONS,
    lines: DEMO_LINES.map((l) => {
      const p = byId.get(l.id)!;
      return {
        id: l.id,
        sectionId: l.section,
        name: l.item.name,
        description: l.item.description ?? null,
        unit: l.item.unit,
        quantityMilli: l.quantityMilli,
        unitPriceCents: p.unitPriceCents,
        lineDiscountBps: l.lineDiscountBps ?? 0,
        netCents: p.netCents,
        isTaxable: l.taxable ?? true,
      };
    }),
    totals: {
      subtotalCents: priced.subtotalCents,
      discount: { kind: "percent", value: DEMO_DISCOUNT_BPS, cents: priced.discountCents },
      customerIsVatExempt: false,
      vatRateBps: DEMO_VAT_BPS,
      vatCents: priced.vatCents,
      totalCents: priced.totalCents,
      depositPercentBps: DEMO_DEPOSIT_BPS,
      depositCents: priced.depositCents,
      balanceCents: priced.balanceCents,
    },
  };

  const internal = DEMO_LINES.map((l) => {
    const p = byId.get(l.id)!;
    return { id: l.id, name: l.item.name, costCents: p.costCents, unitCostCents: l.item.costCents, markupBps: l.item.markupBps, netCents: p.netCents };
  });

  return { priced, snapshot, internal };
}

/** An AI drafting example: the customer's words and what the AI may return (items by key, quantity only if stated). */
export const DEMO_AI = {
  text: "Hi, we'd like the bathroom floor retiled, about 12.5 sqm, and the living room repainted. Can you also handle the permit?",
  matches: [
    { name: "Floor tile installation", quantity: "12.5", reason: "Bathroom floor, 12.5 sqm stated" },
    { name: "Porcelain tile 60x60", quantity: null, reason: "Tiles are needed for the new floor" },
    { name: "Interior repaint", quantity: null, reason: "Living room repaint" },
    { name: "Permit processing assistance", quantity: null, reason: "Customer asked about the permit" },
  ],
  unmatched: ["Electrical rewiring"],
  prices: DEMO_LINES.reduce<Record<string, number>>((acc, l) => {
    acc[l.item.name] = resolvePrice({ costCents: l.item.costCents, markupBps: l.item.markupBps, priceCents: null });
    return acc;
  }, {}),
};
