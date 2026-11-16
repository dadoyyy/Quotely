import { addDays } from "./model";

/**
 * A link outlives the quote's valid-until date by 30 days, so a customer who comes back late still
 * sees the document (and why it can't be accepted any more) instead of a dead link.
 */
export function linkExpiry(validUntil: string | null, now: Date = new Date()): string {
  if (validUntil) return `${addDays(validUntil, 30)}T23:59:59Z`;
  return new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString();
}

/** Only a plain #rrggbb ever reaches a style attribute. */
export function safeBrandColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#171717";
}

/** Link scanners and crawlers fetch pages without a person being there; they must not count as a view. */
export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|preview|scan|slurp|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests|headless/i.test(userAgent);
}
