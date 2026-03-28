"use client";

import { useTheme, type Theme } from "@/hooks/useTheme";

const THEMES: { id: Theme; label: string; color: string; bg: string; border: string }[] = [
  { id: "grease",  label: "Grease",  color: "#c83e0c", bg: "#1a0c04", border: "rgba(200,62,12,.4)"  },
  { id: "neon",    label: "Circuit", color: "#00e5ff", bg: "#000",    border: "rgba(0,229,255,.4)"  },
  { id: "prestige",label: "Prestige",color: "#b8975a", bg: "#080810", border: "rgba(184,151,90,.4)" },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".3rem",
              padding: ".25rem .55rem",
              background: isActive ? t.bg : "transparent",
              border: `1px solid ${isActive ? t.border : "rgba(255,255,255,.07)"}`,
              borderRadius: 4,
              cursor: "pointer",
              transition: "all .15s",
              opacity: isActive ? 1 : 0.45,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: t.color,
                boxShadow: isActive ? `0 0 6px ${t.color}` : "none",
                display: "block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: ".52rem",
                fontWeight: 700,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: isActive ? t.color : "rgba(255,255,255,.35)",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
