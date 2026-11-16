import { formatCents } from "./money-format";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export interface QuoteEmailInput {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  totalCents: number;
  validUntil: string | null;
  link: string;
  /** An optional personal note from the sender, shown above the quote summary. */
  message?: string;
}

/** The email that carries a quote link. Only customer-facing facts go in: no cost, no margin. */
export function composeQuoteEmail(i: QuoteEmailInput): { subject: string; html: string; text: string } {
  const subject = oneLine(`${i.businessName} sent you a quotation (${i.quoteNumber})`);
  const total = formatCents(i.totalCents);
  const note = i.message?.trim() ?? "";

  const text = [
    `Hi ${oneLine(i.customerName)},`,
    "",
    note ? `${note}\n` : "",
    `${i.businessName} has sent you a quotation: ${i.title}`,
    `Quote ${i.quoteNumber} · Total ${total}${i.validUntil ? ` · Valid until ${i.validUntil}` : ""}`,
    "",
    `View, approve or ask for changes: ${i.link}`,
  ].filter((l, idx, a) => !(l === "" && a[idx - 1] === "")).join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 16px;font-size:15px">Hi ${escapeHtml(oneLine(i.customerName))},</p>
${note ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin:0 0 16px;font-size:15px;line-height:1.5"><strong>${escapeHtml(i.businessName)}</strong> has sent you a quotation for <strong>${escapeHtml(i.title)}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;color:#525252">
<tr><td style="padding:2px 16px 2px 0">Quote</td><td>${escapeHtml(i.quoteNumber)}</td></tr>
<tr><td style="padding:2px 16px 2px 0">Total</td><td><strong style="color:#171717">${escapeHtml(total)}</strong></td></tr>
${i.validUntil ? `<tr><td style="padding:2px 16px 2px 0">Valid until</td><td>${escapeHtml(i.validUntil)}</td></tr>` : ""}
</table>
<p style="margin:0 0 20px"><a href="${escapeHtml(i.link)}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px">View quotation</a></p>
<p style="margin:0;font-size:12px;color:#737373;line-height:1.5">You can approve it, ask for changes or decline it on that page. If the button doesn't work, copy this link into your browser:<br>${escapeHtml(i.link)}</p>
</td></tr></table></td></tr></table></body></html>`;

  return { subject, html, text };
}

export interface DigestItem {
  title: string;
  number: string | null;
  customerName: string;
  reason: string;
  totalCents: number;
}

/** The daily "needs your attention" email to the business itself. */
export function composeDigestEmail(i: { businessName: string; items: DigestItem[]; dashboardUrl: string }): { subject: string; html: string; text: string } {
  const n = i.items.length;
  const subject = oneLine(`${n} quote${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} your attention`);
  const text = [
    `${i.businessName}: ${subject.toLowerCase()}.`,
    "",
    ...i.items.map((x) => `- ${x.title}${x.number ? ` (${x.number})` : ""} · ${oneLine(x.customerName)} · ${formatCents(x.totalCents)}\n  ${x.reason}`),
    "",
    `Open your dashboard: ${i.dashboardUrl}`,
  ].join("\n");
  const rows = i.items
    .map(
      (x) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px"><strong>${escapeHtml(x.title)}</strong>${x.number ? ` <span style="color:#737373">${escapeHtml(x.number)}</span>` : ""}<br><span style="color:#525252">${escapeHtml(oneLine(x.customerName))} · ${escapeHtml(formatCents(x.totalCents))}</span><br><span style="color:#171717">${escapeHtml(x.reason)}</span></td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#171717"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:8px;padding:28px" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 4px;font-size:13px;color:#737373">${escapeHtml(i.businessName)}</p><h1 style="margin:0 0 16px;font-size:18px">${escapeHtml(subject)}</h1><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table><p style="margin:20px 0 0"><a href="${escapeHtml(i.dashboardUrl)}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Open dashboard</a></p></td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}
