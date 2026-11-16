// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogItemRow } from "@/lib/rows";

const draft = vi.fn();
const accepted = vi.fn();
vi.mock("../../ai-actions", () => ({ draftFromDescription: (...a: unknown[]) => draft(...a), markAiDraftAccepted: (...a: unknown[]) => accepted(...a) }));

import { AiPanel } from "./ai-panel";

const item = (id: string, name: string) => ({ id, name }) as unknown as CatalogItemRow;
const catalog = [item("i1", "Paint, per gallon"), item("i2", "Door handle")];

afterEach(cleanup);
beforeEach(() => { draft.mockReset(); accepted.mockReset(); });

describe("AiPanel", () => {
  it("shows suggestions, adds only the checked ones and records acceptance", async () => {
    draft.mockResolvedValue({ draftId: "d1", matches: [{ itemId: "i1", quantity: "6", reason: "two rooms" }, { itemId: "i2", quantity: null, reason: "handle" }], unmatched: ["Roof repair"], remaining: 9 });
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AiPanel quoteId="q1" catalog={catalog} onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "Draft with AI" }));
    await user.type(screen.getByRole("textbox"), "repaint two rooms");
    await user.click(screen.getByRole("button", { name: "Suggest items" }));
    expect(await screen.findByText("Roof repair")).toBeTruthy();
    await user.click(screen.getByLabelText("Add Door handle"));
    await user.click(screen.getByRole("button", { name: "Add 1 item" }));
    expect(onAdd).toHaveBeenCalledWith([{ item: catalog[0], quantity: "6" }]);
    expect(accepted).toHaveBeenCalledWith("d1");
  });
  it("shows errors and keeps Suggest disabled without input", async () => {
    draft.mockResolvedValue({ error: "AI is busy" });
    const user = userEvent.setup();
    render(<AiPanel quoteId="q1" catalog={catalog} onAdd={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Draft with AI" }));
    expect((screen.getByRole("button", { name: "Suggest items" }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByRole("textbox"), "x");
    await user.click(screen.getByRole("button", { name: "Suggest items" }));
    expect((await screen.findByRole("alert")).textContent).toBe("AI is busy");
  });
});
