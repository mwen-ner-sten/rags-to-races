"use client";

import { useEffect } from "react";
import { create } from "zustand";

export type Theme = "grease" | "neon" | "prestige" | "rustbelt" | "arctic" | "vaporwave" | "tactical" | "sunset" | "deepsix" | "bloodmoon" | "sakura" | "outlaw" | "chrome" | "terminal" | "sandstorm" | "midnight";

const STORAGE_KEY = "rags-to-races-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "neon";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "grease" || v === "neon" || v === "prestige" || v === "rustbelt" || v === "arctic" || v === "vaporwave" || v === "tactical" || v === "sunset" || v === "deepsix" || v === "bloodmoon" || v === "sakura" || v === "outlaw" || v === "chrome" || v === "terminal" || v === "sandstorm" || v === "midnight") return v;
  return "neon";
}

interface ThemeStore {
  theme: Theme;
  hydrated: boolean;
  setTheme: (t: Theme) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "neon", // SSR-safe default; hydrated below
  hydrated: false,
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
  hydrate: () => {
    if (get().hydrated) return;
    set({ theme: readStored(), hydrated: true });
  },
}));

/** Convenience hook matching the original [theme, setTheme] API */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme    = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const hydrate = useThemeStore((s) => s.hydrate);
  useEffect(() => hydrate(), [hydrate]);
  return [theme, setTheme];
}
