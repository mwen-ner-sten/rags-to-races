import type { Theme } from "@/hooks/useTheme";

export type ThemeId = Theme;

/**
 * Every colour the shell, panels, and primitives are allowed to use.
 * A theme is nothing but one of these token sets plus a font pairing and a
 * background decoration; there is a single GameShell that renders all of them.
 *
 * Semantic rules every theme must honour:
 *   --success is a green that is NOT the accent.
 *   --warning is an amber that is NOT the danger colour.
 *   --modal-bg is opaque (portaled surfaces must never let content bleed through).
 */
export interface ThemeTokens {
  "--bg": string;
  "--panel-bg": string;
  "--modal-bg": string;
  "--panel-border": string;
  "--panel-border-active": string;
  "--text-primary": string;
  "--text-secondary": string;
  "--text-muted": string;
  "--text-heading": string;
  "--text-white": string;
  "--accent": string;
  "--accent-secondary": string;
  "--accent-bg": string;
  "--accent-border": string;
  "--btn-primary-bg": string;
  "--btn-primary-text": string;
  "--btn-primary-hover": string;
  "--btn-border": string;
  "--btn-border-hover": string;
  "--success": string;
  "--warning": string;
  "--danger": string;
  "--info": string;
  "--input-bg": string;
  "--input-border": string;
  "--input-focus": string;
  "--divider": string;
}

export type ThemeTokenName = keyof ThemeTokens;

/** Background treatment rendered once by <ThemeDecoration>. */
export type ThemeDecoration =
  | "grid"      // perspective grid floor + scanlines (Midnight Circuit)
  | "stripes"   // faint diagonal workshop stripes
  | "paper"     // soft vignette on a matte surface
  | "vapor"     // flat grid + horizon glow
  | "crt"       // scanlines + tube vignette + falling rain
  | "asphalt";  // fine horizontal grain + headlight glow

export interface ThemeFonts {
  /** Display face for the brand, headings, and tab labels. */
  display: string;
  /** Body face for everything else. */
  body: string;
}

export interface ThemeEntry {
  id: ThemeId;
  label: string;
  /** Swatch colour used by theme pickers. */
  color: string;
  /** Swatch background used by theme pickers. */
  bg: string;
  border: string;
  /** Short tagline shown next to the brand on wide screens. */
  tagline: string;
  fonts: ThemeFonts;
  decoration: ThemeDecoration;
}

export const THEMES: ThemeEntry[] = [
  {
    id: "grease",
    label: "Grease",
    color: "#c83e0c",
    bg: "#1a0c04",
    border: "rgba(200,62,12,.4)",
    tagline: "BUILT FROM GARBAGE",
    fonts: { display: "var(--font-bebas), 'Bebas Neue', Impact, sans-serif", body: "var(--font-share-tech), 'Share Tech Mono', monospace" },
    decoration: "stripes",
  },
  {
    id: "neon",
    label: "Circuit",
    color: "#00e5ff",
    bg: "#000",
    border: "rgba(0,229,255,.4)",
    tagline: "MIDNIGHT CIRCUIT",
    fonts: { display: "var(--font-orbitron), 'Orbitron', sans-serif", body: "var(--font-rajdhani), 'Rajdhani', sans-serif" },
    decoration: "grid",
  },
  {
    id: "prestige",
    label: "Prestige",
    color: "#b8975a",
    bg: "#080810",
    border: "rgba(184,151,90,.4)",
    tagline: "THE COLLECTOR'S EDITION",
    fonts: { display: "var(--font-playfair), 'Playfair Display', Georgia, serif", body: "var(--font-lato), 'Lato', sans-serif" },
    decoration: "paper",
  },
  {
    id: "vaporwave",
    label: "Vapor",
    color: "#ff71ce",
    bg: "#1a0030",
    border: "rgba(255,113,206,.4)",
    tagline: "A E S T H E T I C",
    fonts: { display: "var(--font-press-start), 'Press Start 2P', monospace", body: "var(--font-space-mono), 'Space Mono', monospace" },
    decoration: "vapor",
  },
  {
    id: "terminal",
    label: "Terminal",
    color: "#40d840",
    bg: "#000800",
    border: "rgba(64,216,64,.4)",
    tagline: "> RUN RACE.EXE",
    fonts: { display: "var(--font-vt323), 'VT323', monospace", body: "var(--font-fira-code), 'Fira Code', monospace" },
    decoration: "crt",
  },
  {
    id: "midnight",
    label: "Midnight",
    color: "#3b82f6",
    bg: "#080c18",
    border: "rgba(59,130,246,.4)",
    tagline: "LIGHTS OUT. SEND IT.",
    fonts: { display: "var(--font-chakra), 'Chakra Petch', sans-serif", body: "var(--font-plex-mono), 'IBM Plex Mono', monospace" },
    decoration: "asphalt",
  },
];

