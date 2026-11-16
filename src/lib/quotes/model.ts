/**
 * The quote builder's logic, free of React so it can be tested alone.
 *
 * The screen holds everything as the strings people type. This module turns those strings into a
 * validated payload (or a list of per-field errors), prices them with the one pricing engine, and
 * does the list operations (reorder, duplicate, sections). The server runs the same conversion
 * and re-prices, so the browser's numbers are a preview, never the truth.
 */
import type { CatalogKind, Unit } from "../constants";
import {
  bpsToInput,
  centsToInput,
  milliToInput,
  parsePercentToBps,
  parsePesosToCents,
  parseQuantityToMilli,
} from "../money-format";
import { PricingError, priceQuote } from "../pricing/engine";
import { resolvePrice } from "../pricing/catalog-price";
import type { PricedQuote, PricingInput, QuoteDiscount } from "../pricing/types";
import type { CatalogItemRow, QuoteLineRow, QuoteRow, QuoteSectionRow } from "../rows";

export type DiscountKind = "none" | "percent" | "fixed";

export interface LineDraft {
  id: string;
  sectionId: string | null;
  catalogItemId: string | null;
  name: string;
  description: string;
  kind: CatalogKind;
  unit: Unit;
  quantity: string;
  cost: string;
  markup: string;
  /** Blank means "use cost + markup". */
  price: string;
  discount: string;
  taxable: boolean;
}

export interface SectionDraft {
  id: string;
  title: string;
}

export interface HeaderDraft {
  customerId: string;
  title: string;
  scope: string;
  terms: string;
  notes: string;
  issueDate: string;
  validUntil: string;
  vatRate: string;
  vatExempt: boolean;
  depositPercent: string;
  discountKind: DiscountKind;
  discountValue: string;
}

export interface QuoteDraftState {
  header: HeaderDraft;
  sections: SectionDraft[];
  lines: LineDraft[];
}

/** What is sent to the server: parsed, typed, no totals. */
export interface QuotePayload {
  customerId: string;
  title: string;
  scope: string;
  terms: string;
  notes: string;
  issueDate: string | null;
  validUntil: string | null;
  vatRateBps: number;
  customerIsVatExempt: boolean;
  depositPercentBps: number;
  discount: QuoteDiscount;
  sections: { id: string; title: string }[];
  lines: {
    id: string;
    sectionId: string | null;
    catalogItemId: string | null;
    name: string;
    description: string;
    kind: CatalogKind;
    unit: Unit;
    quantityMilli: number;
    unitCostCents: number;
    markupBps: number;
    unitPriceOverrideCents: number | null;
    lineDiscountBps: number;
    isTaxable: boolean;
  }[];
}

export type FieldErrors = Record<string, string>;

export interface Built {
  /** Set when every field is valid; the thing to save. */
  payload: QuotePayload | null;
  /** Totals for display. Present whenever the numbers could be calculated, even with errors elsewhere. */
  priced: PricedQuote | null;
  lineErrors: Record<string, FieldErrors>;
  headerErrors: FieldErrors;
  /** e.g. "Amounts are too large to calculate". */
  pricingError: string | null;
}

export const newId = () => crypto.randomUUID();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const blank = (s: string) => s.trim() === "";

function parseLine(l: LineDraft) {
  const errors: FieldErrors = {};
  const need = <T>(value: T | null, field: string, message: string, fallback: T): T => {
    if (value === null) {
      errors[field] = message;
      return fallback;
    }
    return value;
  };

  if (blank(l.name)) errors.name = "Give this line a name";
  const quantityMilli = need(parseQuantityToMilli(l.quantity), "quantity", "Enter a quantity above 0", 0);
  const unitCostCents = blank(l.cost) ? 0 : need(parsePesosToCents(l.cost), "cost", "Enter an amount like 1250.50", 0);
  const markupBps = blank(l.markup) ? 0 : need(parsePercentToBps(l.markup), "markup", "Enter a percentage", 0);
  const unitPriceOverrideCents = blank(l.price)
    ? null
    : need<number | null>(parsePesosToCents(l.price), "price", "Enter an amount like 1250.50", null);
  let lineDiscountBps = blank(l.discount) ? 0 : need(parsePercentToBps(l.discount), "discount", "Enter a percentage", 0);
  if (lineDiscountBps > 10_000) {
    errors.discount = "A discount cannot be over 100%";
    lineDiscountBps = 0;
  }

  return {
    errors,
    value: {
      id: l.id,
      sectionId: l.sectionId,
      catalogItemId: l.catalogItemId,
      name: l.name.trim(),
      description: l.description.trim(),
      kind: l.kind,
      unit: l.unit,
      quantityMilli,
      unitCostCents,
      markupBps,
      unitPriceOverrideCents,
      lineDiscountBps,
      isTaxable: l.taxable,
    },
  };
}

