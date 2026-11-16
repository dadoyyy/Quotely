// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast";

function Demo() {
  const t = useToast();
  return (
    <>
      <button onClick={() => t.success("Saved")}>ok</button>
      <button onClick={() => t.error("Nope")}>bad</button>
    </>
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("toasts", () => {
  it("does nothing outside a provider", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Demo />);
    await user.click(screen.getByText("ok"));
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("shows a success toast politely and an error as an alert, then removes them", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastProvider><Demo /></ToastProvider>);
    await user.click(screen.getByText("ok"));
    await user.click(screen.getByText("bad"));
    expect(screen.getByRole("status").textContent).toContain("Saved");
    expect(screen.getByRole("alert").textContent).toContain("Nope");
    await act(async () => { vi.advanceTimersByTime(4000 + 300); });
    expect(screen.queryByText("Saved")).toBeNull();
    expect(screen.getByText("Nope")).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(3500); });
    expect(screen.queryByText("Nope")).toBeNull();
  });

  it("collapses identical repeats and can be dismissed by hand", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastProvider><Demo /></ToastProvider>);
    await user.click(screen.getByText("ok"));
    await user.click(screen.getByText("ok"));
    expect(screen.getAllByText("Saved")).toHaveLength(1);
    await user.click(screen.getByLabelText("Dismiss notification"));
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
