"use client";

import { useEffect } from "react";
import { create } from "zustand";

export const THEME_IDS = ["grease", "neon", "prestige", "vaporwave", "terminal", "midnight"] as const;

export type Theme = (typeof THEME_IDS)[number];

const STORAGE_KEY = "rags-to-races-theme";

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEME_IDS as readonly string[]).includes(value);
}

function readStored(): Theme {
  if (typeof window === "undefined") return "neon";
  const v = localStorage.getItem(STORAGE_KEY);
  return isTheme(v) ? v : "neon";
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
