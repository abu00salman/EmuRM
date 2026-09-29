/** Buttons of the libretro "RetroPad" — the common controller every core understands. */
export type PadButton =
  | "up" | "down" | "left" | "right"
  | "a" | "b" | "x" | "y"
  | "l" | "r" | "l2" | "r2"
  | "start" | "select";

export type ConsoleId =
  | "a2600" | "msx" | "nes" | "snes" | "n64"
  | "sms" | "md" | "gg"
  | "gb" | "gbc" | "gba"
  | "psx" | "pce" | "tdo";

export type Family = "atari" | "nintendo" | "gameboy" | "sega" | "sony" | "msx" | "nec" | "3do";

/** Physical silhouette used for illustrations and generated covers. */
export type FormFactor = "home" | "handheld-v" | "handheld-h" | "disc" | "computer";

export interface CoreDef {
  /** libretro core name, e.g. "fceumm" → fceumm_libretro.{js,wasm} */
  id: string;
  /** Which engine adapter runs it. Only "libretro" today; the seam allows others. */
  engine: "libretro";
  license: string;
  upstream: string;
  /**
   * "cdn": a prebuilt web build exists and is fetched lazily from jsDelivr.
   * "self": no public web build — compile it and serve it via NEXT_PUBLIC_CORE_BASE.
   */
  hosting: "cdn" | "self";
  notes?: string;
}

export interface BiosFile {
  fileName: string;
  required: boolean;
  description: string;
}

/** A button as drawn on the touch controller and the remap screen. */
export interface ButtonLabel {
  pad: PadButton;
  label: string;
}

export interface ConsoleDef {
  id: ConsoleId;
  name: string;
  short: string;
  /** Regional / alternate names that people search for */
  aliases: string[];
  maker: string;
  year: number;
  family: Family;
  form: FormFactor;
  /** Accent used for lighting, focus rings and generated covers */
  accent: string;
  /** Filename under public/images/consoles/, when a real photo replaces the line-art glyph */
  photo?: string;
  extensions: string[];
  cores: readonly [CoreDef, ...CoreDef[]];
  /** Display aspect of the original hardware */
  aspect: number;
  faceButtons: ButtonLabel[];
  shoulderButtons: ButtonLabel[];
  hasSelect: boolean;
  bios: BiosFile[];
  status: "ready" | "experimental";
}
