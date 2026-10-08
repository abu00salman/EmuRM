// Post-build step: rewrite every JavaScript file in the static export to syntax that
// Chrome 79 / Safari 13 can parse.
//
// Next 16 emits ES2022 (class static blocks `static { }` in its own runtime chunk, `||=`,
// class fields, ...). Android System WebView on TVs and on phones whose WebView isn't
// auto-updated is often older than the Chrome 94 that `static { }` needs, and then the
// very first script throws `SyntaxError: Unexpected token '{'` — nothing hydrates, no
// button, link or toggle does anything (reproduced on a real Chromium 90 build).
//
// esbuild only rewrites *syntax*; it adds no runtime APIs (see src/lib/compat-polyfills.ts
// for those). Whitespace is minified so the output stays about the size it was.
import { transform } from "esbuild";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname;
// chrome79 only: esbuild refuses to lower destructuring for the Safari/Firefox targets it has bug data for, and
// lowering to the oldest engine we support produces syntax every newer engine parses too.
const TARGET = ["chrome79"];
// emulator cores are third-party Emscripten glue, loaded and sandboxed separately; leave them byte-identical
const SKIP = (p) => p.includes("/cores/") || p.endsWith(".min.js.map");

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".js") && !SKIP(p)) yield p;
  }
}

let files = 0, before = 0, after = 0;
for await (const file of walk(OUT)) {
  const src = await readFile(file, "utf8");
  const res = await transform(src, { target: TARGET, loader: "js", minifyWhitespace: true, legalComments: "inline", charset: "utf8" });
  await writeFile(file, res.code);
  files++; before += src.length; after += res.code.length;
}
console.log(`downlevel-js: ${files} files to ${TARGET.join("/")} (${(before / 1024) | 0}KB -> ${(after / 1024) | 0}KB)`);
