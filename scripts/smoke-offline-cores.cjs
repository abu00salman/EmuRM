// Proves the handheld build plays games with NO network: every request leaving the local
// server is aborted, then a homebrew ROM per system is imported and must render frames.
// Usage: OFFLINE_TEST_URL=http://127.0.0.1:4100/ ROM_DIR=/tmp/roms node scripts/smoke-offline-cores.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const url = process.env.OFFLINE_TEST_URL || 'http://127.0.0.1:4100/';
const dir = process.env.ROM_DIR || '/tmp/roms';
const cases = [['nes', 'croom.nes'], ['snes', 'blt.sfc'], ['md', 'bottled.md'], ['gba', 'anguna.gba'], ['sms', 'astroforce.sms']];
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const origin = new URL(url).origin;
  let failed = 0;
  try {
    for (const [system, file] of cases) {
      const ctx = await browser.newContext({ viewport: { width: 640, height: 480 } });
      await ctx.addInitScript(() => localStorage.setItem('emurm:device', 'handheld'));
      const blocked = [];
      await ctx.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : (blocked.push(route.request().url()), route.abort())));
      const page = await ctx.newPage();
      const errors = [];
      // The core's own Wake Lock request is denied in headless Chromium; harmless.
      page.on('pageerror', (e) => { if (!/Wake Lock/i.test(e.message)) errors.push(e.message); });
      try {
        await page.goto(new URL(`console/${system}/`, url).href);
        await page.getByRole('button', { name: /^Add .* games$/ }).first().click();
        await page.locator('input[type=file]').first().setInputFiles({ name: file, mimeType: 'application/octet-stream', buffer: fs.readFileSync(path.join(dir, file)) });
        const game = page.locator('a[href*="play/?game="]').first();
        await game.waitFor({ timeout: 20000 });
        await game.click();
        await page.waitForFunction(() => document.body.dataset.playing === 'true', null, { timeout: 60000 });
        await page.waitForTimeout(6000);
        const a = await page.locator('canvas').screenshot();
        await page.keyboard.press('Enter'); // START: leaves a static title screen
        await page.waitForTimeout(2500);
        const b = await page.locator('canvas').screenshot();
        // Running = frames change, or at least a real (non-blank) picture is on screen.
        assert(!a.equals(b) || Math.max(a.length, b.length) > 4000, `no picture (png ${a.length}/${b.length} bytes)`);
        assert.deepEqual(errors, [], 'no page errors');
        console.log(`OK offline: ${system} (${file})${blocked.length ? `, blocked ${blocked.length} outside requests` : ''}`);
      } catch (e) {
        failed++;
        console.error(`FAIL ${system}: ${e.message}`, blocked.slice(0, 5));
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
  if (failed) process.exitCode = 1;
})();
