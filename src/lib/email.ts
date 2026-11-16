import "server-only";

export type EmailResult = { ok: true } | { ok: false; reason: "not_configured" | "failed"; detail?: string };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/** Send through Resend's HTTP API. Never throws; the caller decides what a failure means. */
export async function sendEmail(m: { to: string; subject: string; html: string; text: string; replyTo?: string | null }): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] resend", res.status, body.slice(0, 300));
      return { ok: false, reason: "failed", detail: `Resend answered ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] network", e);
    return { ok: false, reason: "failed", detail: "Couldn't reach the email service" };
  }
}
