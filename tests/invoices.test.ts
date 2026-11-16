import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { QUOTE, U, as, closeDb, count, denied, setupDb } from "./helpers";

/** Phase 6: invoicing an approved quote, and recording payment. */

beforeAll(setupDb);
afterAll(closeDb);

const INV = "00000000-0000-4000-8000-000000000501";
const INV2 = "00000000-0000-4000-8000-000000000502";
const snap = JSON.stringify({ quote: { title: "Kitchen" }, totals: { totalCents: 123456 } });
const token = createHash("sha256").update("inv").digest("hex");

async function approved(q: PGlite, quote = QUOTE.A) {
  const u = (await q.query<{ u: string }>(`select updated_at::text u from quotes where id = $1`, [quote])).rows[0].u;
  await q.query(`select send_quote($1, $2::timestamptz, $3::jsonb, $4, '2099-01-01T00:00:00Z'::timestamptz)`, [quote, u, snap, token]);
  await q.query(`update quotes set status = 'approved' where id = $1`, [quote]);
}
/** Act as someone else inside the same transaction, so earlier setup stays visible. */
async function switchTo(q: PGlite, uid: string) {
  await q.exec("reset role");
  await q.exec("set local role authenticated");
  await q.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
}
const invoice = (q: PGlite, quote = QUOTE.A, id = INV, due: string | null = "2026-12-01") =>
  q.query<{ n: string }>(`select create_invoice($1, $2, '2026-11-16', $3) n`, [quote, id, due]);

describe("create_invoice", () => {
  it("numbers the invoice, freezes the approved snapshot, and moves the quote to invoiced", async () => {
    await as(U.staffA, async (q) => {
      await approved(q);
      const num = (await invoice(q)).rows[0].n;
      expect(num).toMatch(/^INV-\d{4}-0001$/);
      const r = (await q.query<{ total: string; status: string; inv: string; due: string }>(
        `select total_cents::text total, status, document_snapshot #>> '{invoice,number}' inv, document_snapshot #>> '{invoice,dueDate}' due from invoices where id = $1`, [INV])).rows[0];
      expect(r).toEqual({ total: "123456", status: "unpaid", inv: num, due: "2026-12-01" });
      expect((await q.query<{ s: string }>(`select status s from quotes where id = $1`, [QUOTE.A])).rows[0].s).toBe("invoiced");
      expect((await q.query<{ n: number }>(`select count(*)::int n from quote_events where quote_id = $1 and type = 'invoiced'`, [QUOTE.A])).rows[0].n).toBe(1);
    });
  });

  it("refuses an unapproved quote, a second invoice, a bad due date and a stranger", async () => {
    await as(U.staffA, async (q) => {
      await denied(q, `select create_invoice($1, $2, '2026-11-16', null)`, [QUOTE.A, INV], /only an approved quote/);
      await approved(q);
      await denied(q, `select create_invoice($1, $2, '2026-11-16', '2026-11-01')`, [QUOTE.A, INV], /due date is before/);
      await invoice(q);
      await denied(q, `select create_invoice($1, $2, '2026-11-16', null)`, [QUOTE.A, INV2], /only an approved quote/);
    });
    await as(U.ownerB, async (q) => {
      await denied(q, `select create_invoice($1, $2, '2026-11-16', null)`, [QUOTE.A, INV2], /quote not found/);
    });
  });

  it("is refused for read-only members", async () => {
    await as(U.staffA, async (q) => {
      await approved(q);
      await switchTo(q, U.viewerA);
      await denied(q, `select create_invoice($1, $2, '2026-11-16', null)`, [QUOTE.A, INV], /quote not found/);
      await switchTo(q, U.staffA);
      expect(await count(q, "invoices")).toBe(0);
    });
  });
});

describe("paying and voiding", () => {
  const set = (q: PGlite, status: string, method: string | null = null, ref: string | null = null) =>
    q.query(`select set_invoice_status($1, $2::invoice_status, $3, $4)`, [INV, status, method, ref]);
  const row = async (q: PGlite) =>
    (await q.query<{ status: string; paid: boolean; method: string | null; ref: string | null; voided: boolean }>(
      `select status, paid_at is not null paid, paid_method method, paid_reference ref, voided_at is not null voided from invoices where id = $1`, [INV])).rows[0];

  it("records payment details, can undo a mistaken payment, and logs events", async () => {
    await as(U.staffA, async (q) => {
      await approved(q);
      await invoice(q);
      await set(q, "paid", "  GCash ", "ref-99");
      expect(await row(q)).toEqual({ status: "paid", paid: true, method: "GCash", ref: "ref-99", voided: false });
      await set(q, "unpaid");
      expect(await row(q)).toEqual({ status: "unpaid", paid: false, method: null, ref: null, voided: false });
      expect((await q.query<{ n: number }>(`select count(*)::int n from quote_events where type in ('invoice_paid','invoice_unpaid')`)).rows[0].n).toBe(2);
    });
  });

  it("makes void final", async () => {
    await as(U.staffA, async (q) => {
      await approved(q);
      await invoice(q);
      await set(q, "void");
      expect((await row(q)).voided).toBe(true);
      await denied(q, `select set_invoice_status($1, 'paid', null, null)`, [INV], /illegal invoice status change/);
    });
  });

  it("never lets an issued invoice be edited or deleted, even by the owner", async () => {
    await as(U.ownerA, async (q) => {
      await approved(q);
      await invoice(q);
      await denied(q, `update invoices set total_cents = 1 where id = $1`, [INV], /cannot be edited/);
      await denied(q, `update invoices set document_snapshot = '{}'::jsonb where id = $1`, [INV], /cannot be edited/);
      await denied(q, `update invoices set invoice_number = 'X' where id = $1`, [INV], /cannot be edited/);
      await denied(q, `delete from invoices where id = $1`, [INV], /never deleted/);
    });
  });

  it("keeps invoices inside the organisation", async () => {
    await as(U.ownerA, async (q) => {
      await approved(q);
      await invoice(q);
      await switchTo(q, U.ownerB);
      expect(await count(q, "invoices")).toBe(0);
      await denied(q, `select set_invoice_status($1, 'paid', null, null)`, [INV], /invoice not found/);
      await switchTo(q, U.viewerA);
      expect(await count(q, "invoices")).toBe(1);
      await denied(q, `select set_invoice_status($1, 'paid', null, null)`, [INV], /invoice not found/);
    });
  });
});
