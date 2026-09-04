import { describe, expect, it } from "vitest";
import { THEMES, THEME_TOKENS, getThemeEntry, themeStyleVars, type ThemeTokens } from "@/data/themes";
import { THEME_IDS } from "@/hooks/useTheme";

const REQUIRED_TOKENS: (keyof ThemeTokens)[] = [
  "--bg", "--panel-bg", "--modal-bg", "--panel-border", "--panel-border-active",
  "--text-primary", "--text-secondary", "--text-muted", "--text-heading", "--text-white",
  "--accent", "--accent-secondary", "--accent-bg", "--accent-border",
  "--btn-primary-bg", "--btn-primary-text", "--btn-primary-hover", "--btn-border", "--btn-border-hover",
  "--success", "--warning", "--danger", "--info",
  "--input-bg", "--input-border", "--input-focus", "--divider",
];

describe("theme registry", () => {
  it("has one entry and one token set per theme id", () => {
    expect(THEMES.map((t) => t.id).sort()).toEqual([...THEME_IDS].sort());
    expect(Object.keys(THEME_TOKENS).sort()).toEqual([...THEME_IDS].sort());
  });

  it("defines every token non-empty for every theme", () => {
    for (const id of THEME_IDS) {
      for (const token of REQUIRED_TOKENS) {
        expect(THEME_TOKENS[id][token], `${id} ${token}`).toMatch(/\S/);
      }
    }
  });

  it("keeps --success distinct from the accent and --warning distinct from danger", () => {
    for (const id of THEME_IDS) {
      const tokens = THEME_TOKENS[id];
      expect(tokens["--success"], `${id} success = accent`).not.toBe(tokens["--accent"]);
      expect(tokens["--warning"], `${id} warning = danger`).not.toBe(tokens["--danger"]);
      expect(tokens["--warning"], `${id} warning = accent`).not.toBe(tokens["--accent"]);
    }
  });

  it("uses an opaque modal surface so portaled UI never bleeds", () => {
    for (const id of THEME_IDS) {
      expect(THEME_TOKENS[id]["--modal-bg"], `${id} modal`).not.toMatch(/^rgba\(/);
    }
  });

  it("gives every theme a font pairing and a decoration", () => {
    for (const entry of THEMES) {
      expect(entry.fonts.display).toContain("var(--font-");
      expect(entry.fonts.body).toContain("var(--font-");
      expect(entry.decoration).toBeTruthy();
      expect(entry.tagline).toMatch(/\S/);
    }
  });

  it("exposes font variables alongside tokens for the shell and portals", () => {
    const vars = themeStyleVars("neon");
    expect(vars["--accent"]).toBe("#00e5ff");
    expect(vars["--font-display"]).toContain("--font-orbitron");
    expect(vars["--font-body"]).toContain("--font-rajdhani");
    expect(getThemeEntry("neon").decoration).toBe("grid");
  });
});
