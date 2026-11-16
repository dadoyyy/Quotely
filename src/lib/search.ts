/** Make free text safe to drop into a PostgREST `or(...)` filter: letters, digits, spaces and a few email characters only. */
export function sanitizeSearch(q: string | undefined): string {
  return (q ?? "").replace(/[^\p{L}\p{N}\s@.'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
