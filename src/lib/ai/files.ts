import { ALLOWED_IMAGE_TYPES, LIMITS } from "./draft";
import { AiError, type AiImage } from "./types";

/** The first bytes of a real JPEG, PNG or WebP, so a renamed file can't pass as a photo. */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return "image/webp";
  return null;
}

/** Turn uploaded files into model inputs, refusing anything that isn't a small, real photo. */
export async function readImages(files: File[]): Promise<AiImage[]> {
  const real = files.filter((f) => f.size > 0);
  if (real.length > LIMITS.maxImages) throw new AiError("input", `Attach up to ${LIMITS.maxImages} photos.`);
  const out: AiImage[] = [];
  for (const f of real) {
    if (f.size > LIMITS.maxImageBytes) throw new AiError("input", "A photo is too large. Photos are shrunk automatically, so try a different one.");
    const bytes = new Uint8Array(await f.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) throw new AiError("input", "Only JPEG, PNG or WebP photos can be used.");
    out.push({ mimeType: type, data: Buffer.from(bytes).toString("base64") });
  }
  return out;
}
