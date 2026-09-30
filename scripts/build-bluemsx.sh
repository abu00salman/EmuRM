#!/usr/bin/env bash
# Rebuild the bundled MSX core with Emscripten 4.0.15 (source emsdk_env.sh first).
set -euo pipefail
command -v emcc >/dev/null || { echo 'Activate Emscripten 4.0.15 first.' >&2; exit 1; }
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/emurm-bluemsx.XXXXXX")"
trap 'rm -rf "$build_dir"' EXIT
git clone https://github.com/libretro/blueMSX-libretro.git "$build_dir/core"
git -C "$build_dir/core" checkout e3086eb5d36d77fa11704cf53dc176686e70127d
git clone https://github.com/libretro/RetroArch.git "$build_dir/frontend"
git -C "$build_dir/frontend" checkout 2790aa0cce9308695c0f612cc56a803e978beb08

# The board's saveState callbacks take no arguments. Native C tolerates an
# extra argument, but WebAssembly traps on the different indirect-call type.
python3 - "$build_dir/core/Src/Board/Board.c" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
s = p.read_text()
assert s.count('boardInfo.saveState(stateFile);') == 1
p.write_text(s.replace('boardInfo.saveState(stateFile);', 'boardInfo.saveState();'))
PY

# Emscripten's OpenAL headers do not define these calling-convention macros.
python3 - "$build_dir/frontend/audio/drivers/openal.c" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
s = p.read_text()
marker = '#ifdef _WIN32\n'
assert marker in s
s = s.replace(marker, '#ifndef AL_APIENTRY\n#define AL_APIENTRY\n#endif\n#ifndef ALC_APIENTRY\n#define ALC_APIENTRY\n#endif\n\n' + marker, 1)
p.write_text(s)
PY
emmake make -C "$build_dir/core" -f Makefile.libretro platform=emscripten CC=emcc CXX=em++ AR=emar -j"${MSX_BUILD_JOBS:-4}"
cp "$build_dir/core/bluemsx_libretro_emscripten.bc" "$build_dir/frontend/libretro_emscripten.bc"
emmake make -C "$build_dir/frontend" -f Makefile.emscripten LIBRETRO=bluemsx ASYNC=1 HAVE_THREADS=0 HAVE_AL=1 HAVE_RWEBAUDIO=0 CC=emcc CXX=em++ LD=emcc -j"${MSX_BUILD_JOBS:-4}"
mkdir -p "$project_dir/public/cores"
cp "$build_dir/frontend/bluemsx_libretro.js" "$build_dir/frontend/bluemsx_libretro.wasm" "$project_dir/public/cores/"
chmod 644 "$project_dir/public/cores/bluemsx_libretro.wasm"

# Nostalgist 0.22 expects the legacy runtime helpers to be exposed.
# System files are installed by the application's beforeLaunch hook.
python3 - "$build_dir" "$project_dir/public/cores" <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import sys, json, hashlib
build, out = map(Path, sys.argv[1:])
p = out / 'bluemsx_libretro.js'
s = p.read_text()
marker = 'return moduleRtn}'
assert s.count(marker) == 1, 'Emscripten output changed; review the runtime adapter.'
s = s.replace(marker, 'return Promise.resolve(moduleRtn).then((instance)=>{Object.defineProperty(instance,"setCanvasSize",{value:(w,h)=>Browser.setCanvasSize(w,h),configurable:true});return {Module:instance,AL,Browser,MainLoop,JSEvents,exit:_emscripten_force_exit}})}')
p.write_text(s)
src = build / 'core/system/bluemsx'
with ZipFile(out / 'bluemsx-system.zip', 'w', compression=ZIP_DEFLATED) as z:
    for p in sorted(src.rglob('*')):
        if not p.is_file():
            continue
        name = p.relative_to(src).as_posix()
        # ROM binaries from proprietary machines are intentionally excluded.
        if name.startswith('Databases/') or (name.startswith('Machines/') and ('C-BIOS/' in name or p.name == 'config.ini')):
            info = ZipInfo(name, (2026, 9, 30, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            z.writestr(info, p.read_bytes())
for target, source in [
    ('C-BIOS-LICENSE.txt', src / 'Machines/MSX - C-BIOS/cbios.txt'),
    ('BLUEMSX-LICENSE.txt', build / 'core/license.txt'),
    ('RETROARCH-LICENSE.txt', build / 'frontend/COPYING'),
]:
    (out / target).write_text('\n'.join(line.rstrip() for line in source.read_text().splitlines()).rstrip() + '\n')
manifest = {
    'emscripten': '4.0.15',
    'bluemsxCommit': 'e3086eb5d36d77fa11704cf53dc176686e70127d',
    'retroarchCommit': '2790aa0cce9308695c0f612cc56a803e978beb08',
    'asyncify': True,
    'threads': False,
    'sha256': {name: hashlib.sha256((out / name).read_bytes()).hexdigest() for name in ['bluemsx_libretro.js', 'bluemsx_libretro.wasm', 'bluemsx-system.zip']},
}
(out / 'bluemsx-build.json').write_text(json.dumps(manifest, indent=2) + '\n')
PY
