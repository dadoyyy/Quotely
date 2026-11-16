# Smart Quotation & Proposal Generator

Multi-tenant quoting app for contractors, event organizers and repair shops: build a quotation from a
price catalog, send it as a link, let the customer approve or decline, and turn the approved quote into
an invoice. Next.js (App Router) + Supabase Postgres + Drizzle. AI drafts line items from text or photos
but never produces a number.

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
| `tests/send-quote.test.ts` | Sending freezes a quote; the customer's view, approve, decline and request-changes rules |
| `src/lib/supabase/` | Browser, server (session-bound) and admin (service role, server-only) clients |

## Keys, and when each is needed

| Key | Needed for | When |
| --- | --- | --- |
| Supabase URL, anon key, service-role key, `DATABASE_URL` | Auth, database, storage | Next phase (auth + first screens) |
| Google OAuth client ID and secret | "Sign in with Google" | Optional; entered in the Supabase dashboard, not in this repo |
| Resend API key + `EMAIL_FROM` | Emailing quote links (optional; without them you copy the link) | Phase 3 |
| Gemini API key | AI drafting | Phase 5 |
| GitHub | Pushing the repo | Whenever you want it hosted |

## Status

- [x] Phase 0: schema, RLS, triggers, pricing engine, tests
- [x] Phase 1: sign-up and login, onboarding, customers, price list, settings
- [x] Phase 2: quote builder (atomic draft save, live totals, private margin, sections, keyboard entry)
- [x] Phase 3 (PDF render service still to do): send, immutable snapshot, private link, public approval page, print view, activity timeline
- [ ] Phases 4 to 7: lifecycle, AI, invoices, portfolio layer
