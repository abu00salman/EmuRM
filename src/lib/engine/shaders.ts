/** Optional GPU shaders, served from /shaders (sourced from libretro/glsl-shaders; see its README). */
export const SHADER_IDS = ["crt-pi", "crt-lottes", "crt-easymode", "crt-geom", "lcd3x", "fxaa", "pixel-aa"] as const;
export type ShaderId = (typeof SHADER_IDS)[number];
export type ShaderChoice = "off" | "sharp" | ShaderId;

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function isShaderId(v: unknown): v is ShaderId {
  return typeof v === "string" && (SHADER_IDS as readonly string[]).includes(v);
}

/** Preset + source for RetroArch's own renderer. Throws if the files can't be fetched. */
export async function externalShaderFiles(id: ShaderId) {
  const get = async (file: string) => {
    const res = await fetch(`${BASE}/shaders/${file}`);
    if (!res.ok) throw new Error(`shader ${file}: ${res.status}`);
    return res.blob();
  };
  const [preset, source] = await Promise.all([get(`${id}.glslp`), get(`${id}.glsl`)]);
  return [
    { fileName: `${id}.glslp`, fileContent: preset },
    { fileName: `${id}.glsl`, fileContent: source },
  ];
}
