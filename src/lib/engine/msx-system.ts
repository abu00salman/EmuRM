import { unzipSync } from "fflate";
import type { LaunchSpec } from "./types";
import { MissingBiosError } from "./types";

export const MSX_SYSTEM_DIRECTORY = "/home/web_user/retroarch/userdata/system";
const SYSTEM_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/cores/bluemsx-system.zip`;
const MAX_SYSTEM_SIZE = 32 * 1024 * 1024;

// Accept ordinary blueMSX archives and archives wrapped in a system/ directory.
// Only install system files, never absolute paths or files outside this directory.
export function unpackMsxSystem(bytes: Uint8Array): Map<string, Uint8Array> {
  let size = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      size += entry.originalSize;
      if (size > MAX_SYSTEM_SIZE) throw new Error("MSX system archive is too large.");
      return !entry.name.endsWith("/");
    },
  });
  const result = new Map<string, Uint8Array>();
  for (const [raw, data] of Object.entries(files)) {
    const parts = raw.replaceAll("\\", "/").split("/");
    if (parts.some((p) => p === ".." || p === ".")) throw new Error("Invalid MSX system archive path.");
    const start = parts.findIndex((p) => p === "Machines" || p === "Databases");
    if (start < 0) continue;
    const name = parts.slice(start).join("/");
    if (name.length > 200 || !/\.(rom|ini|xml|txt)$/i.test(name)) continue;
    result.set(name, data);
  }
  if (!result.size) throw new Error("The MSX archive must contain Machines/ and Databases/.");
  return result;
}

function userMachine(msx2: boolean, disk: boolean): string {
  const main = msx2 ? "MSX2.ROM" : "MSX.ROM";
  return `[Video]\nversion=${msx2 ? "V9938" : "TMS99x8A"}\nvram size=${msx2 ? "128" : "16"}kB
[CMOS]\nEnable CMOS=${msx2 ? 1 : 0}\nBattery Backed=0
[Subslotted Slots]\nslot 0=0\nslot 1=0\nslot 2=0\nslot 3=1
[External Slots]\nslot A=1 0\nslot B=2 0
[FDC]\nCount=${disk ? 2 : 0}
[CPU]\nZ80 Frequency=3579545Hz
[Board]\ntype=${msx2 ? "MSX-S1985" : "MSX"}
[Slots]
0 0 0 0 84 "" ""
0 0 0 4 66 "Machines/EmuRM - User/${main}" ""
${msx2 ? '3 0 0 2 20 "Machines/EmuRM - User/MSX2EXT.ROM" ""' : ""}
${disk ? '3 1 2 4 65 "Machines/EmuRM - User/DISK.ROM" ""' : ""}
3 2 0 64 22 "" ""
`;
}

export async function prepareMsxSystem(spec: Pick<LaunchSpec, "bios" | "files" | "signal">) {
  const response = await fetch(SYSTEM_URL, { signal: spec.signal });
  if (!response.ok) throw new Error(`Unable to load MSX system files (${response.status}).`);
  const files = unpackMsxSystem(new Uint8Array(await response.arrayBuffer()));
  const uploaded = new Map(spec.bios.map((b) => [b.name.toUpperCase(), b.blob]));
  const archive = uploaded.get("BLUEMSX.ZIP");
  if (archive) {
    for (const [name, data] of unpackMsxSystem(new Uint8Array(await archive.arrayBuffer()))) files.set(name, data);
  }
  const disk = spec.files.some((f) => /\.(dsk|m3u)$/i.test(f.name));
  const tape = spec.files.some((f) => /\.cas$/i.test(f.name));
  const msx2 = uploaded.has("MSX2.ROM") && uploaded.has("MSX2EXT.ROM");
  const hasMain = msx2 || uploaded.has("MSX.ROM");
  let machine = "Auto";
  if (hasMain && (!disk || uploaded.has("DISK.ROM"))) {
    machine = "EmuRM - User";
    files.set(`Machines/${machine}/config.ini`, new TextEncoder().encode(userMachine(msx2, disk)));
    for (const name of ["MSX.ROM", "MSX2.ROM", "MSX2EXT.ROM", "DISK.ROM"]) {
      const blob = uploaded.get(name);
      if (blob) files.set(`Machines/${machine}/${name}`, new Uint8Array(await blob.arrayBuffer()));
    }
  } else if (disk || tape) {
    // C-BIOS only boots cartridges. Find a complete user-supplied machine,
    // instead of letting a disk or tape silently boot into the C-BIOS screen.
    const candidates = [...files.keys()].filter((name) => /^Machines\/MSX[^/]*\/config.ini$/.test(name) && !name.includes("C-BIOS"));
    const valid = candidates.find((name) => {
      const config = new TextDecoder().decode(files.get(name));
      const roms = [...config.matchAll(/"(Machines\/[^"\r\n]+\.(?:rom))"/gi)].map((m) => m[1]!);
      return roms.length > 0 && roms.every((rom) => files.has(rom)) && (!disk || /^\s*\d+ \d+ \d+ \d+ 65 /m.test(config));
    });
    if (!valid) throw new MissingBiosError(disk ? ["MSX.ROM + DISK.ROM (or a complete blueMSX.zip)"] : ["MSX.ROM (or a complete blueMSX.zip)"]);
    machine = valid.split("/")[1]!;
  }
  spec.signal?.throwIfAborted();
  return { files, machine };
}

export function installMsxSystem(fs: { mkdirTree(path: string): void; writeFile(path: string, data: Uint8Array): void }, files: Map<string, Uint8Array>) {
  for (const [name, data] of files) {
    const path = `${MSX_SYSTEM_DIRECTORY}/${name}`;
    fs.mkdirTree(path.slice(0, path.lastIndexOf("/")));
    fs.writeFile(path, data);
  }
}
