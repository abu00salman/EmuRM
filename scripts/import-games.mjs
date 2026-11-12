#!/usr/bin/env node
/**
 * Curated-game importer.
 *
 *   node scripts/import-games.mjs --self-test --check
 *   node scripts/import-games.mjs --fetch
 *   node scripts/import-games.mjs --launch --base=http://127.0.0.1:4173
 *
 * --check validates the registry, rejects duplicate ids and files, checks that
 * license ids are on the allowlist, confirms source and evidence URLs respond,
 * and confirms fetched assets are on disk.
 * --fetch downloads permitted assets into public/games/<id>/.
 * --launch opens each instant game in headless Chromium and sets status.
 * It does not deploy.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "data/games.json");
const allowPath = path.join(root, "data/license-allowlist.json");
const gamesRoot = path.join(root, "public/games");
const evidenceDir = path.join(root, "docs/evidence/launch");

const PLATFORMS = new Set(["nes", "snes", "sega", "gba", "gbc", "gb", "html5", "md", "sms", "gg", "n64", "psx"]);
const TYPES = new Set(["instant", "requires-user-file"]);
const STATUSES = new Set(["verified", "broken", "untested"]);
const REQUIRED = ["id", "title", "platform", "type", "sourceUrl", "license", "licenseEvidenceUrl", "author", "genres", "description", "cover", "launch", "status", "redistribution", "engine", "browserPlayable"];

function parseArgs(argv) {
  const flags = new Set();
  const values = {};
  for (const arg of argv) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split(/=(.*)/s);
      values[key] = value;
    } else if (arg.startsWith("--")) flags.add(arg.slice(2));
  }
  return { flags, values };
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function insideGames(rel) {
  const resolved = path.resolve(root, rel);
  const base = gamesRoot.endsWith(path.sep) ? gamesRoot : gamesRoot + path.sep;
  if (resolved !== gamesRoot && !resolved.startsWith(base)) {
    throw new Error(`${rel} escapes public/games`);
  }
  return resolved;
}

function publicFile(urlPath) {
  if (!urlPath.startsWith("/games/")) throw new Error(`${urlPath} is not under /games/`);
  return insideGames(path.join("public", urlPath));
}

export function validateGames(games, allowlist) {
  const errors = [];
  const ids = new Map();
  const sources = new Map();
  const allowed = new Set(allowlist.spdx);
  for (const game of games) {
    const where = game?.id || "(missing id)";
    for (const key of REQUIRED) {
      if (game?.[key] === undefined || game[key] === "") errors.push(`${where}: missing ${key}`);
    }
    if (!game?.id) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id)) errors.push(`${game.id}: id must be kebab-case`);
    if (ids.has(game.id)) errors.push(`${game.id}: duplicate id (also ${ids.get(game.id)})`);
    ids.set(game.id, game.title || game.id);
    if (game.redistribution === "permitted" && game.sourceUrl) {
      if (sources.has(game.sourceUrl)) errors.push(`${game.id}: duplicate sourceUrl with ${sources.get(game.sourceUrl)}`);
      sources.set(game.sourceUrl, game.id);
    }
    if (game.redistribution !== "permitted" && game.redistribution !== "not-permitted") {
      errors.push(`${game.id}: redistribution must be permitted or not-permitted`);
    }
    if (!["hosted", "local-file", "none"].includes(game.browserPlayable)) {
      errors.push(`${game.id}: browserPlayable must be hosted, local-file, or none`);
    }
    if (!PLATFORMS.has(game.platform)) errors.push(`${game.id}: platform ${game.platform} is not allowed`);
    if (!TYPES.has(game.type)) errors.push(`${game.id}: type ${game.type} is not allowed`);
    if (!STATUSES.has(game.status)) errors.push(`${game.id}: status ${game.status} is not allowed`);
    for (const urlKey of ["sourceUrl", "licenseEvidenceUrl"]) {
      try {
        const url = new URL(game[urlKey]);
        if (url.protocol !== "https:") errors.push(`${game.id}: ${urlKey} must be https`);
      } catch {
        errors.push(`${game.id}: ${urlKey} is not a URL`);
      }
    }
    const licenses = [game.license, ...(game.assetLicenses || [])];
    if (game.redistribution === "permitted") {
      for (const license of licenses) {
        if (!allowed.has(license)) errors.push(`${game.id}: license ${license} is not on the allowlist`);
      }
      if (game.browserPlayable === "none") errors.push(`${game.id}: a permitted game needs a browser path`);
    } else if (game.redistribution === "not-permitted") {
      if (game.type !== "requires-user-file") errors.push(`${game.id}: a commercial title cannot be hosted`);
      if (game.browserPlayable === "hosted") errors.push(`${game.id}: refusing a hosted build without redistribution permission`);
      if (game.launch?.file || game.launch?.entry) errors.push(`${game.id}: must not bundle or point at a game file`);
      if (game.launch?.kind !== "local-file") errors.push(`${game.id}: needs a local-file launch`);
    }
    const desc = game.description || {};
    if (!desc.en || !desc.ar) errors.push(`${game.id}: description needs en and ar`);
    if (!Array.isArray(game.genres) || game.genres.length === 0) errors.push(`${game.id}: genres must be a non-empty array`);
    if (game.type === "instant") {
      if (game.launch?.kind === "html5" && !game.launch.entry) errors.push(`${game.id}: html5 launch needs entry`);
      if (game.launch?.kind === "rom" && (!game.launch.file || !game.launch.consoleId || !game.launch.filename)) {
        errors.push(`${game.id}: rom launch needs file, filename, and consoleId`);
      }
      if (game.launch?.kind !== "html5" && game.launch?.kind !== "rom") errors.push(`${game.id}: instant games need an html5 or rom launch`);
      if (game.redistribution !== "permitted") errors.push(`${game.id}: instant play requires redistribution permission`);
    }
  }
  return errors;
}

function selfTest() {
  const allow = loadJson(allowPath);
  const base = {
    id: "sample",
    title: "Sample",
    platform: "html5",
    type: "instant",
    sourceUrl: "https://example.com/a",
    license: "MIT",
    licenseEvidenceUrl: "https://example.com/LICENSE",
    author: "A",
    genres: ["puzzle"],
    description: { en: "en", ar: "ar" },
    cover: "/games/sample/cover.svg",
    launch: { kind: "html5", entry: "/games/sample/index.html" },
    status: "untested",
    redistribution: "permitted",
    engine: "html5",
    browserPlayable: "hosted",
  };
  const commercial = {
    ...base,
    id: "sample-commercial",
    redistribution: "not-permitted",
    type: "requires-user-file",
    license: "all-rights-reserved",
    browserPlayable: "local-file",
    engine: "libretro/fceumm",
    launch: { kind: "local-file", consoleId: "nes" },
  };
  const cases = [
    ["proprietary license", [{ ...base, license: "proprietary" }], true],
    ["non-commercial CC", [{ ...base, license: "CC-BY-NC-4.0" }], true],
    ["duplicate ids", [{ ...base }, { ...base, sourceUrl: "https://example.com/b", licenseEvidenceUrl: "https://example.com/L2" }], true],
    ["http source", [{ ...base, sourceUrl: "http://example.com/a" }], true],
    ["hosted commercial", [{ ...base, redistribution: "not-permitted", license: "all-rights-reserved" }], true],
    ["clean MIT", [{ ...base }], false],
    ["local commercial", [commercial], false],
  ];
  const failures = [];
  for (const [name, games, shouldFail] of cases) {
    const errors = validateGames(games, allow);
    if (shouldFail && errors.length === 0) failures.push(`${name}: expected errors`);
    if (!shouldFail && errors.length) failures.push(`${name}: ${errors.join("; ")}`);
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    return 1;
  }
  console.log("self-test ok");
  return 0;
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (response.status === 405 || response.status === 403 || response.status === 401 || response.status === 429 || response.status === 501) {
      response = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    if (response.status === 401 || response.status === 403 || response.status === 429) return null;
    if (!response.ok) return `${response.status} ${url}`;
    return null;
  } catch (error) {
    return `${error.name || "error"} ${url}`;
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrls(games) {
  const urls = [...new Set(games.flatMap((game) => [game.sourceUrl, game.licenseEvidenceUrl]))];
  const errors = [];
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      const problem = await checkUrl(url);
      if (problem) errors.push(problem);
      else console.log(`url ok ${url}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  return errors;
}

function hasLicenseFile(dir) {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((name) => /^licen[cs]e/i.test(name) || /^copying/i.test(name) || /gpl/i.test(name));
}

function coverSvg(game) {
  const accents = { html5: "#f2c14e", nes: "#e5484d", gba: "#8a9be0", snes: "#c9506e", sega: "#3068ff" };
  const accent = accents[game.platform] || "#9dc1ff";
  const title = game.title.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
  <rect width="300" height="400" fill="#121820"/>
  <rect x="18" y="18" width="264" height="364" fill="none" stroke="${accent}" stroke-width="6"/>
  <text x="150" y="188" text-anchor="middle" fill="#f4f7fb" font-family="Arial, sans-serif" font-size="28" font-weight="700">${title}</text>
  <text x="150" y="228" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="16">${game.platform.toUpperCase()}</text>
</svg>
`;
}

function writeProvenance(dir, game, extra) {
  const lines = [
    `title: ${game.title}`,
    `source: ${game.sourceUrl}`,
    `license: ${game.license}`,
    `licenseEvidence: ${game.licenseEvidenceUrl}`,
    ...(game.assetLicenses || []).map((license) => `assetLicense: ${license}`),
    ...extra,
  ];
  fs.writeFileSync(path.join(dir, "SOURCE.txt"), lines.join("\n") + "\n");
  fs.writeFileSync(path.join(dir, "cover.svg"), coverSvg(game));
}

async function download(url, dest) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${response.status} downloading ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  return bytes.length;
}

async function fetchGame(game) {
  const spec = game.assets;
  if (!spec) throw new Error(`${game.id}: no assets block to fetch`);
  const dest = insideGames(spec.into);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  if (spec.kind === "git") {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `emurm-${game.id}-`));
    await execFileAsync("git", ["clone", "--depth", "1", "--branch", spec.ref, spec.repo, tmp], { timeout: 180000 });
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: tmp });
    fs.rmSync(path.join(tmp, ".git"), { recursive: true, force: true });
    for (const junk of [".github", "node_modules"]) fs.rmSync(path.join(tmp, junk), { recursive: true, force: true });
    fs.cpSync(tmp, dest, { recursive: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    writeProvenance(dest, game, [`repo: ${spec.repo}`, `ref: ${spec.ref}`, `commit: ${stdout.trim()}`]);
  } else if (spec.kind === "files") {
    const notes = [];
    for (const file of spec.files) {
      const target = path.join(dest, file.name);
      if (path.relative(dest, target).startsWith("..")) throw new Error(`${game.id}: bad asset name ${file.name}`);
      const size = await download(file.url, target);
      const hash = createHash("sha256").update(fs.readFileSync(target)).digest("hex");
      notes.push(`file: ${file.name} bytes=${size} sha256=${hash} url=${file.url}`);
      console.log(`fetched ${game.id} ${file.name} (${size} bytes)`);
    }
    writeProvenance(dest, game, notes);
  } else {
    throw new Error(`${game.id}: unknown assets.kind ${spec.kind}`);
  }
  if (!hasLicenseFile(dest)) throw new Error(`${game.id}: fetch produced no license file`);
}

function ensureCovers(games) {
  for (const game of games) {
    if (!game.cover?.startsWith("/games/")) continue;
    const dest = publicFile(game.cover);
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, coverSvg(game));
  }
}

function localErrors(games) {
  const errors = [];
  const hashes = new Map();
  for (const game of games) {
    if (game.cover) {
      try {
        const cover = publicFile(game.cover);
        if (!fs.existsSync(cover)) errors.push(`${game.id}: missing cover ${game.cover}`);
      } catch (error) {
        errors.push(`${game.id}: ${error.message}`);
      }
    }
    if (game.type !== "instant") continue;
    const payload = game.launch.kind === "html5" ? game.launch.entry : game.launch.file;
    let file;
    try {
      file = publicFile(payload);
    } catch (error) {
      errors.push(`${game.id}: ${error.message}`);
      continue;
    }
    if (!fs.existsSync(file)) errors.push(`${game.id}: missing ${payload}`);
    else {
      const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      if (hashes.has(hash)) errors.push(`${game.id}: same file hash as ${hashes.get(hash)}`);
      hashes.set(hash, game.id);
    }
    const dir = path.dirname(file);
    if (!hasLicenseFile(dir)) errors.push(`${game.id}: no license file next to the asset`);
    if (!fs.existsSync(path.join(dir, "SOURCE.txt"))) errors.push(`${game.id}: missing SOURCE.txt`);
  }
  return errors;
}

async function imageSpread(buffer) {
  const sharp = (await import("sharp")).default;
  const stats = await sharp(buffer).stats();
  return Math.max(...stats.channels.map((channel) => channel.stdev));
}

async function shoot(page, locator, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buffer = await locator.screenshot({ path: file, timeout: 15000 });
  return imageSpread(buffer);
}

async function launchHtml5(page, game, base, shot) {
  await page.goto(new URL(`curated/${game.id}/`, base).href, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Play now" }).click();
  const frame = page.frameLocator("iframe[data-curated-frame]");
  if (game.launch.readyText) {
    await frame.getByText(game.launch.readyText, { exact: false }).first().waitFor({ timeout: 20000 });
  } else {
    await frame.locator("canvas").first().waitFor({ timeout: 20000 });
  }
  await page.waitForTimeout(1500);
  const spread = await shoot(page, page.locator("iframe[data-curated-frame]"), shot);
  if (spread < 8) throw new Error(`frame looks blank (stdev ${spread.toFixed(1)})`);
  return `html5 ready, stdev ${spread.toFixed(1)}`;
}

async function launchRom(page, game, base, shot) {
  await page.goto(new URL(`curated/${game.id}/`, base).href, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Play now" }).click();
  await page.waitForURL(/\/play\/\?game=/, { timeout: 60000 });
  await page.waitForFunction(() => document.body.dataset.playing === "true", null, { timeout: 120000 });
  await page.waitForTimeout(8000);
  let spread = await shoot(page, page.locator("canvas").first(), shot);
  if (spread < 8) {
    await page.waitForTimeout(7000);
    spread = await shoot(page, page.locator("canvas").first(), shot);
  }
  if (spread < 8) throw new Error(`emulator frame looks blank (stdev ${spread.toFixed(1)})`);
  return `rom running, stdev ${spread.toFixed(1)}`;
}

async function launchAll(games, base, values) {
  const { chromium } = await import("playwright");
  const args = ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args });
  } catch (error) {
    console.warn(`bundled Chromium failed (${error.message}); trying system Chrome`);
    browser = await chromium.launch({ headless: true, channel: "chrome", args });
  }
  const report = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  try {
    const only = values.only ? new Set(values.only.split(",")) : null;
    for (const game of games) {
      if (game.type !== "instant") continue;
      if (only && !only.has(game.id)) continue;
      const shot = path.join(evidenceDir, `${game.id}.png`);
      const errors = [];
      page.removeAllListeners("pageerror");
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        const note = game.launch.kind === "html5"
          ? await launchHtml5(page, game, base, shot)
          : await launchRom(page, game, base, shot);
        game.status = "verified";
        report.push({ id: game.id, status: "verified", note, screenshot: path.relative(root, shot) });
        console.log(`verified ${game.id}: ${note}`);
      } catch (error) {
        game.status = "broken";
        try { await page.screenshot({ path: shot, fullPage: true }); } catch { /* keep the failure */ }
        report.push({ id: game.id, status: "broken", note: String(error.message || error), pageErrors: errors, screenshot: path.relative(root, shot) });
        console.error(`broken ${game.id}: ${error.message || error}`);
      }
    }
    if (values.flow === "1" || values.flow === "true") {
      const flowPage = await context.newPage();
      try {
        await runLocalFlow(flowPage, base);
        report.push({ id: "flow-nes-local-file", status: "verified", note: "The Super Mario Bros. page loaded lunarlimit.nes from disk. That file is Pubby's MIT homebrew, not a Mario ROM." });
      } catch (error) {
        report.push({ id: "flow-nes-local-file", status: "broken", note: String(error.message || error) });
        console.error(`broken local-file flow: ${error.message || error}`);
      }
    }
  } finally {
    await browser.close();
  }
  fs.mkdirSync(path.dirname(path.join(root, "data/launch-report.json")), { recursive: true });
  fs.writeFileSync(path.join(root, "data/launch-report.json"), JSON.stringify({ base, ranAt: new Date().toISOString(), results: report }, null, 2) + "\n");
  const registry = loadJson(registryPath);
  const byId = new Map(report.map((row) => [row.id, row.status]));
  for (const game of registry.games) if (byId.has(game.id)) game.status = byId.get(game.id);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return report.some((row) => row.status !== "verified") ? 1 : 0;
}

