"use client";
import { create } from "zustand";

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  deferred: BeforeInstallPromptEvent | null;
  /** Already running as an installed app (standalone display-mode, or iOS home-screen launch). */
  installed: boolean;
  /** The platform fired `beforeinstallprompt`, so a native install prompt is ready to show. */
  canInstall: boolean;
  capture: (e: BeforeInstallPromptEvent) => void;
  markInstalled: () => void;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export const usePwa = create<PwaState>((set, get) => ({
  deferred: null,
  installed: false,
  canInstall: false,
  capture: (e) => set({ deferred: e, canInstall: true }),
  markInstalled: () => set({ installed: true, deferred: null, canInstall: false }),
  promptInstall: async () => {
    const e = get().deferred;
    if (!e) return "unavailable";
    await e.prompt();
    const choice = await e.userChoice;
    set({ deferred: null, canInstall: false });
    return choice.outcome;
  },
}));