function parseHeader(h: HeaderDraft) {
  const errors: FieldErrors = {};
  if (blank(h.customerId)) errors.customerId = "Choose a customer";
  if (blank(h.title)) errors.title = "Give the quote a title";

  let vatRateBps = 0;
  const vat = parsePercentToBps(h.vatRate);
  if (vat === null || vat > 10_000) errors.vatRate = "Enter a rate between 0% and 100%";
  else vatRateBps = vat;

  let depositPercentBps = 0;
  if (!blank(h.depositPercent)) {
    const d = parsePercentToBps(h.depositPercent);
    if (d === null || d > 10_000) errors.depositPercent = "Enter a deposit between 0% and 100%";
    else depositPercentBps = d;
  }

  let discount: QuoteDiscount = { kind: "none" };
  if (h.discountKind !== "none" && !blank(h.discountValue)) {
    if (h.discountKind === "percent") {
      const b = parsePercentToBps(h.discountValue);
      if (b === null || b > 10_000) errors.discountValue = "Enter a discount between 0% and 100%";
      else discount = { kind: "percent", bps: b };
    } else {
      const c = parsePesosToCents(h.discountValue);
      if (c === null) errors.discountValue = "Enter an amount like 500.00";
      else discount = { kind: "fixed", cents: c };
    }
  }

  const issueDate = blank(h.issueDate) ? null : h.issueDate;
  const validUntil = blank(h.validUntil) ? null : h.validUntil;
  if (issueDate && !ISO_DATE.test(issueDate)) errors.issueDate = "Pick a valid date";
  if (validUntil && !ISO_DATE.test(validUntil)) errors.validUntil = "Pick a valid date";
  if (issueDate && validUntil && !errors.issueDate && !errors.validUntil && validUntil < issueDate) {
    errors.validUntil = "Valid until must be on or after the issue date";
  }

  return {
    errors,
    value: { vatRateBps, depositPercentBps, discount, issueDate, validUntil },
  };
}

export function payloadToPricingInput(p: QuotePayload): PricingInput {
  return {
    lines: p.lines.map((l) => ({
      id: l.id,
      quantityMilli: l.quantityMilli,
      unitCostCents: l.unitCostCents,
      markupBps: l.markupBps,
      unitPriceOverrideCents: l.unitPriceOverrideCents,
      lineDiscountBps: l.lineDiscountBps,
      isTaxable: l.isTaxable,
    })),
    quoteDiscount: p.discount,
    vatRateBps: p.vatRateBps,
    customerIsVatExempt: p.customerIsVatExempt,
    depositPercentBps: p.depositPercentBps,
  };
}

/** Parse everything, price what can be priced, and say exactly what is wrong where. */
export function buildQuote(state: QuoteDraftState): Built {
  const header = parseHeader(state.header);
  const lineErrors: Record<string, FieldErrors> = {};
  const parsedLines = state.lines.map((l) => {
    const r = parseLine(l);
    if (Object.keys(r.errors).length) lineErrors[l.id] = r.errors;
    return r.value;
  });

  // A line pointing at a missing section would violate a foreign key; treat it as unsectioned.
  const sectionIds = new Set(state.sections.map((s) => s.id));
  const lines = parsedLines.map((l) => (l.sectionId && !sectionIds.has(l.sectionId) ? { ...l, sectionId: null } : l));

  const payload: QuotePayload = {
    customerId: state.header.customerId,
    title: state.header.title.trim(),
    scope: state.header.scope.trim(),
    terms: state.header.terms.trim(),
    notes: state.header.notes.trim(),
    issueDate: header.value.issueDate,
    validUntil: header.value.validUntil,
    vatRateBps: header.value.vatRateBps,
    customerIsVatExempt: state.header.vatExempt,
    depositPercentBps: header.value.depositPercentBps,
    discount: header.value.discount,
    sections: state.sections.map((s) => ({ id: s.id, title: s.title.trim() })),
    lines,
  };

  let priced: PricedQuote | null = null;
  let pricingError: string | null = null;
  try {
    priced = priceQuote(payloadToPricingInput(payload));
  } catch (e) {
    if (e instanceof PricingError) pricingError = e.message;
    else throw e;
  }

  const clean = !Object.keys(header.errors).length && !Object.keys(lineErrors).length && !pricingError;
  return { payload: clean ? payload : null, priced, lineErrors, headerErrors: header.errors, pricingError };
}

/* ------------------------------------------------------------------ list operations */

export interface LineGroup {
  section: SectionDraft | null;
  lines: LineDraft[];
}

/** Unsectioned lines first (when there are any), then each section in order, even when empty. */
export function groupLines(state: Pick<QuoteDraftState, "sections" | "lines">): LineGroup[] {
  const known = new Set(state.sections.map((s) => s.id));
  const loose = state.lines.filter((l) => !l.sectionId || !known.has(l.sectionId));
  const groups: LineGroup[] = [];
  if (loose.length || !state.sections.length) groups.push({ section: null, lines: loose });
  for (const s of state.sections) groups.push({ section: s, lines: state.lines.filter((l) => l.sectionId === s.id) });
  return groups;
}

