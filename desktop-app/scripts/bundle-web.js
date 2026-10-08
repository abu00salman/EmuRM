#!/usr/bin/env node
// Copies the root project's static export (../out, built with `npm run build` from the
// repo root — NEXT_BASE_PATH must stay unset, same requirement as the Android build)
// into desktop-app/web, which main.js serves over the app:// protocol and
// electron-builder packages into the installer.
const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "..", "..", "out");
const DEST = path.join(__dirname, "..", "web");

if (!fs.existsSync(SRC)) {
  console.error(`Missing ${SRC} — run "npm run build" from the repo root first.`);
  process.exit(1);
}
const indexHtml = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
if (indexHtml.includes("/EmuRM/_next/")) {
  console.error(`${SRC}/index.html references a /EmuRM/ base path — rebuild without NEXT_BASE_PATH set.`);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });
console.log(`Bundled ${SRC} -> ${DEST}`);
