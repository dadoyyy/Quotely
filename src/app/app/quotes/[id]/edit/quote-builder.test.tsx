// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogItemRow } from "@/lib/rows";
import type { LineDraft, QuoteDraftState } from "@/lib/quotes/model";

const saveQuoteDraft = vi.fn();
vi.mock("../../actions", () => ({ saveQuoteDraft: (...a: unknown[]) => saveQuoteDraft(...a) }));
vi.mock("../../ai-actions", () => ({ draftFromDescription: vi.fn(), markAiDraftAccepted: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

import { QuoteBuilder } from "./quote-builder";

const line = (over: Partial<LineDraft> & Pick<LineDraft, "id" | "name">): LineDraft => ({
  sectionId: null, catalogItemId: null, description: "", kind: "service", unit: "lot", quantity: "1", cost: "", markup: "",
  price: "", discount: "", taxable: true, ...over,
});

/** The pricing engine's worked example, typed as a person would. Total 24,291.49; deposit 12,145.75; margin 4,240.62. */
const initial = (): QuoteDraftState => ({
    header: {
      customerId: "c1", title: "Kitchen", scope: "", terms: "", notes: "", issueDate: "2026-11-16", validUntil: "2026-12-16",
      vatRate: "12", vatExempt: false, depositPercent: "50", discountKind: "percent", discountValue: "5",
    },
    sections: [],
    lines: [
      line({ id: "a", name: "Tiling", quantity: "40.5", cost: "300", markup: "25", unit: "sqm" }),
      line({ id: "b", name: "Carpentry", quantity: "3", cost: "1800", price: "2500", discount: "10", unit: "day" }),
      line({ id: "c", name: "Permit", price: "1000", taxable: false, kind: "fee" }),
    ],
});

const catalog: CatalogItemRow[] = [
  {
    id: "cat1", org_id: "o", sku: null, name: "Floor tile", description: "Porcelain", kind: "material", unit: "sqm",
    default_cost_cents: 30_000, default_markup_bps: 2_500, default_price_cents: 37_500, is_taxable: true, category: null, is_active: true,
  },
];
const customers = [{ id: "c1", name: "Cruz", company: null, is_vat_exempt: false }, { id: "c2", name: "Reyes", company: "Reyes Inc", is_vat_exempt: true }];

const setup = (state = initial()) => {
  const user = userEvent.setup();
  render(<QuoteBuilder quoteId="q1" quoteNumber={null} initial={state} customers={customers} catalog={catalog} />);
  return user;
};
const totalsCard = () => screen.getByText("Subtotal").closest("div")!.parentElement!;

beforeEach(() => saveQuoteDraft.mockReset());
afterEach(cleanup);

describe("quote builder", () => {
  it("shows the worked example's totals, deposit and private margin", () => {
    setup();
    const panel = totalsCard();
    expect(within(panel).getByText("₱22,937.50")).toBeInTheDocument(); // subtotal
    expect(within(panel).getByText("−₱1,146.88")).toBeInTheDocument(); // discount
    expect(within(panel).getByText("₱2,500.87")).toBeInTheDocument(); // VAT
    expect(within(panel).getByText("₱24,291.49")).toBeInTheDocument(); // total
    expect(within(panel).getByText("₱12,145.75")).toBeInTheDocument(); // deposit due
    expect(screen.getByText(/never shown to your customer/i)).toBeInTheDocument();
    expect(screen.getByText(/₱4,240\.62 · 19\.46%/)).toBeInTheDocument();
  });

  it("recalculates live as the user types", async () => {
    const user = setup();
    const qty = screen.getByLabelText("Quantity, line 3");
    await user.clear(qty);
    await user.type(qty, "2");
    // permit is now 2 x 1,000 and untaxed: subtotal 23,937.50
    expect(within(totalsCard()).getByText("₱23,937.50")).toBeInTheDocument();
    expect(screen.getByLabelText("Line total, line 3")).toHaveTextContent("₱2,000.00");
  });

  it("shows the computed price as a placeholder until a price is typed", () => {
    setup();
    expect(screen.getByLabelText("Unit price, line 1")).toHaveAttribute("placeholder", "375.00");
  });

  it("deleting a line removes it from the totals", async () => {
    const user = setup();
    await user.click(screen.getByLabelText("Delete line 3"));
    expect(screen.queryByLabelText("Item name, line 3")).not.toBeInTheDocument();
    expect(within(totalsCard()).getByText("₱21,937.50")).toBeInTheDocument();
  });

  it("sends parsed values (never totals) when saving, then says it saved", async () => {
    saveQuoteDraft.mockResolvedValue({ ok: true, savedAt: "2026-11-16T10:30:00Z" });
    const user = setup();
    await user.type(screen.getByLabelText("Item name, line 1"), "!"); // make it dirty
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saveQuoteDraft).toHaveBeenCalledTimes(1));
    const [id, payload] = saveQuoteDraft.mock.calls[0];
    expect(id).toBe("q1");
    expect(payload.lines[0]).toMatchObject({ name: "Tiling!", quantityMilli: 40_500, unitCostCents: 30_000, markupBps: 2_500 });
    expect(payload.discount).toEqual({ kind: "percent", bps: 500 });
    expect(JSON.stringify(payload)).not.toMatch(/total|subtotal/i);
    expect(await screen.findByText(/^Saved at/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Save" })).toBeDisabled(); // nothing left to save
  });

  it("blocks the save and points at the bad field", async () => {
    const user = setup();
    const qty = screen.getByLabelText("Quantity, line 1");
    await user.clear(qty);
    await user.type(qty, "abc");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(saveQuoteDraft).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a quantity above 0/)).toBeInTheDocument();
    expect(qty).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Fix the highlighted fields/)).toBeInTheDocument();
  });

  it("keeps the user's edits and says why when the server refuses", async () => {
    saveQuoteDraft.mockResolvedValue({ ok: false, error: "This quote has already been sent and can no longer be edited." });
    const user = setup();
    await user.type(screen.getByLabelText("Item name, line 1"), "x");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/already been sent/)).toBeInTheDocument();
    expect(screen.getByLabelText("Item name, line 1")).toHaveValue("Tilingx");
    expect(await screen.findByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("fills a line from the price list when the name matches", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "+ Add item" }));
    const name = screen.getByLabelText("Item name, line 4");
    await user.type(name, "floor tile");
    await user.tab();
    expect(name).toHaveValue("Floor tile");
    expect(screen.getByLabelText("Unit price, line 4")).toHaveAttribute("placeholder", "375.00");
    expect(screen.getByLabelText("Unit, line 4")).toHaveValue("sqm");
  });

  it("adds a line from the price list picker", async () => {
    const user = setup();
    await user.selectOptions(screen.getByLabelText("Add from price list"), "cat1");
    expect(screen.getByLabelText("Item name, line 4")).toHaveValue("Floor tile");
  });

  it("Enter in the last quantity box starts a new line, ready to type", async () => {
    const user = setup();
    await user.click(screen.getByLabelText("Quantity, line 3"));
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Item name, line 4")).toHaveFocus();
  });

  it("Enter in the name moves to quantity; Enter in quantity moves down a line", async () => {
    const user = setup();
    await user.click(screen.getByLabelText("Item name, line 1"));
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Quantity, line 1")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Quantity, line 2")).toHaveFocus();
  });

  it("groups lines into sections and keeps them when a section is removed", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(screen.getByLabelText("Section title"), "Floors");
    await user.click(screen.getByRole("button", { name: "Remove section Floors" }));
    expect(screen.queryByLabelText("Section title")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Item name, line 3")).toBeInTheDocument();
  });

  it("applies a VAT-exempt customer's status when the customer changes", async () => {
    const user = setup();
    await user.selectOptions(screen.getByLabelText("Customer"), "c2");
    expect(screen.getByLabelText("Customer is VAT-exempt")).toBeChecked();
    expect(within(totalsCard()).getByText("₱0.00", { selector: "span" })).toBeInTheDocument();
  });

  it("reveals the per-line margin in the details", async () => {
    const user = setup();
    await user.click(screen.getAllByRole("button", { name: "Details" })[0]);
    expect(screen.getByTestId("margin-a")).toHaveTextContent(/Internal margin on this line/);
  });

  it("warns when amounts are too large instead of showing nonsense", async () => {
    const user = setup();
    const qty = screen.getByLabelText("Quantity, line 1");
    const price = screen.getByLabelText("Unit price, line 1");
    await user.clear(qty); await user.type(qty, "100000");
    await user.clear(price); await user.type(price, "100000000");
    for (const n of [2, 3]) {
      const q = screen.getByLabelText(`Quantity, line ${n}`);
      const p = screen.getByLabelText(`Unit price, line ${n}`);
      await user.clear(q); await user.type(q, "100000");
      await user.clear(p); await user.type(p, "100000000");
    }
    for (let i = 0; i < 10; i++) await user.click(screen.getAllByRole("button", { name: "Duplicate" })[0]);
    expect(screen.getByText(/too large to calculate/i)).toBeInTheDocument();
  });
});
