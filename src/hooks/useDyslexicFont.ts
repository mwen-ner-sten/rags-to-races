"use client";

import { create } from "zustand";

const STORAGE_KEY = "rags-to-races-dyslexic-font";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

interface DyslexicFontStore {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

export const useDyslexicFontStore = create<DyslexicFontStore>((set) => ({
  enabled: false,
  setEnabled: (enabled) => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    set({ enabled });
  },
}));

if (typeof window !== "undefined") {
  useDyslexicFontStore.setState({ enabled: readStored() });
}

export function useDyslexicFont(): [boolean, (v: boolean) => void] {
  const enabled = useDyslexicFontStore((s) => s.enabled);
  const setEnabled = useDyslexicFontStore((s) => s.setEnabled);
  return [enabled, setEnabled];
}
