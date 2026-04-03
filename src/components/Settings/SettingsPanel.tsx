"use client";

import { useTheme } from "@/hooks/useTheme";
import { THEMES } from "@/data/themes";
import SaveLoadPanel from "@/components/Shop/SaveLoadPanel";
import StartOverPanel from "@/components/Settings/StartOverPanel";

export default function SettingsPanel() {
  const [theme, setTheme] = useTheme();

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
