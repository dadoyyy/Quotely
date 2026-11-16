import { describe, expect, it } from "vitest";
import { displayStatus, invoiceInfo } from "./invoices";

describe("invoices", () => {
  it("calls an unpaid invoice past its due date overdue", () => {
    expect(displayStatus({ status: "unpaid", due_date: "2026-11-01" }, "2026-11-16")).toBe("overdue");
    expect(displayStatus({ status: "unpaid", due_date: "2026-11-16" }, "2026-11-16")).toBe("unpaid");
    expect(displayStatus({ status: "unpaid", due_date: null }, "2026-11-16")).toBe("unpaid");
    expect(displayStatus({ status: "paid", due_date: "2020-01-01" }, "2026-11-16")).toBe("paid");
    expect(displayStatus({ status: "void", due_date: "2020-01-01" }, "2026-11-16")).toBe("void");
  });
  it("reads the invoice block from a snapshot, tolerating anything else", () => {
    expect(invoiceInfo({ invoice: { number: "INV-1", issueDate: "2026-11-16", dueDate: null } })).toEqual({ number: "INV-1", issueDate: "2026-11-16", dueDate: null });
    expect(invoiceInfo({ invoice: { number: 5 } })).toBeNull();
    expect(invoiceInfo(null)).toBeNull();
    expect(invoiceInfo({})).toBeNull();
  });
});
