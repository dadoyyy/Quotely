import { describe, expect, it } from "vitest";
import { composeQuoteEmail, type QuoteEmailInput } from "./email-compose";

const base: QuoteEmailInput = {
  businessName: "Acme Renovations", customerName: "Maria Cruz", quoteNumber: "Q-2026-0001", title: "Kitchen remodel",
  totalCents: 2_429_149, validUntil: "2026-12-16", link: "https://app.example.com/q/abc_DEF-123",
};

describe("quote email", () => {
  it("carries the link, number, total and validity in both formats", () => {
    const m = composeQuoteEmail(base);
    expect(m.subject).toBe("Acme Renovations sent you a quotation (Q-2026-0001)");
    for (const part of [base.link, "Q-2026-0001", "₱24,291.49", "2026-12-16", "Kitchen remodel"]) {
      expect(m.html).toContain(part);
      expect(m.text).toContain(part);
    }
  });

  it("escapes everything a user typed so it can't inject markup", () => {
    const m = composeQuoteEmail({
      ...base, businessName: `<img src=x onerror=alert(1)>`, customerName: `"><script>x</script>`, title: `A & B <b>`,
      message: `<a href="javascript:1">click</a>\nsecond line`,
    });
    expect(m.html).not.toMatch(/<img src=x|<script>|<a href="javascript|<b>/);
    expect(m.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(m.html).toContain("A &amp; B &lt;b&gt;");
    expect(m.html).toContain("<br>second line");
  });

  it("keeps header injection out of the subject", () => {
    expect(composeQuoteEmail({ ...base, businessName: "Acme\r\nBcc: evil@x.com" }).subject).not.toMatch(/[\r\n]/);
  });

  it("leaves out the validity row when there is none", () => {
    const m = composeQuoteEmail({ ...base, validUntil: null });
    expect(m.html).not.toContain("Valid until");
    expect(m.text).not.toContain("Valid until");
  });
});

import { composeDigestEmail } from "./email-compose";

describe("digest email", () => {
  const items = [
    { title: "Kitchen <b>remodel</b>", number: "Q-2026-0001", customerName: "Maria\nCruz", reason: "Expires in 2 days.", totalCents: 2_429_149 },
    { title: "Aircon service", number: null, customerName: "Reyes", reason: "Asked for changes. Send a revision.", totalCents: 500_000 },
  ];
  it("lists each quote with its reason and a dashboard link, escaping what users typed", () => {
    const m = composeDigestEmail({ businessName: "Acme", items, dashboardUrl: "https://app.example.com/app" });
    expect(m.subject).toBe("2 quotes need your attention");
    expect(m.html).toContain("Kitchen &lt;b&gt;remodel&lt;/b&gt;");
    expect(m.html).not.toContain("<b>remodel");
    for (const part of ["₱24,291.49", "Expires in 2 days.", "Send a revision", "https://app.example.com/app", "Q-2026-0001"]) {
      expect(m.html).toContain(part);
      expect(m.text).toContain(part);
    }
  });
  it("uses the singular for one quote", () => {
    expect(composeDigestEmail({ businessName: "Acme", items: [items[1]], dashboardUrl: "https://x.test/app" }).subject).toBe("1 quote needs your attention");
  });
});
