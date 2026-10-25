// Plays every EmuRM Classic past its menus and checks that the game reacts to input.
// Start the app first (e.g. `python3 -m http.server 4100 -d out`).
//
//   CLASSICS_TEST_URL=http://127.0.0.1:4100/ node scripts/smoke-classics.cjs [id ...]
//
// Optional, for machines that can't reach jsDelivr:
//   CLASSICS_CORE_DIR  directory of <core>.zip files (same zips as retroarch-emscripten-build)
//   CLASSICS_ZIPJS     path to @zip.js/zip.js index.min.js (Nostalgist imports it from jsDelivr)
//   CLASSICS_SHOTS     directory to write per-step screenshots into
//   CLASSICS_CHROMIUM  Chromium executable, if Playwright's own download isn't installed
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.env.CLASSICS_TEST_URL || 'http://127.0.0.1:3000/';
const coreDir = process.env.CLASSICS_CORE_DIR;
const zipjs = process.env.CLASSICS_ZIPJS;
const shots = process.env.CLASSICS_SHOTS;
const E = 'Enter';
// Key presses that get each game from boot into actual play. Keyboard defaults:
// arrows = d-pad, X = A, Z = B, S = X, A = Y, Enter = Start, Right Shift = Select.
// 'shot' marks the frame compared against the next 'shot' (gameplay must change it).
const doom = [E, 800, E, 800, E, 800, E, 4000, 'shot', 'ArrowUp:1500', 'KeyS:300', 'ArrowLeft:800', 'shot'];
const PLANS = {
  'freedoom1': doom,
  'freedoom2': doom,
  'super-tilt-bro': [3000, E, 1500, E, 1500, E, 1500, E, 1500, E, 1500, E, 1500, E, 2000, E, 3000, 'shot', 'ArrowRight:1000', 'KeyX:200', 'ArrowLeft:800', 'KeyZ:200', 'shot'],
  'nova-the-squirrel': [4000, E, 2500, 'KeyX', 2500, 'KeyX', 2500, 'ArrowDown', 600, 'KeyX', 5000, 'shot', 'ArrowRight:3000', 'shot'],
  'horizontal-shooter': [3000, E, 2000, E, 2000, 'shot', 'ArrowUp:400', 'KeyZ', 'ArrowDown:600', 'shot'],
  'lunar-limit': [3000, E, 2500, E, 2500, 'shot', 'KeyX', 'ArrowLeft:1000', 'KeyX', 'shot'],
  'blast-arena-advance': [9000, E, 2000, E, 2500, E, 2000, E, 2000, 'KeyX', 3000, 'shot', 'ArrowRight:1500', 'shot'],
  'gold-rush': [3000, E, 2000, E, 2000, 'KeyX', 1500, E, 2500, 'shot', 'KeyX', 2000, 'shot'],
  'gravity-beam': [4000, 'KeyZ', 2000, 'KeyZ', 2000, 'KeyX', 2500, E, 2000, 'KeyZ', 4000, 'shot', 'KeyX:1200', 'ArrowLeft:400', 'KeyX:800', 'shot'],
  'robotfindskitten': [3000, E, 2000, 'shot', 'ArrowRight:1200', 'ArrowUp:400', 'shot'],
  'croom': [3000, E, 2000, E, 2000, 'KeyX', 1500, E, 2500, 'shot', 'ArrowRight:1200', 'KeyX', 'ArrowUp:400', 'shot'],
  'falling': [3000, E, 2500, 'shot', 'ArrowLeft:800', 'shot'],
  'double-action-blaster-guys': [4000, E, 2500, 'KeyX', 2500, E, 4000, 'shot', 'ArrowRight:1200', 'KeyX', 'ArrowLeft:600', 'shot'],
  'yun': [4000, E, 5000, 'KeyX', 4000, 'shot', 'ArrowRight:1500', 'KeyX', 'ArrowRight:800', 'shot'],
  'lander-2': [4000, E, 2500, 'KeyX', 2500, E, 2500, 'KeyX', 2500, 'KeyZ', 2000, 'shot', 'ArrowDown:3000', 'shot'],
  'digger-chan': [6000, 'KeyZ:400', 2000, 'KeyX:400', 2000, E, 2000, 'ShiftRight:400', 2000, 'KeyZ:400', 3000, 'shot', 'ArrowLeft:300', 600, 'ArrowDown:300', 600, 'ArrowDown:300', 1000, 'shot'],
};
// Homebrew that a generic "start, confirm, move, press buttons" sequence gets into play.
for (const id of ['agb-hack', 'collision-course', 'pnakys', 'geometrix', 'f-ff', 'jet-paco', 'lala-the-magical', 'ralph-4', 'sgt-helmet', 'spacey-mcracey', 'wo-xiang-niao-niao', 'lander']) PLANS[id] = [4000, E, 2500, 'KeyX', 2500, E, 2500, 'KeyX', 2500, 'KeyZ', 2000, E, 2500, 'shot', 'ArrowRight:1200', 'KeyX', 'ArrowUp:500', 'ArrowLeft:900', 'KeyZ', 'ArrowDown:500', 'KeyX', 1000, 'shot'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLANS);
  const browser = await chromium.launch({ executablePath: process.env.CLASSICS_CHROMIUM || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const failed = [];
  for (const id of ids) {
    const plan = PLANS[id];
    assert(plan, `no plan for ${id}`);
    const context = await browser.newContext({ viewport: { width: 960, height: 640 }, serviceWorkers: 'block' });
    if (coreDir) {
      await context.route(/retroarch\/\w+_libretro\.zip$/, (route) => {
        const core = route.request().url().match(/retroarch\/(\w+)_libretro\.zip$/)[1];
        route.fulfill({ body: fs.readFileSync(path.join(coreDir, `${core}.zip`)), contentType: 'application/zip' });
      });
    }
    if (zipjs) await context.route(/@zip\.js\/zip\.js/, (route) => route.fulfill({ body: fs.readFileSync(zipjs), contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(new URL(`classics/${id}/`, url).href);
      await page.getByRole('button', { name: /Play now/ }).first().click();
      await page.waitForFunction(() => document.body.dataset.playing === 'true', null, { timeout: 90000 });
      await sleep(4000);
      const frames = [];
      for (const step of plan) {
        if (typeof step === 'number') { await sleep(step); continue; }
        if (step === 'shot') {
          const png = await page.locator('canvas').first().screenshot();
          if (shots) fs.writeFileSync(path.join(shots, `${id}-${frames.length}.png`), png);
          frames.push(png);
          continue;
        }
        const [key, hold] = step.split(':');
        await page.keyboard.down(key); await sleep(Number(hold || 150)); await page.keyboard.up(key); await sleep(250);
      }
      assert(frames.length >= 2 && !frames.at(-1).equals(frames.at(-2)), 'gameplay frame did not change after input');
      assert.deepEqual(errors, []);
      console.log(`ok   ${id}`);
    } catch (e) {
      failed.push(id);
      console.log(`FAIL ${id}: ${String(e.message).split('\n')[0]}`);
    }
    await context.close();
  }
  await browser.close();
  if (failed.length) { console.error(`failed: ${failed.join(', ')}`); process.exit(1); }
})();
