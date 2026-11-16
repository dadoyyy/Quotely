// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuoteDocument } from "@/components/quote-document";
import type { QuoteSnapshot } from "@/lib/quotes/snapshot";

const respond = vi.fn();
vi.mock("./actions", () => ({ respond: (...a: unknown[]) => respond(...a) }));
import { ResponsePanel } from "./response-panel";

afterEach(() => { cleanup(); respond.mockReset(); });

const snapshot: QuoteSnapshot = {
  version: 1, currency: "PHP",
  quote: { number: "Q-2026-0001", title: "Kitchen remodel", scope: "Full kitchen", terms: "50% down payment", issueDate: "2026-11-16", validUntil: "2026-12-16", revision: 1, sentAt: null },
  business: { name: "Acme Renovations", logoUrl: null, address: "Manila", email: "a@acme.ph", phone: null, tin: null, brandColor: "#112233; background:url(x)" },
  customer: { name: "Maria Cruz", company: null, email: null, phone: null, address: null, tin: null },
  sections: [{ id: "s", title: "Floors" }],
  lines: [
    { id: "a", sectionId: "s", name: "Tiling", description: "Porcelain", unit: "sqm", quantityMilli: 40_500, unitPriceCents: 37_500, lineDiscountBps: 0, netCents: 1_518_750, isTaxable: true },
    { id: "b", sectionId: null, name: "Permit", description: null, unit: "lot", quantityMilli: 1000, unitPriceCents: 100_000, lineDiscountBps: 1000, netCents: 90_000, isTaxable: false },
  ],
  totals: { subtotalCents: 1_608_750, discount: { kind: "percent", value: 500, cents: 80_438 }, customerIsVatExempt: false, vatRateBps: 1200, vatCents: 172_477, totalCents: 1_700_789, depositPercentBps: 5000, depositCents: 850_395, balanceCents: 850_394 },
};

describe("customer quote document", () => {
  it("shows the business, customer, items, totals and terms", () => {
    render(<QuoteDocument snapshot={snapshot} />);
    expect(screen.getByText("Acme Renovations")).toBeInTheDocument();
    expect(screen.getByText("Q-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Maria Cruz")).toBeInTheDocument();
    expect(screen.getByText("Floors")).toBeInTheDocument();
    expect(screen.getByText("40.5 sqm")).toBeInTheDocument();
    expect(screen.getByText("₱17,007.89")).toBeInTheDocument();
    expect(screen.getByText("Discount (5%)")).toBeInTheDocument();
    expect(screen.getByText("Deposit due (50%)")).toBeInTheDocument();
    expect(screen.getByText("50% down payment")).toBeInTheDocument();
    expect(screen.getByText("Not subject to VAT")).toBeInTheDocument();
  });

  it("never lets a hostile brand colour into the page's styles", () => {
    const { container } = render(<QuoteDocument snapshot={snapshot} />);
    expect(container.innerHTML).not.toContain("url(x)");
  });
});

describe("response panel", () => {
  it("starts on Approve, which needs a name and a confirmation", () => {
    render(<ResponsePanel token="t" businessName="Acme" />);
    expect(screen.getByRole("button", { name: "Approve this quote" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your full name")).toBeRequired();
    expect(screen.getByRole("checkbox")).toBeRequired();
  });

  it("asks for a reason when declining or requesting changes", async () => {
    const user = userEvent.setup();
    render(<ResponsePanel token="t" businessName="Acme" />);
    await user.click(screen.getByRole("tab", { name: "Request changes" }));
    expect(screen.getByLabelText("What would you like changed?")).toBeRequired();
    await user.click(screen.getByRole("tab", { name: "Decline" }));
    expect(screen.getByLabelText("Why are you declining?")).toBeRequired();
    expect(screen.getByRole("button", { name: "Decline this quote" })).toBeInTheDocument();
  });

  it("sends the chosen action and shows the thank-you, then no more buttons", async () => {
    respond.mockResolvedValue({ ok: true, status: "approved" });
    const user = userEvent.setup();
    render(<ResponsePanel token="tok" businessName="Acme" />);
    await user.type(screen.getByLabelText("Your full name"), "Maria Cruz");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Approve this quote" }));
    expect(await screen.findByText(/you've approved this quote/i)).toBeInTheDocument();
    const [token, , fd] = respond.mock.calls[0] as [string, unknown, FormData];
    expect(token).toBe("tok");
    expect(fd.get("action")).toBe("approve");
    expect(fd.get("name")).toBe("Maria Cruz");
    expect(within(document.body).queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("shows the server's reason when an answer is refused", async () => {
    respond.mockResolvedValue({ error: "This quote has expired" });
    const user = userEvent.setup();
    render(<ResponsePanel token="t" businessName="Acme" />);
    await user.type(screen.getByLabelText("Your full name"), "Maria");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Approve this quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This quote has expired");
  });
});
