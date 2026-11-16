import { describe, expect, it } from "vitest";
import { readImages, sniffImageType } from "./files";

const file = (bytes: number[], name = "a.jpg", pad = 0) => new File([new Uint8Array([...bytes, ...new Array(pad).fill(0)])], name);
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

describe("photo checks", () => {
  it("recognises real images by their bytes, not their names", () => {
    expect(sniffImageType(new Uint8Array(JPEG))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array(PNG))).toBe("image/png");
    expect(sniffImageType(new Uint8Array(WEBP))).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
  it("encodes good photos and ignores empty file slots", async () => {
    const out = await readImages([file(JPEG), new File([], "")]);
    expect(out).toEqual([{ mimeType: "image/jpeg", data: Buffer.from(JPEG).toString("base64") }]);
  });
  it("refuses a disguised file, an oversized photo and too many photos", async () => {
    await expect(readImages([file([0x3c, 0x73, 0x76, 0x67], "evil.jpg")])).rejects.toMatchObject({ kind: "input" });
    await expect(readImages([file(JPEG, "big.jpg", 1_500_001)])).rejects.toMatchObject({ kind: "input" });
    await expect(readImages([1, 2, 3, 4].map(() => file(JPEG)))).rejects.toMatchObject({ kind: "input" });
  });
});
