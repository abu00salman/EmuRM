import type { PadButton } from "@/lib/consoles/types";
import type { InputBindings } from "@/lib/engine/types";
import type { TFn } from "@/lib/i18n";

/** KeyboardEvent.code → RetroArch key name. Only keys RetroArch's web driver understands. */
const CODE_TO_RA: Record<string, string> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  Enter: "enter", NumpadEnter: "kp_enter", Space: "space", Backspace: "backspace", Tab: "tab",
  ShiftLeft: "shift", ShiftRight: "rshift", ControlLeft: "ctrl", ControlRight: "rctrl",
  AltLeft: "alt", AltRight: "ralt", Comma: "comma", Period: "period", Slash: "slash",
  Semicolon: "semicolon", Quote: "quote", BracketLeft: "leftbracket", BracketRight: "rightbracket",
  Minus: "minus", Equal: "equals", Backquote: "backquote",
  Numpad0: "keypad0", Numpad1: "keypad1", Numpad2: "keypad2", Numpad3: "keypad3", Numpad4: "keypad4",
  Numpad5: "keypad5", Numpad6: "keypad6", Numpad7: "keypad7", Numpad8: "keypad8", Numpad9: "keypad9",
};
for (let i = 0; i < 26; i++) {
  const ch = String.fromCharCode(97 + i);
  CODE_TO_RA[`Key${ch.toUpperCase()}`] = ch;
}
for (let i = 0; i < 10; i++) CODE_TO_RA[`Digit${i}`] = String(i);

const RA_TO_LABEL_KEY: Record<string, Parameters<TFn>[0]> = {
  enter: "key.enter", kp_enter: "key.numEnter", space: "key.space",
  rshift: "key.rightShift", shift: "key.shift", ctrl: "key.ctrl", rctrl: "key.rightCtrl",
  alt: "key.alt", ralt: "key.rightAlt", backspace: "key.backspace", tab: "key.tab",
};
const RA_TO_SYMBOL: Record<string, string> = { up: "↑", down: "↓", left: "←", right: "→" };

export function codeToRetroArch(code: string): string | null {
  return CODE_TO_RA[code] ?? null;
}

export function keyLabel(t: TFn, ra: string | undefined): string {
  if (!ra || ra === "nul") return t("remap.none");
  if (RA_TO_SYMBOL[ra]) return RA_TO_SYMBOL[ra];
  const key = RA_TO_LABEL_KEY[ra];
  if (key) return t(key);
  return ra.length === 1 ? ra.toUpperCase() : ra;
}

/** Keys the player UI keeps for itself; they are never bound to the game. */
export const RESERVED_CODES = new Set(["Escape", "F1", "F2", "F4", "F6", "F9", "F11"]);

const GAMEPAD_LABEL_KEYS: Record<number, Parameters<TFn>[0]> = {
  0: "gp.bottomFace", 1: "gp.rightFace", 2: "gp.leftFace", 3: "gp.topFace",
  4: "gp.lb", 5: "gp.rb", 6: "gp.lt", 7: "gp.rt",
  8: "gp.backSelect", 9: "gp.start", 10: "gp.leftStick", 11: "gp.rightStick",
  12: "gp.dpadUp", 13: "gp.dpadDown", 14: "gp.dpadLeft", 15: "gp.dpadRight", 16: "gp.home",
};

export function gamepadLabel(t: TFn, index: number): string {
  const key = GAMEPAD_LABEL_KEYS[index];
  return key ? t(key) : t("remap.button", { n: index });
}

export const DEFAULT_BINDINGS: InputBindings = {
  keyboard: {
    up: "up", down: "down", left: "left", right: "right",
    a: "x", b: "z", x: "s", y: "a",
    l: "q", r: "w", l2: "e", r2: "r",
    start: "enter", select: "rshift",
  },
  // RetroPad uses SNES naming: A is the right face button, B the bottom one.
  gamepad: {
    b: 0, a: 1, y: 2, x: 3, l: 4, r: 5, l2: 6, r2: 7,
    select: 8, start: 9, up: 12, down: 13, left: 14, right: 15,
  },
};

export const PAD_ORDER: PadButton[] = ["up", "down", "left", "right", "a", "b", "x", "y", "l", "r", "l2", "r2", "start", "select"];

export function mergeBindings(saved: Partial<InputBindings> | undefined): InputBindings {
  return {
    keyboard: { ...DEFAULT_BINDINGS.keyboard, ...(saved?.keyboard ?? {}) },
    gamepad: { ...DEFAULT_BINDINGS.gamepad, ...(saved?.gamepad ?? {}) },
  };
}
