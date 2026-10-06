"use client";

/**
 * Couch / TV navigation for everything outside the game itself:
 * D-pad or arrow keys move focus spatially between [data-nav] elements,
 * the bottom face button activates, the right face button goes back.
 */

type Dir = "up" | "down" | "left" | "right";

function candidates(): HTMLElement[] {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
  const scope = dialogs.at(-1) ?? document;
  return Array.from(scope.querySelectorAll<HTMLElement>(dialogs.length ? '[data-nav],button,a[href],input:not([type=hidden]):not([type=file]),select,[tabindex="0"]' : '[data-nav],input:not([type=hidden]):not([type=file]),select')).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.closest("[inert]") && getComputedStyle(el).visibility !== "hidden" && !(el as HTMLButtonElement).disabled;
  });
}

export function moveFocus(dir: Dir): boolean {
  const list = candidates();
  if (!list.length) return false;
  const current = document.activeElement as HTMLElement | null;
  if (!current || !list.includes(current)) {
    list[0]?.focus();
    return true;
  }
  const a = current.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === current) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const inDir =
      (dir === "right" && dx > 4) || (dir === "left" && dx < -4) || (dir === "down" && dy > 4) || (dir === "up" && dy < -4);
    if (!inDir) continue;
    const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
    const cross = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + cross * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    best.focus({ preventScroll: false });
    best.scrollIntoView({ block: "nearest", inline: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    return true;
  }
  return false;
}

export function startGamepadNav(onBack: () => void): () => void {
  let raf = 0;
  const prev = new Map<string, boolean>();
  let lastMove = 0;

  const edge = (key: string, pressed: boolean) => {
    const was = prev.get(key) ?? false;
    prev.set(key, pressed);
    return pressed && !was;
  };

  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    if (document.body.dataset.playing === "true" && !document.querySelector("[data-pause-menu-root]")) return; // the game owns the pad unless its menu is open
    const pads = navigator.getGamepads?.() ?? [];
    for (const gp of pads) {
      if (!gp) continue;
      const btn = (i: number) => !!gp.buttons[i]?.pressed;
      const ax = gp.axes[0] ?? 0;
      const ay = gp.axes[1] ?? 0;
      const dirs: [Dir, boolean][] = [
        ["up", btn(12) || ay < -0.6], ["down", btn(13) || ay > 0.6],
        ["left", btn(14) || ax < -0.6], ["right", btn(15) || ax > 0.6],
      ];
      for (const [d, on] of dirs) {
        const fresh = edge(`${gp.index}:${d}`, on);
        if (fresh || (on && t - lastMove > 220)) {
          if (on) {
            moveFocus(d);
            lastMove = t;
          }
        }
      }
      if (edge(`${gp.index}:a`, btn(0))) (document.activeElement as HTMLElement | null)?.click();
      if (edge(`${gp.index}:b`, btn(1))) onBack();
    }
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

export function arrowKeyNav(e: KeyboardEvent): boolean {
  if (document.body.dataset.playing === "true") return false;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return false;
  const map: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const dir = map[e.key];
  if (!dir) return false;
  if (!t?.closest("[data-nav]") && !document.querySelector("[data-nav]:focus")) {
    // Let pages scroll normally until the user starts navigating with keys.
    if (dir === "up" || dir === "down") return false;
  }
  const moved = moveFocus(dir);
  if (moved) e.preventDefault();
  return moved;
}

/** Android remote input uses the same focus geometry as keyboard/gamepad navigation. */
export function remoteKey(key: string): void {
  if (key === "Enter") {
    const list = candidates();
    const active = document.activeElement as HTMLElement | null;
    if (active && list.includes(active)) active.click();
    else list[0]?.focus();
    return;
  }
  const directions: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const dir = directions[key];
  if (!dir) return;
  const active = document.activeElement;
  if (active instanceof HTMLSelectElement && (dir === "up" || dir === "down")) {
    active.selectedIndex = Math.max(0, Math.min(active.options.length - 1, active.selectedIndex + (dir === "down" ? 1 : -1)));
    active.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  moveFocus(dir);
}
