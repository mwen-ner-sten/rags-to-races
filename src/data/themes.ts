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

// Hidden themes — kept for future use, not shown in settings
export const HIDDEN_THEMES: ThemeEntry[] = [
  { id: "rustbelt",  label: "Rust Belt",  color: "#b44a1a", bg: "#0c0806", border: "rgba(180,74,26,.4)" },
  { id: "arctic",    label: "Arctic",     color: "#48b8e8", bg: "#060a10", border: "rgba(72,184,232,.4)" },
  { id: "tactical",  label: "Tactical",   color: "#4a8a28", bg: "#0a0c08", border: "rgba(74,138,40,.4)" },
  { id: "sunset",    label: "Sunset",     color: "#e85020", bg: "#120808", border: "rgba(232,80,32,.4)"  },
  { id: "deepsix",   label: "Deep Six",   color: "#00b89c", bg: "#020810", border: "rgba(0,184,156,.4)"  },
  { id: "bloodmoon", label: "Bloodmoon",  color: "#c01020", bg: "#0a0404", border: "rgba(192,16,32,.4)"  },
  { id: "sakura",    label: "Sakura",     color: "#e87098", bg: "#100810", border: "rgba(232,112,152,.4)" },
  { id: "outlaw",    label: "Outlaw",     color: "#c88830", bg: "#0e0a06", border: "rgba(200,136,48,.4)"  },
  { id: "chrome",    label: "Chrome",     color: "#d0d8e0", bg: "#0a0a0c", border: "rgba(208,216,224,.4)" },
  { id: "sandstorm", label: "Sandstorm",  color: "#d89030", bg: "#100c06", border: "rgba(216,144,48,.4)"  },
];
