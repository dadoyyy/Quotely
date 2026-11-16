// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DemoPage from "./page";

afterEach(cleanup);

describe("demo page", () => {
  it("shows both sides of the quote and never claims to be real", () => {
    render(<DemoPage />);
    expect(screen.getByText(/Sample data, nothing here is saved/)).toBeTruthy();
    expect(screen.getByText(/What only you see/)).toBeTruthy();
    expect(screen.getByText("Quotation")).toBeTruthy();
    expect(screen.getByText("Your cost")).toBeTruthy();
    expect(screen.getAllByText(/from your price list/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Electrical rewiring/)).toBeTruthy();
  });
});
