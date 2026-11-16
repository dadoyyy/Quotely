import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { LINE, ORG, QUOTE, U, as, closeDb, count, denied, id, setupDb } from "./helpers";

/** Phase 3: freezing a quote on send, and the customer's side (view, approve, decline, request changes). */

beforeAll(setupDb);
afterAll(closeDb);

const TOKEN = (n: number) => createHash("sha256").update(`token-${n}`).digest("hex");
const future = "2099-01-01T00:00:00Z";
const snapshot = JSON.stringify({ quote: { title: "Kitchen" }, totals: { totalCents: 100 } });

async function updatedAt(q: PGlite, quote = QUOTE.A) {
  return (await q.query<{ u: string }>(`select updated_at::text as u from quotes where id = $1`, [quote])).rows[0].u;
}
async function send(q: PGlite, opts: { quote?: string; token?: number; expected?: string } = {}) {
  const quote = opts.quote ?? QUOTE.A;
  const r = await q.query<{ n: string }>(
    `select send_quote($1, $2::timestamptz, $3::jsonb, $4, $5::timestamptz) as n`,
    [quote, opts.expected ?? (await updatedAt(q, quote)), snapshot, TOKEN(opts.token ?? 1), future],
  );
  return r.rows[0].n;
}
const linkId = async (q: PGlite) => (await q.query<{ id: string }>(`select id from quote_share_links where token_hash = $1`, [TOKEN(1)])).rows[0].id;
const one = async <T>(q: PGlite, sql: string, params: unknown[] = []) => (await q.query<T>(sql, params)).rows[0];

