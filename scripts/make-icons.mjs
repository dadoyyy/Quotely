// Draws the app icons (home screen, install dialogs, Apple touch icon) from the logo mark. Run: node scripts/make-icons.mjs
import sharp from "sharp";

const BG = "#0e1c15";
// The mark, drawn on a 24-unit grid (same paths as src/components/logo.tsx).
const glyph = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18.25 11.06A7.5 7.5 0 1 1 12.3 5.61" stroke="#a2d44a" stroke-width="2.6"/>
  <path d="M7.9 13.3 10.4 15.8 20 5.6" stroke="#fff" stroke-width="2.6"/>
  <circle cx="19.6" cy="19.2" r="1.5" fill="#a2d44a" stroke="none"/></g>`;

/** `scale` is the share of the canvas the 24-unit glyph fills; `radius` rounds the tile (0 = full bleed). */
const svg = (size, scale, radius) => {
  const g = size * scale;
  const off = (size - g) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <g transform="translate(${off} ${off}) scale(${g / 24})">${glyph}</g></svg>`;
};

const out = async (file, size, scale, radius) => {
  await sharp(Buffer.from(svg(size, scale, radius))).png().toFile(file);
  console.log("wrote", file);
};

await out("public/icons/icon-192.png", 192, 0.72, 44);
await out("public/icons/icon-512.png", 512, 0.72, 116);
// Maskable: the OS crops it to its own shape, so keep the mark inside the central safe zone.
await out("public/icons/maskable-512.png", 512, 0.56, 0);
// Apple rounds the corners itself.
await out("src/app/apple-icon.png", 180, 0.68, 0);
