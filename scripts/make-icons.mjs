// Renders PNG app icons from public/icons/icon.svg. Run: npm run icons
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out("icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icon-512.png"));
await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));
// Maskable: keep the mark inside the 80% safe zone on a full-bleed black square
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#000000" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(out("icon-maskable-512.png"));
console.log("Icons written to public/icons");
