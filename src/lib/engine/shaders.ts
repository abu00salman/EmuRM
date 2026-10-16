/** Optional GPU shaders, served from /shaders (sourced from libretro/glsl-shaders; see its README). */
export const SHADER_IDS = ["crt-pi", "crt-lottes", "crt-easymode", "crt-geom", "lcd3x", "fxaa", "pixel-aa", "xbrz-freescale", "scalefx"] as const;
export type ShaderId = (typeof SHADER_IDS)[number];
export type ShaderChoice = "off" | "sharp" | ShaderId;

/** Premium HD upscalers — highlighted in the UI. */
export const HD_SHADERS: readonly ShaderId[] = ["xbrz-freescale", "scalefx"];
/** Heavier multi-pass shaders that may drop frames on older phones. */
export const HEAVY_SHADERS: readonly ShaderId[] = ["scalefx"];

/** Pass sources per multi-pass preset (single-pass presets default to `${id}.glsl`). */
const PASSES: Partial<Record<ShaderId, string[]>> = {
  "xbrz-freescale": ["xbrz-freescale-pass0.glsl", "xbrz-freescale-pass1.glsl"],
  scalefx: ["scalefx-pass0.glsl", "scalefx-pass1.glsl", "scalefx-pass2.glsl", "scalefx-pass3.glsl", "scalefx-pass4.glsl"],
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function isShaderId(v: unknown): v is ShaderId {
  return typeof v === "string" && (SHADER_IDS as readonly string[]).includes(v);
}

/** Preset + pass sources for RetroArch's own renderer. Throws if any file can't be fetched. */
export async function externalShaderFiles(id: ShaderId) {
  const get = async (file: string) => {
    const res = await fetch(`${BASE}/shaders/${file}`);
    if (!res.ok) throw new Error(`shader ${file}: ${res.status}`);
    return res.blob();
  };
  const sources = PASSES[id] ?? [`${id}.glsl`];
  const names = [`${id}.glslp`, ...sources];
  const blobs = await Promise.all(names.map(get));
  return names.map((fileName, i) => ({ fileName, fileContent: blobs[i] as Blob }));
}
