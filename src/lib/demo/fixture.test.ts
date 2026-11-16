import { describe, expect, it } from "vitest";
import { snapshotSchema } from "../quotes/snapshot";
import { DEMO_AI, buildDemo } from "./fixture";

describe("demo fixture", () => {
  const { priced, snapshot, internal } = buildDemo();

  it("adds up exactly, using the real engine", () => {
    expect(priced.lines.reduce((s, l) => s + l.netCents, 0)).toBe(priced.subtotalCents);
    expect(priced.subtotalCents - priced.discountCents + priced.vatCents).toBe(priced.totalCents);
    expect(priced.depositCents + priced.balanceCents).toBe(priced.totalCents);
    expect(snapshot.totals.totalCents).toBe(priced.totalCents);
  });
  it("is a valid customer snapshot with no internal numbers", () => {
    expect(snapshotSchema.safeParse(snapshot).success).toBe(true);
    const json = JSON.stringify(snapshot);
    for (const word of ["cost", "markup", "margin"]) expect(json.toLowerCase()).not.toContain(word);
  });
  it("shows a positive margin to the owner", () => {
    expect(priced.marginCents).toBeGreaterThan(0);
    expect(internal.every((l) => l.costCents > 0)).toBe(true);
  });
  it("only suggests items that exist in the demo quote's price list, and states quantities only when given", () => {
    const names = new Set(snapshot.lines.map((l) => l.name));
    for (const m of DEMO_AI.matches) expect(names.has(m.name)).toBe(true);
    for (const m of DEMO_AI.matches) if (m.quantity) expect(DEMO_AI.text).toContain(m.quantity);
  });
});
