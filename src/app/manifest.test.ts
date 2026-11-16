import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  const m = manifest();
  it("is installable: standalone, starts in the app, has a name and theme", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/app");
    expect(m.short_name).toBe("Quotely");
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it("offers 192 and 512 icons plus a maskable one, and every file exists", () => {
    const sizes = m.icons!.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(m.icons!.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of m.icons!) expect(existsSync(join(process.cwd(), "public", i.src))).toBe(true);
  });
  it("only points shortcuts at real app pages", () => {
    for (const s of m.shortcuts ?? []) expect(s.url.startsWith("/app")).toBe(true);
  });
  it("ships the service worker, offline page and Apple icon", () => {
    for (const f of ["public/sw.js", "src/app/offline/page.tsx", "src/app/apple-icon.png"]) expect(existsSync(join(process.cwd(), f))).toBe(true);
  });
});
