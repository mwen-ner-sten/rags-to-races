"use client";

import { create } from "zustand";

export type Theme = "grease" | "neon" | "prestige" | "rustbelt" | "arctic" | "vaporwave" | "tactical" | "sunset" | "deepsix" | "bloodmoon" | "sakura" | "outlaw" | "chrome" | "terminal" | "sandstorm" | "midnight";

const STORAGE_KEY = "rags-to-races-theme";

function readStored(): Theme {
  if (typeof window === "undefined") return "grease";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "grease" || v === "neon" || v === "prestige" || v === "rustbelt" || v === "arctic" || v === "vaporwave" || v === "tactical" || v === "sunset" || v === "deepsix" || v === "bloodmoon" || v === "sakura" || v === "outlaw" || v === "chrome" || v === "terminal" || v === "sandstorm" || v === "midnight") return v;
  return "grease";
}

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "grease", // SSR-safe default; hydrated below
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },
}));

// Hydrate from localStorage once on the client
if (typeof window !== "undefined") {
  useThemeStore.setState({ theme: readStored() });
}

/** Convenience hook matching the original [theme, setTheme] API */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme    = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  return [theme, setTheme];
}
