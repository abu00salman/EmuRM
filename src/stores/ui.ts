"use client";
import { create } from "zustand";
import type { ConsoleId } from "@/lib/consoles/types";

export interface Toast {
  id: number;
  message: string;
  tone?: "neutral" | "error";
  action?: { label: string; run: () => void };
}

interface PickRequest {
  title: string;
  candidates: ConsoleId[];
  resolve: (id: ConsoleId | null) => void;
}

interface UIState {
  importOpen: boolean;
  importTab: "device" | "link" | "demo";
  /** Preselected console when importing from a console page */
  importConsole?: ConsoleId;
  openImport: (tab?: UIState["importTab"], consoleId?: ConsoleId) => void;
  closeImport: () => void;

  pick: PickRequest | null;
  askConsole: (title: string, candidates: ConsoleId[]) => Promise<ConsoleId | null>;
  answerPick: (id: ConsoleId | null) => void;

  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;

export const useUI = create<UIState>((set, get) => ({
  importOpen: false,
  importTab: "device",
  openImport: (tab = "device", consoleId) => set({ importOpen: true, importTab: tab, importConsole: consoleId }),
  closeImport: () => set({ importOpen: false, importConsole: undefined }),

  pick: null,
  askConsole: (title, candidates) =>
    new Promise((resolve) => {
      set({ pick: { title, candidates, resolve } });
    }),
  answerPick: (id) => {
    get().pick?.resolve(id);
    set({ pick: null });
  },

  toasts: [],
  toast: (t) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), t.action ? 7000 : 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
