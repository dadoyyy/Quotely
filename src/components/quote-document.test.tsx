// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { QuoteSnapshot } from "@/lib/quotes/snapshot";
import { QuoteDocument } from "./quote-document";

afterEach(cleanup);

const snapshot: QuoteSnapshot = {
  version: 1, currency: "PHP",
  quote: { number: "QT-2026-0001", title: "Kitchen", scope: null, terms: null, issueDate: "2026-11-01", validUntil: "2026-12-01", revision: 1, sentAt: null },
  business: { name: "Acme Reno", logoUrl: null, address: null, email: null, phone: null, tin: null, brandColor: "#112233" },
  customer: { name: "Maria Santos", company: null, email: null, phone: null, address: null, tin: null },
  sections: [],
  lines: [],
  totals: { subtotalCents: 100000, discount: { kind: "none", value: 0, cents: 0 }, customerIsVatExempt: false, vatRateBps: 1200, vatCents: 12000, totalCents: 112000, depositPercentBps: 0, depositCents: 0, balanceCents: 112000 },
};

describe("QuoteDocument", () => {
  it("renders a quotation by default", () => {
    render(<QuoteDocument snapshot={snapshot} />);
    expect(screen.getByText("Quotation")).toBeTruthy();
    expect(screen.getByText("Prepared for")).toBeTruthy();
    expect(screen.getByText(/Valid until 2026-12-01/)).toBeTruthy();
  });
  it("renders an invoice with its own number, dates and stamp", () => {
    render(<QuoteDocument snapshot={snapshot} invoice={{ number: "INV-2026-0007", issueDate: "2026-11-16", dueDate: "2026-11-30" }} stamp="Paid" />);
    expect(screen.getByText("Invoice")).toBeTruthy();
    expect(screen.getByText("INV-2026-0007")).toBeTruthy();
    expect(screen.getByText("Bill to")).toBeTruthy();
    expect(screen.getByText(/Due 2026-11-30/)).toBeTruthy();
    expect(screen.getByText(/For quotation QT-2026-0001/)).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.queryByText(/Valid until/)).toBeNull();
  });
});
