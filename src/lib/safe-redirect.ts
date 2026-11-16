/** Only ever redirect to a path on this site. Anything else falls back, so `next=` can't bounce users elsewhere. */
export function safeNext(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string" || value === "") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\r\n\t]/.test(value)) return fallback;
  return value;
}
