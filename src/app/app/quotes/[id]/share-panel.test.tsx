// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../share-actions", () => ({ sendQuote: vi.fn(), renewShareLink: vi.fn() }));
import { SharePanel } from "./share-panel";

afterEach(cleanup);

describe("share panel", () => {
  it("offers to email the customer when email is set up and the customer has an address", () => {
    render(<SharePanel quoteId="q" mode="send" customerEmail="maria@example.ph" emailConfigured />);
    expect(screen.getByLabelText(/Also email it to maria@example.ph/)).toBeChecked();
    expect(screen.getByLabelText("Personal note")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send quote" })).toBeInTheDocument();
  });

  it("explains instead when the customer has no email", () => {
    render(<SharePanel quoteId="q" mode="send" customerEmail={null} emailConfigured />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Add an email address to this customer/)).toBeInTheDocument();
  });

  it("explains instead when email isn't set up", () => {
    render(<SharePanel quoteId="q" mode="renew" customerEmail="maria@example.ph" emailConfigured={false} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Email sending isn't set up yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make a new link" })).toBeInTheDocument();
  });
});
