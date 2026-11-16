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
