import { timingSafeEqual } from "node:crypto";

/** Scheduled jobs present `Authorization: Bearer <CRON_SECRET>`. No secret configured means nobody gets in. */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
