import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */

export const orgRole = pgEnum("org_role", ["owner", "staff", "viewer"]);
export const catalogKind = pgEnum("catalog_kind", ["service", "material", "labor", "fee"]);
export const unitOfMeasure = pgEnum("unit_of_measure", [
  "hour", "day", "sqm", "lm", "piece", "head", "set", "lot",
]);
export const quoteStatus = pgEnum("quote_status", [
  "draft", "sent", "viewed", "approved", "rejected",
  "changes_requested", "expired", "superseded", "invoiced",
]);
export const discountKind = pgEnum("discount_kind", ["none", "percent", "fixed"]);
export const rejectionReason = pgEnum("rejection_reason", [
  "too_expensive", "went_elsewhere", "bad_timing", "scope_mismatch", "other",
]);
export const invoiceStatus = pgEnum("invoice_status", ["unpaid", "paid", "void"]);
export const actorType = pgEnum("actor_type", ["staff", "customer", "system"]);

/* ---------------------------------------------------------------- helpers */

const pk = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
/** Money: integer centavos. */
const money = (name: string) => bigint(name, { mode: "number" }).notNull().default(0);

/* ----------------------------------------------------------------- tenant */

export const organizations = pgTable("organizations", {
  id: pk(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  tin: text("tin"),
  brandColor: text("brand_color").notNull().default("#2563eb"),
  timezone: text("timezone").notNull().default("Asia/Manila"),
  vatRateBps: integer("vat_rate_bps").notNull().default(1200),
  defaultValidityDays: integer("default_validity_days").notNull().default(30),
  defaultTerms: text("default_terms"),
  quoteNumberPrefix: text("quote_number_prefix").notNull().default("QUO"),
  quoteNumberNext: integer("quote_number_next").notNull().default(1),
  invoiceNumberPrefix: text("invoice_number_prefix").notNull().default("INV"),
  invoiceNumberNext: integer("invoice_number_next").notNull().default(1),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: pk(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    /** References auth.users(id); the foreign key is added in the RLS migration. */
    userId: uuid("user_id").notNull(),
    role: orgRole("role").notNull().default("staff"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("memberships_org_user_key").on(t.orgId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

/* ------------------------------------------------------------ people/price */

export const customers = pgTable(
  "customers",
  {
    id: pk(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    tin: text("tin"),
    isVatExempt: boolean("is_vat_exempt").notNull().default(false),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("customers_org_id_key").on(t.orgId, t.id),
    index("customers_org_name_idx").on(t.orgId, t.name),
  ],
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: pk(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    sku: text("sku"),
    name: text("name").notNull(),
    description: text("description"),
    kind: catalogKind("kind").notNull().default("service"),
    unit: unitOfMeasure("unit").notNull().default("lot"),
    defaultCostCents: money("default_cost_cents"),
    defaultMarkupBps: integer("default_markup_bps").notNull().default(0),
    defaultPriceCents: money("default_price_cents"),
    isTaxable: boolean("is_taxable").notNull().default(true),
    category: text("category"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("catalog_items_org_id_key").on(t.orgId, t.id),
    index("catalog_items_org_category_idx").on(t.orgId, t.category),
  ],
);

/* ----------------------------------------------------------------- quotes */

export const quotes = pgTable(
  "quotes",
  {
    id: pk(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull(),
    /** Every version of one quotation shares a root. A first version's root is its own id. */
    rootQuoteId: uuid("root_quote_id").notNull(),
    /** Allocated at send time (null while draft). */
    quoteNumber: text("quote_number"),
    version: integer("version").notNull().default(1),
    status: quoteStatus("status").notNull().default("draft"),
    title: text("title").notNull().default(""),
    scope: text("scope"),
    terms: text("terms"),
    notes: text("notes"),
    issueDate: date("issue_date"),
    validUntil: date("valid_until"),
    /** Copied from settings and customer at creation so later changes cannot rewrite history. */
    vatRateBps: integer("vat_rate_bps").notNull().default(1200),
    customerIsVatExempt: boolean("customer_is_vat_exempt").notNull().default(false),
    depositPercentBps: integer("deposit_percent_bps").notNull().default(0),
    discountKind: discountKind("discount_kind").notNull().default("none"),
    /** Basis points when percent, centavos when fixed. */
    discountValue: bigint("discount_value", { mode: "number" }).notNull().default(0),
    /** Cached by priceQuote, never written by hand. */
    subtotalCents: money("subtotal_cents"),
    discountCents: money("discount_cents"),
    vatCents: money("vat_cents"),
    totalCents: money("total_cents"),
    depositCents: money("deposit_cents"),
    /** Frozen on send. */
    documentSnapshot: jsonb("document_snapshot"),
    snapshotHash: text("snapshot_hash"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("quotes_org_id_key").on(t.orgId, t.id),
    unique("quotes_root_version_key").on(t.rootQuoteId, t.version),
    uniqueIndex("quotes_org_number_version_key")
      .on(t.orgId, t.quoteNumber, t.version)
      .where(sql`${t.quoteNumber} is not null`),
    foreignKey({
      name: "quotes_customer_fk",
      columns: [t.orgId, t.customerId],
      foreignColumns: [customers.orgId, customers.id],
    }).onDelete("restrict"),
    foreignKey({ name: "quotes_root_fk", columns: [t.rootQuoteId], foreignColumns: [t.id] }),
    index("quotes_org_status_idx").on(t.orgId, t.status),
    index("quotes_valid_until_idx").on(t.validUntil),
    index("quotes_customer_idx").on(t.customerId),
  ],
);

export const quoteSections = pgTable(
  "quote_sections",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    position: integer("position").notNull().default(0),
    title: text("title").notNull().default(""),
  },
  (t) => [
    unique("quote_sections_org_id_key").on(t.orgId, t.id),
    foreignKey({
      name: "quote_sections_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("cascade"),
    index("quote_sections_quote_idx").on(t.quoteId, t.position),
  ],
);

export const quoteLines = pgTable(
  "quote_lines",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    sectionId: uuid("section_id"),
    position: integer("position").notNull().default(0),
    /** Nullable on purpose: a free-typed line exists nowhere in the catalog. */
    catalogItemId: uuid("catalog_item_id").references(() => catalogItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    kind: catalogKind("kind").notNull().default("service"),
    unit: unitOfMeasure("unit").notNull().default("lot"),
    /** Thousandths: 40.5 sqm is 40500. Integer, so no float ever enters pricing. */
    quantityMilli: bigint("quantity_milli", { mode: "number" }).notNull().default(1000),
    unitCostCents: money("unit_cost_cents"),
    markupBps: integer("markup_bps").notNull().default(0),
    /** A typed selling price. Wins over cost + markup. */
    unitPriceOverrideCents: bigint("unit_price_override_cents", { mode: "number" }),
    /** Resolved by priceQuote. */
    unitPriceCents: money("unit_price_cents"),
    lineDiscountBps: integer("line_discount_bps").notNull().default(0),
    isTaxable: boolean("is_taxable").notNull().default(true),
  },
  (t) => [
    foreignKey({
      name: "quote_lines_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "quote_lines_section_fk",
      columns: [t.orgId, t.sectionId],
      foreignColumns: [quoteSections.orgId, quoteSections.id],
    }).onDelete("cascade"),
    index("quote_lines_quote_idx").on(t.quoteId, t.position),
  ],
);

export const quoteAttachments = pgTable(
  "quote_attachments",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    storagePath: text("storage_path").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    kind: text("kind").notNull().default("photo"),
    visibleToCustomer: boolean("visible_to_customer").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "quote_attachments_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("cascade"),
    index("quote_attachments_quote_idx").on(t.quoteId),
  ],
);

export const quoteShareLinks = pgTable(
  "quote_share_links",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    /** SHA-256 of the token. The raw token exists only in the emailed URL. */
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "quote_share_links_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("cascade"),
    index("quote_share_links_quote_idx").on(t.quoteId),
  ],
);

export const quoteEvents = pgTable(
  "quote_events",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    /** e.g. created, sent, viewed, approved, rejected, comment, revised, expired, converted. */
    type: text("type").notNull(),
    actorType: actorType("actor_type").notNull(),
    actorUserId: uuid("actor_user_id"),
    actorLabel: text("actor_label"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "quote_events_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("cascade"),
    index("quote_events_quote_idx").on(t.quoteId, t.createdAt),
  ],
);

export const quoteComments = pgTable(
  "quote_comments",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    authorType: actorType("author_type").notNull(),
    authorLabel: text("author_label"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "quote_comments_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("cascade"),
    index("quote_comments_quote_idx").on(t.quoteId, t.createdAt),
  ],
);

/* --------------------------------------------------------------- invoices */

export const invoices = pgTable(
  "invoices",
  {
    id: pk(),
    orgId: uuid("org_id").notNull(),
    /** One invoice per approved quote. */
    quoteId: uuid("quote_id").notNull().unique(),
    invoiceNumber: text("invoice_number").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    status: invoiceStatus("status").notNull().default("unpaid"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidMethod: text("paid_method"),
    paidReference: text("paid_reference"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    totalCents: money("total_cents"),
    documentSnapshot: jsonb("document_snapshot").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("invoices_org_number_key").on(t.orgId, t.invoiceNumber),
    foreignKey({
      name: "invoices_quote_fk",
      columns: [t.orgId, t.quoteId],
      foreignColumns: [quotes.orgId, quotes.id],
    }).onDelete("restrict"),
  ],
);

/* --------------------------------------------------------------------- AI */

export const aiDrafts = pgTable(
  "ai_drafts",
  {
    id: pk(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    quoteId: uuid("quote_id"),
    inputText: text("input_text"),
    imagePaths: jsonb("image_paths").notNull().default(sql`'[]'::jsonb`),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    rawResponse: jsonb("raw_response"),
    matched: jsonb("matched"),
    unmatched: jsonb("unmatched"),
    tokens: integer("tokens"),
    latencyMs: integer("latency_ms"),
    /** Null until the user decides; true when the draft's lines went into a quote. */
    accepted: boolean("accepted"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_drafts_org_idx").on(t.orgId, t.createdAt)],
);
