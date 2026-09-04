import type { Theme } from "@/hooks/useTheme";

export interface ThemeEntry {
  id: Theme;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const THEMES: ThemeEntry[] = [
  { id: "grease",    label: "Grease",     color: "#c83e0c", bg: "#1a0c04", border: "rgba(200,62,12,.4)"  },
  { id: "neon",      label: "Circuit",    color: "#00e5ff", bg: "#000",    border: "rgba(0,229,255,.4)"  },
  { id: "prestige",  label: "Prestige",   color: "#b8975a", bg: "#080810", border: "rgba(184,151,90,.4)" },
  { id: "vaporwave", label: "Vapor",      color: "#ff71ce", bg: "#1a0030", border: "rgba(255,113,206,.4)" },
  { id: "terminal",  label: "Terminal",   color: "#40d840", bg: "#000800", border: "rgba(64,216,64,.4)"   },
  { id: "midnight",  label: "Midnight",  color: "#3b82f6", bg: "#080c18", border: "rgba(59,130,246,.4)"  },
];