describe("send_quote", () => {
  it("freezes the quote: number, status, snapshot, hash, link and audit event, all at once", async () => {
    await as(U.staffA, async (q) => {
      const num = await send(q);
      expect(num).toMatch(/^[A-Z]+-\d{4}-0001$/);
      const row = await one<{ quote_number: string; status: string; sent_at: string | null; hash: string; snap: { quote: { number: string; sentAt: string; title: string } } }>(
        q, `select quote_number, status, sent_at, snapshot_hash as hash, document_snapshot as snap from quotes where id = $1`, [QUOTE.A]);
      expect(row).toMatchObject({ quote_number: num, status: "sent" });
      expect(row.sent_at).not.toBeNull();
      expect(row.snap.quote).toMatchObject({ number: num, title: "Kitchen" });
      expect(row.snap.quote.sentAt).toBeTruthy();
      // the hash is the SHA-256 of the stored snapshot text
      const text = (await one<{ t: string }>(q, `select document_snapshot::text as t from quotes where id = $1`, [QUOTE.A])).t;
      expect(row.hash).toBe(createHash("sha256").update(text).digest("hex"));
      // the link stores only a hash of the token
      const link = await one<{ token_hash: string; created_by: string }>(q, `select token_hash, created_by from quote_share_links where quote_id = $1`, [QUOTE.A]);
      expect(link).toMatchObject({ token_hash: TOKEN(1), created_by: U.staffA });
      const ev = await one<{ type: string; actor_type: string }>(q, `select type, actor_type from quote_events where quote_id = $1`, [QUOTE.A]);
      expect(ev).toEqual({ type: "sent", actor_type: "staff" });
    });
  });

  it("locks the lines and the snapshot afterwards", async () => {
    await as(U.ownerA, async (q) => {
      await send(q);
      await denied(q, `update quote_lines set name = 'Cheaper' where id = $1`, [LINE.A], /can no longer be edited/);
      await denied(q, `update quotes set document_snapshot = '{}' where id = $1`, [QUOTE.A], /immutable/);
    });
  });

  it("numbers consecutive sends in order, without gaps", async () => {
    await as(U.ownerA, async (q) => {
      await q.query(`insert into quotes (id, org_id, customer_id, root_quote_id, title) values ($1, $2, $3, $1, 'Second')`, [id(121), ORG.A, id(110)]);
      await q.query(`insert into quote_lines (org_id, quote_id, name) values ($1, $2, 'Item')`, [ORG.A, id(121)]);
      expect(await send(q)).toMatch(/-0001$/);
      expect(await send(q, { quote: id(121), token: 2 })).toMatch(/-0002$/);
    });
  });

  it("refuses to send twice, an empty quote, or a stale one", async () => {
    await as(U.ownerA, async (q) => {
      const stale = await updatedAt(q);
      await q.query(`update quotes set title = 'Edited' where id = $1`, [QUOTE.A]);
      await denied(q, `select send_quote($1, $2::timestamptz, $3::jsonb, $4, $5::timestamptz)`, [QUOTE.A, stale, snapshot, TOKEN(9), future], /changed while it was being sent/);
      await send(q);
      await denied(q, `select send_quote($1, $2::timestamptz, $3::jsonb, $4, $5::timestamptz)`, [QUOTE.A, await updatedAt(q), snapshot, TOKEN(8), future], /already sent/);
    });
    await as(U.ownerA, async (q) => {
      await q.query(`insert into quotes (id, org_id, customer_id, root_quote_id, title) values ($1, $2, $3, $1, 'Empty')`, [id(122), ORG.A, id(110)]);
      await denied(q, `select send_quote($1, $2::timestamptz, $3::jsonb, $4, $5::timestamptz)`, [id(122), await updatedAt(q, id(122)), snapshot, TOKEN(7), future], /at least one item/);
    });
  });

  it("refuses a quote whose valid-until date has passed", async () => {
    await as(U.ownerA, async (q) => {
      await q.query(`update quotes set valid_until = '2000-01-01' where id = $1`, [QUOTE.A]);
      await denied(q, `select send_quote($1, $2::timestamptz, $3::jsonb, $4, $5::timestamptz)`, [QUOTE.A, await updatedAt(q), snapshot, TOKEN(6), future], /already passed/);
    });
  });

  it("refuses viewers, other organizations and anonymous callers; a failed send burns no number", async () => {
    await as(U.viewerA, async (q) => {
      await denied(q, `select send_quote($1, now(), $2::jsonb, $3, $4::timestamptz)`, [QUOTE.A, snapshot, TOKEN(5), future], /not found|not allowed|row-level|violates/);
    });
    await as(U.ownerB, async (q) => {
      await denied(q, `select send_quote($1, now(), $2::jsonb, $3, $4::timestamptz)`, [QUOTE.A, snapshot, TOKEN(5), future], /not found/);
    });
    await as(null, async (q) => {
      await denied(q, `select send_quote($1, now(), $2::jsonb, $3, $4::timestamptz)`, [QUOTE.A, snapshot, TOKEN(5), future], /permission denied/);
    }, "anon");
    await as(U.ownerA, async (q) => {
      expect(await send(q)).toMatch(/-0001$/);
    });
  });

  it("renews the link: the old one is revoked, the new one works", async () => {
    await as(U.ownerA, async (q) => {
      await denied(q, `select renew_share_link($1, $2, $3::timestamptz)`, [QUOTE.A, TOKEN(3), future], /send the quote first/);
      await send(q);
      await q.query(`select renew_share_link($1, $2, $3::timestamptz)`, [QUOTE.A, TOKEN(3), future]);
      const links = (await q.query<{ token_hash: string; revoked: boolean }>(`select token_hash, revoked_at is not null as revoked from quote_share_links where quote_id = $1 order by created_at, revoked_at nulls last`, [QUOTE.A])).rows;
      expect(links.find((l) => l.token_hash === TOKEN(1))!.revoked).toBe(true);
      expect(links.find((l) => l.token_hash === TOKEN(3))!.revoked).toBe(false);
    });
  });
});

