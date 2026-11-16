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
