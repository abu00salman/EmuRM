// Start the app first. MSX_TEST_URL can include /EmuRM/ for GitHub Pages builds.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { zipSync } = require('fflate');
const { chromium, webkit } = require('playwright');
const url = process.env.MSX_TEST_URL || 'http://127.0.0.1:3000/';
(async () => {
  const fixture = process.env.MSX_TEST_ROM ? fs.readFileSync(process.env.MSX_TEST_ROM) : new Uint8Array(await (await fetch('https://raw.githubusercontent.com/libretro/blueMSX-libretro/e3086eb5d36d77fa11704cf53dc176686e70127d/tools/tests/testcart.rom')).arrayBuffer());
  const type = process.env.MSX_TEST_BROWSER === 'webkit' ? webkit : chromium;
  const browser = await type.launch({ headless: true, ...(type === chromium ? { args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => (errors.push(error.message), console.error(error.stack)));
    await page.goto(new URL('console/msx/', url).href);
    await page.getByRole('button', { name: 'Add MSX games', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'msx-test.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'testcart.rom': fixture })) });
    const game = page.locator('a[href*="play/?game="]').first();
    await game.waitFor();
    await game.click();
    await page.waitForFunction(() => document.body.dataset.playing === 'true', null, { timeout: 30000 });
    // Let C-BIOS finish its boot logo and enter the diagnostic cartridge.
    await page.waitForTimeout(10000);
    const first = await page.locator('canvas').screenshot();
    await page.waitForTimeout(750);
    const second = await page.locator('canvas').screenshot();
    assert(!first.equals(second), 'Diagnostic cartridge must produce changing video frames');
    await page.keyboard.press('F2');
    await page.waitForFunction(async () => {
      const database = await new Promise((resolve, reject) => { const request = indexedDB.open('emurm'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      try { return await new Promise(resolve => { const request = database.transaction('states').objectStore('states').getAll(); request.onsuccess = () => resolve(request.result.some(row => row.slot === '1' && row.state.size > 100000)); }); }
      finally { database.close(); }
    }, null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('F4');
    await page.getByText('Loaded slot 1', { exact: true }).waitFor({ timeout: 15000 });
    await page.keyboard.press('ShiftRight'); // SELECT toggles blueMSX virtual keyboard.
    await page.waitForTimeout(500);
    const keyboard = await page.locator('canvas').screenshot();
    assert(!second.equals(keyboard));
    assert.deepEqual(errors, [], 'No WebAssembly or browser runtime errors');
    await page.close();

    // A multi-disk playlist imports as MSX and requests firmware before boot.
    const disks = await browser.newPage();
    await disks.goto(new URL('console/msx/', url).href);
    await disks.getByRole('button', { name: 'Add MSX games', exact: true }).click();
    const bytes = new TextEncoder().encode('#EXTM3U\nDisk1.dsk\nDisk2.dsk\nDisk3.dsk\n');
    await disks.locator('input[type=file]').setInputFiles({ name: 'disks.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'disks.m3u': bytes, 'Disk1.dsk': new Uint8Array(1024), 'Disk2.dsk': new Uint8Array(1025), 'Disk3.dsk': new Uint8Array(1026) })) });
    const diskGame = disks.locator('a[href*="play/?game="]').filter({ hasText: 'disks' });
    await diskGame.waitFor();
    await diskGame.click();
    await disks.getByText(/MSX\.ROM \+ DISK\.ROM/).waitFor({ timeout: 15000 });
    console.log('MSX browser smoke test passed: ZIP cartridge, changing video, save/load, keyboard and multi-disk BIOS requirement.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
