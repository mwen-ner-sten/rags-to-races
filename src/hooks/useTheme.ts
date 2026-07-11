"use client";

import { useEffect } from "react";
import { create } from "zustand";

export type Theme = "grease" | "neon" | "prestige" | "rustbelt" | "arctic" | "vaporwave" | "tactical" | "sunset" | "deepsix" | "bloodmoon" | "sakura" | "outlaw" | "chrome" | "terminal" | "sandstorm" | "midnight";

const STORAGE_KEY = "rags-to-races-theme";
export const DEFAULT_THEME: Theme = "neon";

function readStored(): Theme {
  return DEFAULT_THEME;
}

interface ThemeStore {
  theme: Theme;
  hydrated: boolean;
  setTheme: (t: Theme) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: DEFAULT_THEME, // SSR-safe default; hydrated below
  hydrated: false,
  setTheme: () => {
    localStorage.setItem(STORAGE_KEY, DEFAULT_THEME);
    set({ theme: DEFAULT_THEME });
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
