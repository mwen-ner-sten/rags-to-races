"use client";

import { useTheme, type Theme } from "@/hooks/useTheme";
import { useState } from "react";

const THEMES: { id: Theme; label: string; color: string; bg: string; border: string }[] = [
  { id: "grease",  label: "Grease",  color: "#c83e0c", bg: "#1a0c04", border: "rgba(200,62,12,.4)"  },
  { id: "neon",    label: "Circuit", color: "#00e5ff", bg: "#000",    border: "rgba(0,229,255,.4)"  },
  { id: "prestige",label: "Prestige",color: "#b8975a", bg: "#080810", border: "rgba(184,151,90,.4)" },
  { id: "rustbelt", label: "Rust Belt", color: "#b44a1a", bg: "#0c0806", border: "rgba(180,74,26,.4)" },
  { id: "arctic",   label: "Arctic",    color: "#48b8e8", bg: "#060a10", border: "rgba(72,184,232,.4)" },
  { id: "vaporwave",label: "Vapor",     color: "#ff71ce", bg: "#1a0030", border: "rgba(255,113,206,.4)" },
  { id: "tactical", label: "Tactical",  color: "#4a8a28", bg: "#0a0c08", border: "rgba(74,138,40,.4)" },
  { id: "sunset",   label: "Sunset",    color: "#e85020", bg: "#120808", border: "rgba(232,80,32,.4)"  },
  { id: "deepsix",  label: "Deep Six",  color: "#00b89c", bg: "#020810", border: "rgba(0,184,156,.4)"  },
  { id: "bloodmoon",label: "Bloodmoon", color: "#c01020", bg: "#0a0404", border: "rgba(192,16,32,.4)"  },
  { id: "sakura",   label: "Sakura",    color: "#e87098", bg: "#100810", border: "rgba(232,112,152,.4)" },
  { id: "outlaw",   label: "Outlaw",    color: "#c88830", bg: "#0e0a06", border: "rgba(200,136,48,.4)"  },
  { id: "chrome",   label: "Chrome",    color: "#d0d8e0", bg: "#0a0a0c", border: "rgba(208,216,224,.4)" },
  { id: "terminal", label: "Terminal",  color: "#40d840", bg: "#000800", border: "rgba(64,216,64,.4)"   },
  { id: "sandstorm",label: "Sandstorm", color: "#d89030", bg: "#100c06", border: "rgba(216,144,48,.4)"  },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div style={{ position: "relative" }}>
      {/* Toggle button — shows current theme dot + name */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".3rem",
          padding: ".25rem .55rem",
          background: current.bg,
          border: `1px solid ${current.border}`,
          borderRadius: 4,
          cursor: "pointer",
          transition: "all .15s",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: current.color,
            boxShadow: `0 0 6px ${current.color}`,
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
            color: current.color,
            fontFamily: "inherit",
          }}
        >
          {current.label}
        </span>
        <span style={{ fontSize: ".5rem", color: "rgba(255,255,255,.3)", marginLeft: ".15rem" }}>
          ▾
        </span>
      </button>

      {/* Dropdown popover */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
          />
          {/* Panel */}
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              right: 0,
              zIndex: 999,
              background: "#0c0c10",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 6,
              padding: ".4rem",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: ".3rem",
              minWidth: 240,
              boxShadow: "0 8px 32px rgba(0,0,0,.6)",
            }}
          >
            {THEMES.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  title={t.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".3rem",
                    padding: ".3rem .45rem",
                    background: isActive ? t.bg : "transparent",
                    border: `1px solid ${isActive ? t.border : "rgba(255,255,255,.05)"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    transition: "all .15s",
                    opacity: isActive ? 1 : 0.55,
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
                      fontSize: ".45rem",
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: isActive ? t.color : "rgba(255,255,255,.4)",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
