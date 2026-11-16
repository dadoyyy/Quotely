import { describe, expect, it } from "vitest";
import type { QuoteStatus } from "../rows";
import { computeStats, daysBetween, followUps, type QuoteSummary } from "./insights";

const NOW = new Date("2026-11-16T04:00:00Z"); // 12:00 in Manila
const TODAY = "2026-11-16";
let n = 0;
const q = (over: Partial<QuoteSummary> = {}): QuoteSummary => ({
  id: `q${++n}`, title: `Quote ${n}`, quote_number: `Q-${n}`, version: 1, status: "sent", total_cents: 100_000,
  valid_until: "2026-12-31", sent_at: "2026-11-15T04:00:00Z", responded_at: null, updated_at: "2026-11-15T04:00:00Z", customer_id: "c", ...over,
});
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 3600 * 1000).toISOString();

describe("daysBetween", () => {
  it("counts whole days across month, year and leap boundaries", () => {
    expect(daysBetween("2026-11-16", "2026-11-16")).toBe(0);
    expect(daysBetween("2026-11-16", "2026-12-16")).toBe(30);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2026-11-16", "2026-11-10")).toBe(-6);
  });
});

describe("followUps", () => {
  it("flags requested changes as most urgent", () => {
    const f = followUps([q({ status: "changes_requested" })], TODAY, NOW);
    expect(f[0]).toMatchObject({ severity: "high", reason: "Asked for changes. Send a revision." });
  });

  it("flags quotes about to expire, with the right urgency and wording", () => {
    const f = followUps([
      q({ id: "today", valid_until: "2026-11-16" }), q({ id: "one", valid_until: "2026-11-17" }),
      q({ id: "five", valid_until: "2026-11-21" }), q({ id: "eight", valid_until: "2026-11-24", sent_at: daysAgo(1) }),
    ], TODAY, NOW);
    expect(f.map((x) => [x.quote.id, x.severity, x.reason])).toEqual([
      ["today", "high", "Expires today."], ["one", "high", "Expires in 1 day."], ["five", "medium", "Expires in 5 days."],
    ]);
  });

  it("catches a quote past its date that the sweep hasn't reached yet", () => {
    const f = followUps([q({ valid_until: "2026-11-14" })], TODAY, NOW);
    expect(f[0]).toMatchObject({ severity: "high", reason: "Passed its valid-until date 2 days ago." });
  });

  it("nudges quiet quotes: unopened after 3 days, opened but unanswered after 3 days", () => {
    const f = followUps([
      q({ id: "unopened", status: "sent", sent_at: daysAgo(4) }),
      q({ id: "quiet", status: "viewed", updated_at: daysAgo(5) }),
      q({ id: "fresh", status: "sent", sent_at: daysAgo(1) }),
      q({ id: "fresh-viewed", status: "viewed", updated_at: daysAgo(1) }),
    ], TODAY, NOW);
    expect(f.map((x) => [x.quote.id, x.severity, x.reason])).toEqual([
      ["unopened", "low", "Sent 4 days ago, not opened yet."], ["quiet", "low", "Opened 5 days ago, no answer yet."],
    ]);
  });

  it("ignores drafts, answered, expired and superseded quotes, and gives one reason per quote", () => {
    const quiet = ["draft", "approved", "rejected", "expired", "superseded", "invoiced"] as QuoteStatus[];
    expect(followUps(quiet.map((status) => q({ status, valid_until: "2026-11-16" })), TODAY, NOW)).toEqual([]);
    expect(followUps([q({ valid_until: "2026-11-17", sent_at: daysAgo(9) })], TODAY, NOW)).toHaveLength(1);
  });

  it("sorts by severity, then by how soon it expires", () => {
    const f = followUps([
      q({ id: "low", sent_at: daysAgo(5) }), q({ id: "med", valid_until: "2026-11-20" }),
      q({ id: "changes", status: "changes_requested", valid_until: null }), q({ id: "hi", valid_until: "2026-11-17" }),
    ], TODAY, NOW);
    expect(f.map((x) => x.quote.id)).toEqual(["hi", "changes", "med", "low"]);
  });
});

describe("computeStats", () => {
  const set = [
    q({ status: "draft", total_cents: 10 }),
    q({ status: "sent", total_cents: 100_000 }), q({ status: "viewed", total_cents: 250_050 }),
    q({ status: "changes_requested", total_cents: 5_000 }),
    q({ status: "approved", total_cents: 400_000, responded_at: "2026-11-05T02:00:00Z" }),
    q({ status: "invoiced", total_cents: 600_000, responded_at: "2026-10-20T02:00:00Z" }),
    q({ status: "rejected", total_cents: 1 }), q({ status: "expired", total_cents: 1 }),
    q({ status: "superseded", total_cents: 999_999 }),
  ];
  const s = computeStats(set, "Asia/Manila", NOW);

  it("counts every status", () => {
    expect(s.counts).toMatchObject({ draft: 1, sent: 1, viewed: 1, changes_requested: 1, approved: 1, invoiced: 1, rejected: 1, expired: 1, superseded: 1 });
  });
  it("adds up the open pipeline exactly, leaving out drafts and superseded versions", () => {
    expect(s.openValueCents).toBe(355_050);
  });
  it("counts only this month's wins, by the business's calendar", () => {
    expect(s.wonThisMonthCents).toBe(400_000);
    // 23:30 UTC on the 31st is already the next month in Manila
    const edge = computeStats([q({ status: "approved", total_cents: 7, responded_at: "2026-10-31T23:30:00Z" })], "Asia/Manila", NOW);
    expect(edge.wonThisMonthCents).toBe(7);
    expect(computeStats([q({ status: "approved", total_cents: 7, responded_at: "2026-10-31T23:30:00Z" })], "UTC", NOW).wonThisMonthCents).toBe(0);
  });
  it("gives a win rate over decided quotes only", () => {
    expect(s.decided).toBe(4);
    expect(s.winRateBps).toBe(5000); // 2 won of 4 decided
    expect(computeStats([q({ status: "approved" }), q({ status: "approved" }), q({ status: "rejected" })], "UTC", NOW).winRateBps).toBe(6667);
  });
  it("has no win rate before anything is decided, and survives an empty list", () => {
    const e = computeStats([], "UTC", NOW);
    expect(e).toMatchObject({ winRateBps: null, openValueCents: 0, wonThisMonthCents: 0, decided: 0 });
  });
  it("refuses to show a sum it can't make exact", () => {
    const big = Array.from({ length: 4 }, () => q({ status: "sent", total_cents: Number.MAX_SAFE_INTEGER }));
    expect(computeStats(big, "UTC", NOW).openValueCents).toBeNull();
  });
});
