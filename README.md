# Smart Quotation & Proposal Generator

Multi-tenant quoting app for contractors, event organizers and repair shops: build a quotation from a
price catalog, send it as a link, let the customer approve or decline, and turn the approved quote into
an invoice. Next.js (App Router) + Supabase Postgres + Drizzle. AI drafts line items from text or photos
but never produces a number.

## Try it

- **No setup:** the landing page links to `/demo`, a read-only tour built from a sample renovation price list
  and the real pricing engine. It uses no database.
- **With your own data:** sign up, then on an empty price list pick a sample (home renovation, event
  organizer or aircon repair) and change the prices to yours.

## What it does

1. **Build** a quotation from your price list: sections, per-line discounts, VAT, a quote-level discount,
   deposit, live totals, and a private margin view.
2. **Draft with AI:** describe the job or attach photos; Gemini picks items from *your* list. It never
   writes a price, quantities come only from what the customer stated, and every draft is logged.
3. **Send** a private link (optionally by email). The customer approves, declines or asks for changes
   without an account. The sent document is frozen and hash-checked.
4. **Revise** with versions: the old one is superseded only when the new one is sent.
5. **Invoice** an approved quote (a frozen copy), record payment, void; overdue is flagged.
6. **Export** quotes, invoices and customers to CSV (spreadsheet-formula safe).

## Run it

```bash
npm install
cp .env.example .env.local     # fill in the Supabase values (see below)
npm run db:migrate             # applies drizzle/*.sql to your Supabase database
npm run db:verify              # confirms tables, row-level security and functions are in place
npm run dev
```

Tests need no keys and no database: `npm test` runs the pricing engine and the row-level-security
suite against an in-process Postgres (PGlite).

## Design rules

1. **Money is integer centavos.** One pure function, `priceQuote` (`src/lib/pricing/engine.ts`), is the
   only place arithmetic happens. Rounding is half-up and lives in one helper (`src/lib/money.ts`);
   ESLint bans `Math.round` in that path.
2. **A sent quote is frozen.** Sending writes `quotes.document_snapshot`. The database itself refuses
   edits to a non-draft quote's lines and rewrites of its snapshot, and enforces the status state machine.
3. **Tenants cannot see each other.** Every tenant table carries `org_id` with row-level security through
   `memberships`; composite `(org_id, id)` foreign keys stop a row pointing at another tenant's parent.
4. **Cost never reaches the customer.** One serializer builds the public view (Phase 3).
5. **AI touches words and references, never prices.** Output is validated against the org's own catalog (Phase 5).

## Decisions worth knowing

- **Security lives in the database, not only the app.** Row-level security and triggers enforce tenancy,
  the quote state machine, frozen snapshots and immutable invoices, so a bug in a page can't break them.
  `tests/` runs the real migrations on Postgres (PGlite) to prove it.
- **The public link is a secret.** Only its SHA-256 hash is stored; the customer page runs through
  narrow service-role functions, ignores bot previews, and never serializes cost, markup or margin.
- **AI is a typist, not an accountant.** The model sees item names, not prices, and can only reference
  items by key. Output is validated and anything unknown is dropped, so a hallucination can't reach a quote.
- **Not done yet:** server-rendered PDF download (browser print-to-PDF works), automatic customer
  reminders, Google sign-in.

## Layout

| Path | What |
| --- | --- |
| `src/lib/money.ts` | `Cents`, `mulDivHalfUp`, largest-remainder allocation |
| `src/lib/pricing/` | `priceQuote` and its types |
| `src/db/schema.ts` | Drizzle schema, 13 tables |
| `drizzle/0000_init.sql` | Generated from the schema |
| `drizzle/0001_rls.sql` | Hand-written: RLS policies, numbering, freeze and state-machine triggers |
| `tests/rls.test.ts` | The Phase 0 gate: isolation, roles, frozen quotes, numbering |
| `tests/quote-builder.test.ts` | Atomic draft save, draft-only delete, cross-tenant references |
| `tests/lifecycle.test.ts` | Revisions, superseding on send, expiry sweep |
| `tests/send-quote.test.ts` | Sending freezes a quote; the customer's view, approve, decline and request-changes rules |
| `tests/invoices.test.ts` | Invoicing an approved quote, payments, immutability |
| `src/lib/ai/` | Prompt, Gemini client, output validation and catalog matching |
| `src/lib/seed/`, `src/lib/demo/` | Sample price lists and the demo fixture |
| `src/lib/supabase/` | Browser, server (session-bound) and admin (service role, server-only) clients |

## Keys, and when each is needed

| Key | Needed for | When |
| --- | --- | --- |
| Supabase URL, anon key, service-role key, `DATABASE_URL` | Auth, database, storage | Next phase (auth + first screens) |
| Google OAuth client ID and secret | "Sign in with Google" | Optional; entered in the Supabase dashboard, not in this repo |
| Resend API key + `EMAIL_FROM` | Emailing quote links (optional; without them you copy the link) | Phase 3 |
| Gemini API key (`GEMINI_API_KEY`, optional `GEMINI_MODEL`, `AI_DAILY_LIMIT`) | AI drafting; an owner turns it on in Settings | Phase 5 |
| GitHub | Pushing the repo | Whenever you want it hosted |

## Status

- [x] Phase 0: schema, RLS, triggers, pricing engine, tests
- [x] Phase 1: sign-up and login, onboarding, customers, price list, settings
- [x] Phase 2: quote builder (atomic draft save, live totals, private margin, sections, keyboard entry)
- [x] Phase 3 (PDF render service still to do): send, immutable snapshot, private link, public approval page, print view, activity timeline
- [x] Phase 4: revisions (versioned, superseded on send), expiry sweep, dashboard with follow-ups, status filters, daily staff digest
- [x] Phase 5: AI drafting (text + photos to price-list items; AI never sets prices; daily cap; every draft logged)
- [x] Phase 6: invoices from approved quotes (frozen copy, numbered, record payment, void, overdue), CSV export of quotes, invoices and customers
- [x] Phase 7: portfolio layer (sample price lists for three industries, public demo at `/demo`, landing page)
