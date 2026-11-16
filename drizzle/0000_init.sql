CREATE TYPE "public"."actor_type" AS ENUM('staff', 'customer', 'system');--> statement-breakpoint
CREATE TYPE "public"."catalog_kind" AS ENUM('service', 'material', 'labor', 'fee');--> statement-breakpoint
CREATE TYPE "public"."discount_kind" AS ENUM('none', 'percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'staff', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'viewed', 'approved', 'rejected', 'changes_requested', 'expired', 'superseded', 'invoiced');--> statement-breakpoint
CREATE TYPE "public"."rejection_reason" AS ENUM('too_expensive', 'went_elsewhere', 'bad_timing', 'scope_mismatch', 'other');--> statement-breakpoint
CREATE TYPE "public"."unit_of_measure" AS ENUM('hour', 'day', 'sqm', 'lm', 'piece', 'head', 'set', 'lot');--> statement-breakpoint
CREATE TABLE "ai_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"quote_id" uuid,
	"input_text" text,
	"image_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"raw_response" jsonb,
	"matched" jsonb,
	"unmatched" jsonb,
	"tokens" integer,
	"latency_ms" integer,
	"accepted" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sku" text,
	"name" text NOT NULL,
	"description" text,
	"kind" "catalog_kind" DEFAULT 'service' NOT NULL,
	"unit" "unit_of_measure" DEFAULT 'lot' NOT NULL,
	"default_cost_cents" bigint DEFAULT 0 NOT NULL,
	"default_markup_bps" integer DEFAULT 0 NOT NULL,
	"default_price_cents" bigint DEFAULT 0 NOT NULL,
	"is_taxable" boolean DEFAULT true NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_items_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text,
	"phone" text,
	"address" text,
	"tin" text,
	"is_vat_exempt" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"paid_at" timestamp with time zone,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"document_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "invoices_org_number_key" UNIQUE("org_id","invoice_number")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_org_user_key" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"address" text,
	"email" text,
	"phone" text,
	"tin" text,
	"brand_color" text DEFAULT '#2563eb' NOT NULL,
	"timezone" text DEFAULT 'Asia/Manila' NOT NULL,
	"vat_rate_bps" integer DEFAULT 1200 NOT NULL,
	"default_validity_days" integer DEFAULT 30 NOT NULL,
	"default_terms" text,
	"quote_number_prefix" text DEFAULT 'QUO' NOT NULL,
	"quote_number_next" integer DEFAULT 1 NOT NULL,
	"invoice_number_prefix" text DEFAULT 'INV' NOT NULL,
	"invoice_number_next" integer DEFAULT 1 NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"kind" text DEFAULT 'photo' NOT NULL,
	"visible_to_customer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"author_type" "actor_type" NOT NULL,
	"author_label" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_user_id" uuid,
	"actor_label" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"section_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"catalog_item_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"kind" "catalog_kind" DEFAULT 'service' NOT NULL,
	"unit" "unit_of_measure" DEFAULT 'lot' NOT NULL,
	"quantity_milli" bigint DEFAULT 1000 NOT NULL,
	"unit_cost_cents" bigint DEFAULT 0 NOT NULL,
	"markup_bps" integer DEFAULT 0 NOT NULL,
	"unit_price_override_cents" bigint,
	"unit_price_cents" bigint DEFAULT 0 NOT NULL,
	"line_discount_bps" integer DEFAULT 0 NOT NULL,
	"is_taxable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	CONSTRAINT "quote_sections_org_id_key" UNIQUE("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "quote_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"root_quote_id" uuid NOT NULL,
	"quote_number" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"scope" text,
	"terms" text,
	"notes" text,
	"issue_date" date,
	"valid_until" date,
	"vat_rate_bps" integer DEFAULT 1200 NOT NULL,
	"customer_is_vat_exempt" boolean DEFAULT false NOT NULL,
	"deposit_percent_bps" integer DEFAULT 0 NOT NULL,
	"discount_kind" "discount_kind" DEFAULT 'none' NOT NULL,
	"discount_value" bigint DEFAULT 0 NOT NULL,
	"subtotal_cents" bigint DEFAULT 0 NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"vat_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"deposit_cents" bigint DEFAULT 0 NOT NULL,
	"document_snapshot" jsonb,
	"snapshot_hash" text,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_org_id_key" UNIQUE("org_id","id"),
	CONSTRAINT "quotes_root_version_key" UNIQUE("root_quote_id","version")
);
--> statement-breakpoint
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_comments" ADD CONSTRAINT "quote_comments_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_events" ADD CONSTRAINT "quote_events_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_section_fk" FOREIGN KEY ("org_id","section_id") REFERENCES "public"."quote_sections"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_sections" ADD CONSTRAINT "quote_sections_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_share_links" ADD CONSTRAINT "quote_share_links_quote_fk" FOREIGN KEY ("org_id","quote_id") REFERENCES "public"."quotes"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_fk" FOREIGN KEY ("org_id","customer_id") REFERENCES "public"."customers"("org_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_root_fk" FOREIGN KEY ("root_quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_drafts_org_idx" ON "ai_drafts" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "catalog_items_org_category_idx" ON "catalog_items" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX "customers_org_name_idx" ON "customers" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quote_attachments_quote_idx" ON "quote_attachments" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quote_comments_quote_idx" ON "quote_comments" USING btree ("quote_id","created_at");--> statement-breakpoint
CREATE INDEX "quote_events_quote_idx" ON "quote_events" USING btree ("quote_id","created_at");--> statement-breakpoint
CREATE INDEX "quote_lines_quote_idx" ON "quote_lines" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "quote_sections_quote_idx" ON "quote_sections" USING btree ("quote_id","position");--> statement-breakpoint
CREATE INDEX "quote_share_links_quote_idx" ON "quote_share_links" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_org_number_version_key" ON "quotes" USING btree ("org_id","quote_number","version") WHERE "quotes"."quote_number" is not null;--> statement-breakpoint
CREATE INDEX "quotes_org_status_idx" ON "quotes" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "quotes_valid_until_idx" ON "quotes" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "quotes_customer_idx" ON "quotes" USING btree ("customer_id");