async function runLocalFlow(page, base) {
  await page.goto(new URL("curated/super-mario-bros/", base).href, { waitUntil: "domcontentloaded" });
  await page.locator("input[data-curated-file]").setInputFiles(path.join(root, "public/games/lunar-limit/lunarlimit.nes"));
  await page.waitForURL(/\/play\/\?game=/, { timeout: 60000 });
  await page.waitForFunction(() => document.body.dataset.playing === "true", null, { timeout: 120000 });
  await page.waitForTimeout(8000);
  const shot = path.join(evidenceDir, "flow-nes-local-file.png");
  const spread = await shoot(page, page.locator("canvas").first(), shot);
  if (spread < 8) throw new Error(`local-file frame looks blank (stdev ${spread.toFixed(1)})`);
  console.log(`local-file flow ok, stdev ${spread.toFixed(1)}`);
}

async function main() {
  const { flags, values } = parseArgs(process.argv.slice(2));
  const runCheck = flags.has("check") || flags.has("launch") || (!flags.has("self-test") && !flags.has("fetch") && !flags.has("launch"));
  let code = 0;
  if (flags.has("self-test")) code = selfTest() || code;
  if (!runCheck && !flags.has("fetch") && !flags.has("launch")) process.exit(code);

  const registry = loadJson(registryPath);
  const allow = loadJson(allowPath);
  const games = registry.games;
  const errors = [...validateGames(games, allow)];
  if (flags.has("fetch")) {
    for (const game of games) {
      if (!game.assets) continue;
      console.log(`fetch ${game.id}`);
      try { await fetchGame(game); } catch (error) { errors.push(`${game.id}: ${error.message}`); }
    }
  }
  if (runCheck || flags.has("fetch")) {
    ensureCovers(games);
    errors.push(...localErrors(games));
  }
  if (runCheck && !flags.has("skip-urls")) errors.push(...(await checkUrls(games)).map((item) => `url: ${item}`));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`registry ok (${games.length} games)`);
  if (flags.has("launch")) {
    const base = values.base || process.env.CURATED_BASE;
    if (!base) {
      console.error("pass --base=http://127.0.0.1:PORT");
      process.exit(1);
    }
    code = (await launchAll(games, base.endsWith("/") ? base : `${base}/`, values)) || code;
  }
  process.exit(code);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main().catch((error) => { console.error(error); process.exit(1); });
