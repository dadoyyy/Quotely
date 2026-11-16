import { describe, expect, it } from "vitest";
import { isUuid, sanitizeSearch } from "./search";

describe("sanitizeSearch", () => {
  it("keeps names, emails and accents", () => {
    expect(sanitizeSearch("  Juan  dela Cruz ")).toBe("Juan dela Cruz");
    expect(sanitizeSearch("juan.cruz@mail.com")).toBe("juan.cruz@mail.com");
    expect(sanitizeSearch("Peña O'Brien")).toBe("Peña O'Brien");
  });

  it("strips anything that could change the filter's meaning", () => {
    expect(sanitizeSearch("a,name.eq.x),(b")).not.toMatch(/[,()]/);
    expect(sanitizeSearch("100%_off\\")).toBe("100 off");
    expect(sanitizeSearch(undefined)).toBe("");
  });

  it("caps the length", () => {
    expect(sanitizeSearch("x".repeat(500))).toHaveLength(60);
  });
});

describe("isUuid", () => {
  it("accepts uuids and nothing else", () => {
    expect(isUuid("3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90")).toBe(true);
    expect(isUuid("new")).toBe(false);
    expect(isUuid("3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90; drop table")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
