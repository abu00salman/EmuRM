const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the engine's public session API with a synchronous RetroArch save flush.
// A cartridge without battery memory must not wait for a nonexistent .srm file.
const files = new Map();
let flushes = 0;
const fake = {
  getEmulator: () => ({
    callCommand(command) { assert.equal(command, '_cmd_savefiles'); flushes++; },
    getOptions: () => ({ rom: [{ baseName: 'test-cart' }], sramType: 'srm' }),
  }),
  getEmscriptenFS: () => ({
    readdir: () => ['.', '..', 'blueMSX', 'UnrelatedCore'],
    readFile(file) { if (!files.has(file)) throw new Error('ENOENT'); return files.get(file); },
  }),
  saveSRAM() { throw new Error('Do not use the polling API for optional battery RAM'); },
};
const engineExports = {};
const source = ts.transpileModule(fs.readFileSync('src/lib/engine/libretro-engine.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, {
  exports: engineExports, process, Blob, Uint8Array,
  require(name) {
    if (name === 'nostalgist') return { Nostalgist: { launch: async () => fake } };
    if (name === './types') return { CoreUnavailableError: Error };
    if (name === './msx-system') return {};
    if (name === './sharp-shader') return { sharpShaderFiles: () => [] };
    if (name === './shaders') return { externalShaderFiles: async () => [], isShaderId: () => false };
    throw new Error(`Unexpected import ${name}`);
  },
});
(async () => {
  const session = await engineExports.libretroEngine.launch({
    core: { id: 'test', bundled: true }, files: [{ name: 'test-cart.rom', blob: new Blob() }],
    bios: [], console: { aspect: 4 / 3 }, input: { keyboard: {}, gamepad: {} },
    aspect: 'native', volume: 0.8, stageAspect: 4 / 3, smoothing: false,
  });
  assert.equal(await session.saveSram(), null, 'No battery memory is a successful empty result');
  const location = '/home/web_user/retroarch/userdata/saves/blueMSX/test-cart.srm';
  files.set('/home/web_user/retroarch/userdata/saves/UnrelatedCore/another-game.srm', new Uint8Array([9]));
  assert.equal(await session.saveSram(), null, 'Ignore other game filenames');
  files.set(location, new Uint8Array([1, 2, 3, 4]));
  assert.deepEqual([...new Uint8Array(await (await session.saveSram()).arrayBuffer())], [1, 2, 3, 4]);
  files.set(location, new Uint8Array([5, 6]));
  assert.deepEqual([...new Uint8Array(await (await session.saveSram()).arrayBuffer())], [5, 6]);
  files.set(location, new Uint8Array());
  assert.equal(await session.saveSram(), null, 'Empty battery memory is not persisted');
  assert.equal(flushes, 5);
  console.log('SRAM tests passed: no-memory carts, unrelated files, battery bytes and repeated saves.');
})().catch(error => { console.error(error); process.exitCode = 1; });
