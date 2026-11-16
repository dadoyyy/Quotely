/**
 * What the dashboard and the daily digest say about the pipeline. Pure and exact: money is summed
 * as BigInt, rates are integer basis points.
 */
import { mulDivHalfUp } from "../money";
import type { QuoteStatus } from "../rows";
import { todayIn } from "./model";

export interface QuoteSummary {
  id: string;
  title: string;
  quote_number: string | null;
  version: number;
  status: QuoteStatus;
  total_cents: number;
  valid_until: string | null;
  sent_at: string | null;
  responded_at: string | null;
  updated_at: string;
  customer_id: string;
}

export interface FollowUp {
  quote: QuoteSummary;
  severity: "high" | "medium" | "low";
  reason: string;
}

const DAY = 24 * 3600 * 1000;
const STALE_DAYS = 3;
const EXPIRY_WINDOW_DAYS = 7;

/** Whole days from one ISO date to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Quotes that need a person's attention, most urgent first. One reason per quote, the most pressing. */
export function followUps(quotes: QuoteSummary[], today: string, now: Date = new Date()): FollowUp[] {
  const out: FollowUp[] = [];
  const ageDays = (iso: string | null) => (iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / DAY) : 0);

  for (const q of quotes) {
    if (q.status === "changes_requested") {
      out.push({ quote: q, severity: "high", reason: "Asked for changes. Send a revision." });
      continue;
    }
    if (q.status !== "sent" && q.status !== "viewed") continue;

    const left = q.valid_until ? daysBetween(today, q.valid_until) : null;
    if (left !== null && left < 0) {
      out.push({ quote: q, severity: "high", reason: `Passed its valid-until date ${plural(-left, "day")} ago.` });
    } else if (left !== null && left <= EXPIRY_WINDOW_DAYS) {
      out.push({
        quote: q,
        severity: left <= 2 ? "high" : "medium",
        reason: left === 0 ? "Expires today." : `Expires in ${plural(left, "day")}.`,
      });
    } else if (q.status === "viewed" && ageDays(q.updated_at) >= STALE_DAYS) {
      out.push({ quote: q, severity: "low", reason: `Opened ${plural(ageDays(q.updated_at), "day")} ago, no answer yet.` });
    } else if (q.status === "sent" && ageDays(q.sent_at) >= STALE_DAYS) {
      out.push({ quote: q, severity: "low", reason: `Sent ${plural(ageDays(q.sent_at), "day")} ago, not opened yet.` });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  const left = (f: FollowUp) => (f.quote.valid_until ? daysBetween(today, f.quote.valid_until) : Number.MAX_SAFE_INTEGER);
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || left(a) - left(b) || a.quote.title.localeCompare(b.quote.title));
}

export interface Stats {
  counts: Record<QuoteStatus, number>;
  /** Total of quotes still waiting on the customer. Null only if the sum is too large to show exactly. */
  openValueCents: number | null;
  /** Approved or invoiced this calendar month, in the business's time zone. */
  wonThisMonthCents: number | null;
  /** Share of decided quotes that were won, in basis points. Null until something is decided. */
  winRateBps: number | null;
  decided: number;
}

const OPEN: QuoteStatus[] = ["sent", "viewed", "changes_requested"];
const WON: QuoteStatus[] = ["approved", "invoiced"];
const LOST: QuoteStatus[] = ["rejected", "expired"];

function exactSum(values: number[]): number | null {
  const total = values.reduce((acc, v) => acc + BigInt(v), 0n);
  return total <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(total) : null;
}

export function computeStats(quotes: QuoteSummary[], timeZone: string, now: Date = new Date()): Stats {
  const counts = Object.fromEntries(
    ["draft", "sent", "viewed", "approved", "rejected", "changes_requested", "expired", "superseded", "invoiced"].map((s) => [s, 0]),
  ) as Record<QuoteStatus, number>;
  for (const q of quotes) counts[q.status] += 1;

  const month = todayIn(timeZone, now).slice(0, 7);
  const won = WON.reduce((n, s) => n + counts[s], 0);
  const lost = LOST.reduce((n, s) => n + counts[s], 0);

  return {
    counts,
    openValueCents: exactSum(quotes.filter((q) => OPEN.includes(q.status)).map((q) => q.total_cents)),
    wonThisMonthCents: exactSum(
      quotes.filter((q) => WON.includes(q.status) && q.responded_at && todayIn(timeZone, new Date(q.responded_at)).slice(0, 7) === month).map((q) => q.total_cents),
    ),
    winRateBps: won + lost === 0 ? null : mulDivHalfUp(won, 10_000, won + lost),
    decided: won + lost,
  };
}