/** Swap a line with its neighbour in the same section. No-op at the edge. */
export function moveLine(lines: LineDraft[], id: string, dir: -1 | 1): LineDraft[] {
  const i = lines.findIndex((l) => l.id === id);
  if (i < 0) return lines;
  const sec = lines[i].sectionId;
  let j = i + dir;
  while (j >= 0 && j < lines.length && lines[j].sectionId !== sec) j += dir;
  if (j < 0 || j >= lines.length) return lines;
  const next = lines.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function duplicateLine(lines: LineDraft[], id: string, makeId: () => string = newId): LineDraft[] {
  const i = lines.findIndex((l) => l.id === id);
  if (i < 0) return lines;
  const next = lines.slice();
  next.splice(i + 1, 0, { ...lines[i], id: makeId() });
  return next;
}

/** Removing a section keeps its lines; they become unsectioned. */
export function removeSection(state: QuoteDraftState, id: string): QuoteDraftState {
  return {
    ...state,
    sections: state.sections.filter((s) => s.id !== id),
    lines: state.lines.map((l) => (l.sectionId === id ? { ...l, sectionId: null } : l)),
  };
}

export function emptyLine(sectionId: string | null = null, makeId: () => string = newId): LineDraft {
  return {
    id: makeId(), sectionId, catalogItemId: null, name: "", description: "", kind: "service", unit: "lot",
    quantity: "1", cost: "", markup: "", price: "", discount: "", taxable: true,
  };
}

/**
 * Fill a line from a catalog item. The item's price becomes a manual override only when it differs
 * from what cost + markup would give, so a price that follows the formula keeps following it.
 */
export function applyCatalogItem(line: LineDraft, item: CatalogItemRow): LineDraft {
  const formula = resolvePrice({ costCents: item.default_cost_cents, markupBps: item.default_markup_bps, priceCents: null });
  return {
    ...line,
    catalogItemId: item.id,
    name: item.name,
    description: item.description ?? "",
    kind: item.kind,
    unit: item.unit,
    quantity: blank(line.quantity) ? "1" : line.quantity,
    cost: centsToInput(item.default_cost_cents),
    markup: bpsToInput(item.default_markup_bps),
    price: item.default_price_cents !== formula ? centsToInput(item.default_price_cents) : "",
    taxable: item.is_taxable,
  };
}

/* ------------------------------------------------------------------ dates */

/** ISO date plus n days, in UTC so daylight saving cannot shift it. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Today's date in a time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/* ------------------------------------------------------------------ rows <-> state */

export function stateFromRows(quote: QuoteRow, sections: QuoteSectionRow[], lines: QuoteLineRow[]): QuoteDraftState {
  const discountValue =
    quote.discount_kind === "percent" ? bpsToInput(quote.discount_value)
    : quote.discount_kind === "fixed" ? centsToInput(quote.discount_value)
    : "";
  return {
    header: {
      customerId: quote.customer_id,
      title: quote.title,
      scope: quote.scope ?? "",
      terms: quote.terms ?? "",
      notes: quote.notes ?? "",
      issueDate: quote.issue_date ?? "",
      validUntil: quote.valid_until ?? "",
      vatRate: bpsToInput(quote.vat_rate_bps),
      vatExempt: quote.customer_is_vat_exempt,
      depositPercent: quote.deposit_percent_bps ? bpsToInput(quote.deposit_percent_bps) : "",
      discountKind: quote.discount_kind,
      discountValue,
    },
    sections: [...sections].sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, title: s.title })),
    lines: [...lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        sectionId: l.section_id,
        catalogItemId: l.catalog_item_id,
        name: l.name,
        description: l.description ?? "",
        kind: l.kind,
        unit: l.unit,
        quantity: milliToInput(l.quantity_milli),
        cost: l.unit_cost_cents ? centsToInput(l.unit_cost_cents) : "",
        markup: l.markup_bps ? bpsToInput(l.markup_bps) : "",
        price: l.unit_price_override_cents == null ? "" : centsToInput(l.unit_price_override_cents),
        discount: l.line_discount_bps ? bpsToInput(l.line_discount_bps) : "",
        taxable: l.is_taxable,
      })),
  };
}

/** Price stored rows (for the read-only detail page and, later, snapshots). */
export function rowsToPricingInput(quote: QuoteRow, lines: QuoteLineRow[]): PricingInput {
  return {
    lines: [...lines].sort((a, b) => a.position - b.position).map((l) => ({
      id: l.id,
      quantityMilli: l.quantity_milli,
      unitCostCents: l.unit_cost_cents,
      markupBps: l.markup_bps,
      unitPriceOverrideCents: l.unit_price_override_cents,
      lineDiscountBps: l.line_discount_bps,
      isTaxable: l.is_taxable,
    })),
    quoteDiscount:
      quote.discount_kind === "percent" ? { kind: "percent", bps: quote.discount_value }
      : quote.discount_kind === "fixed" ? { kind: "fixed", cents: quote.discount_value }
      : { kind: "none" },
    vatRateBps: quote.vat_rate_bps,
    customerIsVatExempt: quote.customer_is_vat_exempt,
    depositPercentBps: quote.deposit_percent_bps,
  };
}