describe("the customer's side", () => {
  async function sendThenAsService<T>(fn: (q: PGlite, link: string) => Promise<T>) {
    return as(U.ownerA, async (q) => {
      await send(q);
      const link = await linkId(q);
      await q.exec("reset role");
      await q.exec("set local role service_role");
      return fn(q, link);
    });
  }
  const respond = (q: PGlite, link: string, action: string, name: string | null, note: string | null) =>
    q.query<{ s: string }>(`select respond_to_quote($1, $2, $3, $4, '203.0.113.9', 'test-agent') as s`, [link, action, name, note]);

  it("can only be called by the service role", async () => {
    await as(U.ownerA, async (q) => {
      await send(q);
      const link = await linkId(q);
      await denied(q, `select record_quote_view($1, 'ip', 'ua')`, [link], /permission denied/);
      await denied(q, `select respond_to_quote($1, 'approve', 'Me', null, 'ip', 'ua')`, [link], /permission denied/);
    });
    await as(null, async (q) => {
      await denied(q, `select record_quote_view($1, 'ip', 'ua')`, [id(1)], /permission denied/);
    }, "anon");
  });

  it("marks sent as viewed once and does not log a refresh as a new view", async () => {
    await sendThenAsService(async (q, link) => {
      await q.query(`select record_quote_view($1, '203.0.113.9', 'agent')`, [link]);
      await q.query(`select record_quote_view($1, '203.0.113.9', 'agent')`, [link]);
      expect((await one<{ status: string }>(q, `select status from quotes where id = $1`, [QUOTE.A])).status).toBe("viewed");
      expect(await count(q, "quote_events where type = 'viewed'")).toBe(1);
      const ev = await one<{ ip: string; actor_type: string }>(q, `select ip, actor_type from quote_events where type = 'viewed'`);
      expect(ev).toEqual({ ip: "203.0.113.9", actor_type: "customer" });
    });
  });

  it("records an approval with the typed name, the snapshot hash and a timestamp", async () => {
    await sendThenAsService(async (q, link) => {
      expect((await respond(q, link, "approve", "  Maria Cruz ", null)).rows[0].s).toBe("approved");
      const row = await one<{ status: string; responded_at: string | null; hash: string }>(q, `select status, responded_at, snapshot_hash as hash from quotes where id = $1`, [QUOTE.A]);
      expect(row.status).toBe("approved");
      expect(row.responded_at).not.toBeNull();
      const ev = await one<{ actor_label: string; payload: { snapshot_hash: string } }>(q, `select actor_label, payload from quote_events where type = 'approved'`);
      expect(ev.actor_label).toBe("Maria Cruz");
      expect(ev.payload.snapshot_hash).toBe(row.hash);
    });
  });

  it("stores a decline reason and change requests as the customer's comment", async () => {
    await sendThenAsService(async (q, link) => {
      await respond(q, link, "changes", "Maria", "Please use a different tile");
      expect((await one<{ status: string }>(q, `select status from quotes where id = $1`, [QUOTE.A])).status).toBe("changes_requested");
      expect(await one(q, `select author_type, body from quote_comments`)).toEqual({ author_type: "customer", body: "Please use a different tile" });
    });
    await sendThenAsService(async (q, link) => {
      await respond(q, link, "reject", null, "Too expensive");
      expect((await one<{ status: string }>(q, `select status from quotes where id = $1`, [QUOTE.A])).status).toBe("rejected");
    });
  });

  it("answers exactly once", async () => {
    await sendThenAsService(async (q, link) => {
      await respond(q, link, "approve", "Maria", null);
      await denied(q, `select respond_to_quote($1, 'reject', null, 'changed my mind', 'ip', 'ua')`, [link], /already been answered/);
      expect((await one<{ status: string }>(q, `select status from quotes where id = $1`, [QUOTE.A])).status).toBe("approved");
    });
  });

  it("requires a name to approve and a reason to decline or ask for changes", async () => {
    await sendThenAsService(async (q, link) => {
      await denied(q, `select respond_to_quote($1, 'approve', '  ', null, 'ip', 'ua')`, [link], /type your name/);
      await denied(q, `select respond_to_quote($1, 'reject', 'Maria', '  ', 'ip', 'ua')`, [link], /tell us why/);
      await denied(q, `select respond_to_quote($1, 'changes', 'Maria', null, 'ip', 'ua')`, [link], /describe the changes/);
      await denied(q, `select respond_to_quote($1, 'delete', 'Maria', 'x', 'ip', 'ua')`, [link], /unknown action/);
      await denied(q, `select respond_to_quote($1, 'approve', $2, null, 'ip', 'ua')`, [link, "x".repeat(121)], /too long/);
    });
  });

  it("refuses a revoked or expired link and an expired quote", async () => {
    await sendThenAsService(async (q, link) => {
      await q.query(`update quote_share_links set revoked_at = now() where id = $1`, [link]);
      await denied(q, `select respond_to_quote($1, 'approve', 'Maria', null, 'ip', 'ua')`, [link], /no longer valid/);
      await q.query(`select record_quote_view($1, 'ip', 'ua')`, [link]); // silently ignored
      expect((await one<{ status: string }>(q, `select status from quotes where id = $1`, [QUOTE.A])).status).toBe("sent");
    });
    await sendThenAsService(async (q, link) => {
      await q.query(`update quote_share_links set expires_at = now() - interval '1 minute' where id = $1`, [link]);
      await denied(q, `select respond_to_quote($1, 'approve', 'Maria', null, 'ip', 'ua')`, [link], /no longer valid/);
    });
    await sendThenAsService(async (q, link) => {
      await q.query(`update quotes set valid_until = '2000-01-01' where id = $1`, [QUOTE.A]);
      await denied(q, `select respond_to_quote($1, 'approve', 'Maria', null, 'ip', 'ua')`, [link], /has expired/);
    });
  });
});
