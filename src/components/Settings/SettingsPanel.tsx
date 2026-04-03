"use client";

import { useTheme } from "@/hooks/useTheme";
import { useDyslexicFont } from "@/hooks/useDyslexicFont";
import { THEMES } from "@/data/themes";
import SaveLoadPanel from "@/components/Shop/SaveLoadPanel";
import StartOverPanel from "@/components/Settings/StartOverPanel";

export default function SettingsPanel() {
  const [theme, setTheme] = useTheme();
  const [dyslexic, setDyslexic] = useDyslexicFont();

  return (
    <div className="flex flex-col gap-8">
      {/* Theme Selection */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Theme
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 8,
          }}
        >
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.8rem",
                  background: isActive ? t.bg : "transparent",
                  border: `1.5px solid ${isActive ? t.color : "rgba(255,255,255,.1)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all .15s",
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: t.color,
                    boxShadow: isActive ? `0 0 8px ${t.color}, 0 0 16px ${t.color}44` : "none",
                    display: "block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: isActive ? t.color : "rgba(255,255,255,.6)",
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
      </div>

      {/* Accessibility */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Accessibility
        </h2>
        <div
          style={{
            padding: "0.75rem",
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 8,
          }}
        >
          <button
            onClick={() => setDyslexic(!dyslexic)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.5rem 0.4rem",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: dyslexic ? "var(--accent, #c83e0c)" : "rgba(255,255,255,.15)",
                position: "relative",
                flexShrink: 0,
                transition: "background .15s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: dyslexic ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left .15s",
                }}
              />
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: dyslexic ? "var(--accent, #c83e0c)" : "rgba(255,255,255,.6)",
              }}
            >
              Dyslexic Font (OpenDyslexic)
            </span>
          </button>
        </div>
      </div>

      {/* Save / Load */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Save &amp; Load
        </h2>
        <SaveLoadPanel />
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Danger Zone
        </h2>
        <StartOverPanel />
      </div>
    </div>
  );
}
