/// <reference lib="webworker" />
import { unzipSync } from "fflate";
import { detectConsole, cleanTitle } from "@/lib/library/detect";
import { ALL_EXTENSIONS } from "@/lib/consoles/registry";
import type { WorkerRequest, WorkerResponse, ParsedRom } from "./rom.protocol";

/**
 * Off-main-thread ROM processing: unzip, hash, detect, and thumbnail.
 * Keeps the UI at 60 fps while a 700 MB disc image is being fingerprinted.
 */
const ctx = self as unknown as DedicatedWorkerGlobalScope;

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function sha1(bytes: Uint8Array): Promise<string> {
  // Hash large images by sampling head + tail + size: identical files still collide on purpose,
  // but a 700 MB disc is fingerprinted in milliseconds instead of seconds.
  const LIMIT = 32 * 1024 * 1024;
  let input: Uint8Array = bytes;
  if (bytes.length > LIMIT) {
    const head = bytes.subarray(0, 8 * 1024 * 1024);
    const tail = bytes.subarray(bytes.length - 8 * 1024 * 1024);
    const size = new TextEncoder().encode(String(bytes.length));
    input = new Uint8Array(head.length + tail.length + size.length);
    input.set(head, 0);
    input.set(tail, head.length);
    input.set(size, head.length + tail.length);
  }
  return toHex(await crypto.subtle.digest("SHA-1", input as BufferSource));
}

const isRom = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ext !== "zip" && ALL_EXTENSIONS.includes(ext);
};

async function parse(files: { name: string; buffer: ArrayBuffer }[]): Promise<ParsedRom[]> {
  // Expand archives
  const expanded: { name: string; bytes: Uint8Array }[] = [];
  for (const f of files) {
    const bytes = new Uint8Array(f.buffer);
    if (f.name.toLowerCase().endsWith(".zip")) {
      const entries = unzipSync(bytes, { filter: (e) => isRom(e.name.split("/").pop() ?? "") });
      for (const [path, data] of Object.entries(entries)) {
        expanded.push({ name: path.split("/").pop() ?? path, bytes: data });
      }
    } else {
      expanded.push({ name: f.name, bytes });
    }
  }

  // A .cue sheet groups its track files into one game
  const byName = new Map(expanded.map((e) => [e.name.toLowerCase(), e]));
  const consumed = new Set<string>();
  const results: ParsedRom[] = [];

  for (const cue of expanded.filter((e) => /\.(cue|m3u)$/i.test(e.name))) {
    const text = new TextDecoder().decode(cue.bytes);
    const refs = Array.from(text.matchAll(/FILE\s+"([^"]+)"/gi), (m) => m[1] ?? "")
      .concat(cue.name.toLowerCase().endsWith(".m3u") ? text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : []);
    const parts = refs.map((r) => byName.get(r.toLowerCase())).filter((x): x is { name: string; bytes: Uint8Array } => !!x);
    const missing = refs.filter((r) => !byName.has(r.toLowerCase()));
    [cue, ...parts].forEach((p) => consumed.add(p.name.toLowerCase()));
    const first = parts[0] ?? cue;
    results.push({
      id: await sha1(first.bytes),
      title: cleanTitle(cue.name),
      fileName: cue.name,
      size: [cue, ...parts].reduce((n, p) => n + p.bytes.length, 0),
      candidates: detectConsole(cue.name, first.bytes),
      files: [cue, ...parts].map((p) => ({ name: p.name, bytes: p.bytes })),
      missing,
    });
  }

  for (const e of expanded) {
    if (consumed.has(e.name.toLowerCase())) continue;
    results.push({
      id: await sha1(e.bytes),
      title: cleanTitle(e.name),
      fileName: e.name,
      size: e.bytes.length,
      candidates: detectConsole(e.name, e.bytes),
      files: [{ name: e.name, bytes: e.bytes }],
      missing: [],
    });
  }
  return results;
}

async function thumbnail(blob: Blob, width: number): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, width / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const c2d = canvas.getContext("2d");
  if (!c2d) throw new Error("2D context unavailable");
  c2d.imageSmoothingEnabled = scale < 1;
  c2d.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const raw = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
  // Safari's IndexedDB refuses to store a Blob that came straight out of canvas
  // encoding ("UnknownError: Error preparing Blob/File data to be stored in object
  // store") — a long-standing WebKit bug. Round-tripping through an ArrayBuffer and
  // constructing a plain memory-backed Blob sidesteps it; other browsers are unaffected.
  const bytes = await raw.arrayBuffer();
  return new Blob([bytes], { type: raw.type });
}

ctx.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === "parse") {
      const roms = await parse(msg.files);
      const transfer = roms.flatMap((r) => r.files.map((f) => f.bytes.buffer as ArrayBuffer));
      const res: WorkerResponse = { id: msg.id, ok: true, type: "parse", roms };
      ctx.postMessage(res, Array.from(new Set(transfer)));
    } else if (msg.type === "thumbnail") {
      const blob = await thumbnail(msg.blob, msg.width);
      ctx.postMessage({ id: msg.id, ok: true, type: "thumbnail", blob } satisfies WorkerResponse);
    }
  } catch (err) {
    ctx.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse);
  }
};