export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  grease: {
    "--bg": "#0f0a04",
    "--panel-bg": "#181008",
    "--modal-bg": "#1a0c04",
    "--panel-border": "#3a2510",
    "--panel-border-active": "#c83e0c",
    "--text-primary": "#d4b896",
    "--text-secondary": "#9a8570",
    "--text-muted": "#7a6040",
    "--text-heading": "#c4872a",
    "--text-white": "#e8d8c4",
    "--accent": "#c83e0c",
    "--accent-secondary": "#c4872a",
    "--accent-bg": "rgba(200,62,12,.1)",
    "--accent-border": "rgba(200,62,12,.4)",
    "--btn-primary-bg": "#c83e0c",
    "--btn-primary-text": "#fff",
    "--btn-primary-hover": "#d4501e",
    "--btn-border": "#6a5030",
    "--btn-border-hover": "#8a7560",
    "--success": "#6aaa3a",
    "--warning": "#e0a030",
    "--danger": "#e05c1a",
    "--info": "#8fb8c8",
    "--input-bg": "#1a0c04",
    "--input-border": "#4a3518",
    "--input-focus": "#c83e0c",
    "--divider": "#3a2810",
  },
  neon: {
    "--bg": "#000",
    "--panel-bg": "rgba(0,20,30,.6)",
    "--modal-bg": "#041820",
    "--panel-border": "rgba(0,229,255,.2)",
    "--panel-border-active": "#00e5ff",
    "--text-primary": "#d5edf2",
    "--text-secondary": "#79e7f1",
    "--text-muted": "#78adb6",
    "--text-heading": "#00e5ff",
    "--text-white": "#e0f0f4",
    "--accent": "#00e5ff",
    "--accent-secondary": "#ff0090",
    "--accent-bg": "rgba(0,229,255,.1)",
    "--accent-border": "rgba(0,229,255,.4)",
    "--btn-primary-bg": "#00e5ff",
    "--btn-primary-text": "#000",
    "--btn-primary-hover": "#33ecff",
    "--btn-border": "rgba(0,229,255,.35)",
    "--btn-border-hover": "rgba(0,229,255,.6)",
    "--success": "#3ddc84",
    "--warning": "#ffb020",
    "--danger": "#ff0090",
    "--info": "#66dce8",
    "--input-bg": "rgba(0,20,30,.8)",
    "--input-border": "rgba(0,229,255,.25)",
    "--input-focus": "#00e5ff",
    "--divider": "rgba(0,229,255,.15)",
  },
  prestige: {
    "--bg": "#080810",
    "--panel-bg": "rgba(12,12,24,.8)",
    "--modal-bg": "rgb(12, 12, 24)",
    "--panel-border": "rgba(184,151,90,.2)",
    "--panel-border-active": "#b8975a",
    "--text-primary": "#c8c0d0",
    "--text-secondary": "rgba(184,151,90,.65)",
    "--text-muted": "rgba(184,151,90,.4)",
    "--text-heading": "#b8975a",
    "--text-white": "#e0d8e8",
    "--accent": "#b8975a",
    "--accent-secondary": "rgba(200,192,208,.75)",
    "--accent-bg": "rgba(184,151,90,.1)",
    "--accent-border": "rgba(184,151,90,.4)",
    "--btn-primary-bg": "#b8975a",
    "--btn-primary-text": "#080810",
    "--btn-primary-hover": "#c9a86b",
    "--btn-border": "rgba(184,151,90,.3)",
    "--btn-border-hover": "rgba(184,151,90,.55)",
    "--success": "#7fb37a",
    "--warning": "#d4a03c",
    "--danger": "#b5544a",
    "--info": "rgba(184,151,90,.65)",
    "--input-bg": "rgba(12,12,24,.9)",
    "--input-border": "rgba(184,151,90,.2)",
    "--input-focus": "#b8975a",
    "--divider": "rgba(184,151,90,.15)",
  },
  vaporwave: {
    "--bg": "#1a0030",
    "--panel-bg": "rgba(26,0,48,.7)",
    "--modal-bg": "rgb(26, 0, 48)",
    "--panel-border": "rgba(185,103,255,.2)",
    "--panel-border-active": "#ff71ce",
    "--text-primary": "#e0b0f0",
    "--text-secondary": "rgba(185,103,255,.6)",
    "--text-muted": "rgba(185,103,255,.4)",
    "--text-heading": "#ff71ce",
    "--text-white": "#f0d0ff",
    "--accent": "#ff71ce",
    "--accent-secondary": "#01cdfe",
    "--accent-bg": "rgba(255,113,206,.1)",
    "--accent-border": "rgba(255,113,206,.4)",
    "--btn-primary-bg": "#ff71ce",
    "--btn-primary-text": "#1a0030",
    "--btn-primary-hover": "#ff8dd8",
    "--btn-border": "rgba(185,103,255,.35)",
    "--btn-border-hover": "rgba(185,103,255,.6)",
    "--success": "#5cf5a0",
    "--warning": "#ffb347",
    "--danger": "#ff4d6d",
    "--info": "#b967ff",
    "--input-bg": "rgba(26,0,48,.9)",
    "--input-border": "rgba(185,103,255,.25)",
    "--input-focus": "#ff71ce",
    "--divider": "rgba(185,103,255,.15)",
  },
  terminal: {
    "--bg": "#000800",
    "--panel-bg": "rgba(0,8,0,.8)",
    "--modal-bg": "rgb(0, 4, 0)",
    "--panel-border": "#287028",
    "--panel-border-active": "#40d840",
    "--text-primary": "#30b830",
    "--text-secondary": "#30a030",
    "--text-muted": "#308830",
    "--text-heading": "#40d840",
    "--text-white": "#80e880",
    "--accent": "#40d840",
    "--accent-secondary": "#30a030",
    "--accent-bg": "rgba(64,216,64,.1)",
    "--accent-border": "rgba(64,216,64,.4)",
    "--btn-primary-bg": "#40d840",
    "--btn-primary-text": "#000800",
    "--btn-primary-hover": "#50e850",
    "--btn-border": "#308030",
    "--btn-border-hover": "#30b830",
    "--success": "#8cf58c",
    "--warning": "#d9a520",
    "--danger": "#d84040",
    "--info": "#38b838",
    "--input-bg": "rgba(0,4,0,.8)",
    "--input-border": "#287028",
    "--input-focus": "#40d840",
    "--divider": "#207020",
  },
  midnight: {
    "--bg": "#080c18",
    "--panel-bg": "rgba(8,14,30,.75)",
    "--modal-bg": "rgb(8, 12, 24)",
    "--panel-border": "rgba(59,130,246,.18)",
    "--panel-border-active": "#3b82f6",
    "--text-primary": "#b0c4dc",
    "--text-secondary": "rgba(59,130,246,.6)",
    "--text-muted": "rgba(59,130,246,.42)",
    "--text-heading": "#3b82f6",
    "--text-white": "#d8e4f0",
    "--accent": "#3b82f6",
    "--accent-secondary": "#f59e0b",
    "--accent-bg": "rgba(59,130,246,.1)",
    "--accent-border": "rgba(59,130,246,.4)",
    "--btn-primary-bg": "#3b82f6",
    "--btn-primary-text": "#080c18",
    "--btn-primary-hover": "#5b9af6",
    "--btn-border": "rgba(59,130,246,.28)",
    "--btn-border-hover": "rgba(59,130,246,.5)",
    "--success": "#34d399",
    "--warning": "#f59e0b",
    "--danger": "#ef4444",
    "--info": "rgba(59,130,246,.75)",
    "--input-bg": "rgba(8,12,24,.9)",
    "--input-border": "rgba(59,130,246,.2)",
    "--input-focus": "#3b82f6",
    "--divider": "rgba(59,130,246,.15)",
  },
};

export function getThemeEntry(id: ThemeId): ThemeEntry {
  return THEMES.find((t) => t.id === id) ?? THEMES[1];
}

/**
 * Token set plus the font variables the shell exposes to panels. Everything
 * that renders inside the shell (or a portal that mirrors it) spreads this.
 */
export function themeStyleVars(id: ThemeId): Record<string, string> {
  const entry = getThemeEntry(id);
  return {
    ...THEME_TOKENS[id],
    "--font-display": entry.fonts.display,
    "--font-body": entry.fonts.body,
  };
}
