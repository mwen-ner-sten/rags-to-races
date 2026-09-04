"use client";

import { useEffect } from "react";
import { useGameStore } from "@/state/store";
import { getVehicleById } from "@/data/vehicles";
import { useTheme, type Theme } from "@/hooks/useTheme";
import StatsTooltip from "@/components/StatsTooltip";
import VehicleTooltip from "@/components/VehicleTooltip";
import CurrencyBar from "@/components/currency/CurrencyBar";
import FooterThemeSwitcher from "@/components/FooterThemeSwitcher";
import MobileNav from "@/components/MobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import type { TabId } from "@/components/navigation/tabs";

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  children: React.ReactNode;
}

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";

// ─── Theme CSS custom properties ─────────────────────────────────────────────
// These cascade into all content panels so they can use var(--panel-bg) etc.
export const THEME_VARS: Record<Theme, Record<string, string>> = {
  grease: {
    "--panel-bg": "#181008",
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
    "--warning": "#c4872a",
    "--danger": "#e05c1a",
    "--info": "#6aaa3a",
    "--input-bg": "#1a0c04",
    "--input-border": "#4a3518",
    "--input-focus": "#c83e0c",
    "--divider": "#3a2810",
  },
  neon: {
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
    "--success": "#00e5ff",
    "--warning": "#ff0090",
    "--danger": "#ff0090",
    "--info": "#66dce8",
    "--input-bg": "rgba(0,20,30,.8)",
    "--input-border": "rgba(0,229,255,.25)",
    "--input-focus": "#00e5ff",
    "--divider": "rgba(0,229,255,.15)",
  },
  prestige: {
    "--panel-bg": "rgba(12,12,24,.8)",
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
    "--success": "#b8975a",
    "--warning": "rgba(200,192,208,.7)",
    "--danger": "rgba(184,151,90,.6)",
    "--info": "rgba(184,151,90,.65)",
    "--input-bg": "rgba(12,12,24,.9)",
    "--input-border": "rgba(184,151,90,.2)",
    "--input-focus": "#b8975a",
    "--divider": "rgba(184,151,90,.15)",
  },
  vaporwave: {
    "--panel-bg": "rgba(26,0,48,.7)",
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
    "--success": "#01cdfe",
    "--warning": "#ff71ce",
    "--danger": "#ff71ce",
    "--info": "#b967ff",
    "--input-bg": "rgba(26,0,48,.9)",
    "--input-border": "rgba(185,103,255,.25)",
    "--input-focus": "#ff71ce",
    "--divider": "rgba(185,103,255,.15)",
  },
  terminal: {
    "--panel-bg": "rgba(0,8,0,.8)",
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
    "--success": "#40d840",
    "--warning": "#b8b820",
    "--danger": "#d84040",
    "--info": "#38b838",
    "--input-bg": "rgba(0,4,0,.8)",
    "--input-border": "#287028",
    "--input-focus": "#40d840",
    "--divider": "#207020",
  },
  midnight: {
    "--panel-bg": "rgba(8,14,30,.75)",
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

function resolvedThemeVars(theme: Theme): Record<string, string> {
  const vars = THEME_VARS[theme];
  if (vars["--modal-bg"]) return vars;
  const surface = vars["--input-bg"] ?? vars["--panel-bg"] ?? "#181008";
  const rgba = surface.match(/^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*[^)]+\)$/);
  const opaqueSurface = rgba ? `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})` : surface;
  return { ...vars, "--modal-bg": opaqueSurface };
}

// ─── Shared store hook ─────────────────────────────────────────────────────────
// Currency values are rendered inside <CurrencyBar>, so the shells only need
// identity info for the vehicle stat and the prestige badge.
function useHUDData() {
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const garage       = useGameStore((s) => s.garage);

  const activeVehicle = garage.find((v) => v.id === activeVehicleId);
  const vehicleDef    = activeVehicle ? getVehicleById(activeVehicle.definitionId) : null;

  return { prestigeCount, activeVehicle, vehicleDef };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GREASE MONKEY — industrial workshop, hot-rod soul
// ═══════════════════════════════════════════════════════════════════════════════

function GreaseShell({ activeTab, setActiveTab, children }: Props) {
  const { prestigeCount, activeVehicle, vehicleDef } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.grease as React.CSSProperties, fontFamily: "'Share Tech Mono', monospace", background: "#0f0a04", minHeight: "100vh", color: "#d4b896", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');
        .gm { font-family: 'Bebas Neue', cursive; }
        .gm-stripe { background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.015) 0, rgba(255,255,255,.015) 1px, transparent 1px, transparent 8px); }
        .gm-panel { background: #181008; border: 1px solid #3a2510; border-top-color: #503518; }
      `}</style>

      {/* HUD */}
      <header className="gm-stripe" style={{ background: "#0a0703", borderBottom: "1px solid #3a2510", boxShadow: "0 1px 0 #503518", padding: ".65rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="gm" style={{ fontSize: "2rem", color: "#c83e0c", letterSpacing: ".04em", lineHeight: 1 }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".6rem", background: "rgba(200,62,12,.15)", border: "1px solid rgba(200,62,12,.3)", color: "#c83e0c", padding: ".1rem .4rem", letterSpacing: ".15em" }}>
              P{prestigeCount}
            </span>
          )}
          <span style={{ fontSize: ".58rem", color: "#5a3a20", letterSpacing: ".2em" }}>BUILT FROM GARBAGE</span>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <CurrencyBar activeTab={activeTab} />
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="gm" style={{ fontSize: "1.25rem", color: "#c83e0c", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div style={{ fontSize: ".55rem", color: "#6a5030", letterSpacing: ".18em" }}>{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #2a1c0a", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: ".6rem", color: "#7a5a38", letterSpacing: ".15em" }}>RAGS TO RACES · MIT · BUILT FROM GARBAGE</span>
          <span style={{ fontSize: ".5rem", color: "#6a4a28", letterSpacing: ".1em", fontFamily: "'Share Tech Mono', monospace" }}>v{BUILD_VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FooterThemeSwitcher />
          <button onClick={() => setActiveTab("settings")} style={{ fontSize: ".6rem", opacity: 0.5, background: "none", border: "none", cursor: "pointer", color: "inherit", letterSpacing: ".1em" }}>&#9881; SETTINGS</button>
        </div>

      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDNIGHT CIRCUIT — synthwave / cyberpunk
// ═══════════════════════════════════════════════════════════════════════════════

function NeonShell({ activeTab, setActiveTab, children }: Props) {
  const { prestigeCount, activeVehicle, vehicleDef } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.neon as React.CSSProperties, fontFamily: "'Rajdhani', sans-serif", background: "#000", minHeight: "100vh", color: "#c0d8e0", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        .mc { font-family: 'Orbitron', sans-serif; }
        .mc-scanlines { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(0,229,255,.018) 0, rgba(0,229,255,.018) 1px, transparent 1px, transparent 3px); }
        .mc-glow-c { text-shadow: 0 0 12px rgba(0,229,255,.7), 0 0 30px rgba(0,229,255,.3); }
        .mc-glow-m { text-shadow: 0 0 12px rgba(255,0,144,.7), 0 0 30px rgba(255,0,144,.3); }
        .mc-stat-label { font-family: 'Orbitron', sans-serif; font-size: .48rem; font-weight: 700; letter-spacing: .18em; color: rgba(0,229,255,.75); }
        @media (max-width: 640px) {
          .mc-hud { flex-wrap: nowrap !important; gap: .5rem !important; }
          .mc-hud-brand { flex: 0 1 auto; min-width: 0; gap: .4rem !important; }
          .mc-hud-title { font-size: .9rem !important; white-space: nowrap; }
          .mc-hud-divider, .mc-hud-theme { display: none; }
          .mc-hud-data { flex: 1 1 auto; min-width: 0; justify-content: flex-end; gap: .65rem !important; flex-wrap: nowrap !important; }
          .mc-hud-data > div:first-child { gap: .6rem !important; }
          .mc-hud-vehicle { font-size: .78rem !important; white-space: nowrap; }
        }
      `}</style>

      <div className="mc-scanlines" />

      {/* HUD */}
      <header className="mc-hud" style={{ position: "relative", zIndex: 10, background: "rgba(0,229,255,.03)", borderBottom: "1px solid rgba(0,229,255,.12)", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(4px)", flexShrink: 0 }}>
        <div className="mc-hud-brand" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="mc mc-glow-c mc-hud-title" style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: ".08em", color: "#00e5ff", lineHeight: 1 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".5rem", color: "#ff0090", letterSpacing: ".2em", marginTop: ".1rem" }}>PRESTIGE {prestigeCount}</div>
            )}
          </div>
          <div className="mc-hud-divider" style={{ width: 1, height: 32, background: "rgba(0,229,255,.15)" }} />
          <div className="mc-hud-theme" style={{ fontSize: ".55rem", color: "rgba(0,229,255,.75)", letterSpacing: ".2em", fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>MIDNIGHT CIRCUIT</div>
        </div>
        <div className="mc-hud-data" style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <CurrencyBar activeTab={activeTab} />
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="mc mc-hud-vehicle" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c0d8e0", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="mc-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,229,255,.08)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="mc" style={{ fontSize: ".5rem", color: "rgba(0,229,255,.75)", letterSpacing: ".2em" }}>RAGS TO RACES · MIT · BUILT FROM GARBAGE</span>
          <span className="mc" style={{ fontSize: ".42rem", color: "rgba(0,229,255,.72)", letterSpacing: ".15em" }}>v{BUILD_VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FooterThemeSwitcher />
          <button onClick={() => setActiveTab("settings")} style={{ fontSize: ".6rem", opacity: 0.8, background: "none", border: "none", cursor: "pointer", color: "inherit", letterSpacing: ".1em" }}>&#9881; SETTINGS</button>
        </div>

      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESTIGE CLASS — luxury editorial
// ═══════════════════════════════════════════════════════════════════════════════

function PrestigeShell({ activeTab, setActiveTab, children }: Props) {
  const { prestigeCount, activeVehicle, vehicleDef } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.prestige as React.CSSProperties, fontFamily: "'Lato', sans-serif", background: "#080810", minHeight: "100vh", color: "#c8c0d0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        .pc { font-family: 'Playfair Display', serif; }
        .pc-rule { width: 1px; background: rgba(184,151,90,.15); height: 28px; }
        .pc-stat-label { font-family: 'Lato', sans-serif; font-size: .52rem; font-weight: 700; letter-spacing: .2em; color: rgba(184,151,90,.5); text-transform: uppercase; }
      `}</style>

      {/* HUD */}
      <header style={{ background: "#050508", borderBottom: "1px solid rgba(184,151,90,.12)", padding: ".8rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div>
            <div className="pc" style={{ fontSize: "1.5rem", color: "#b8975a", fontWeight: 700, letterSpacing: ".02em", lineHeight: 1 }}>Rags to Races</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".52rem", color: "rgba(184,151,90,.5)", letterSpacing: ".22em", fontFamily: "'Lato', sans-serif", fontWeight: 700, textTransform: "uppercase", marginTop: ".15rem" }}>
                Prestige {prestigeCount}
              </div>
            )}
          </div>
          <div className="pc-rule" />
          <div style={{ fontSize: ".5rem", color: "rgba(184,151,90,.4)", letterSpacing: ".25em", fontFamily: "'Lato', sans-serif", fontWeight: 700, textTransform: "uppercase" }}>The Collector&apos;s Edition</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <CurrencyBar activeTab={activeTab} />
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ display: "flex", alignItems: "center", gap: "inherit" }}>
                <div className="pc-rule" />
                <div style={{ textAlign: "right" }}>
                  <div className="pc" style={{ fontSize: "1rem", color: "rgba(200,192,208,.7)", fontStyle: "italic" }}>{vehicleDef.name}</div>
                  <div className="pc-stat-label">{Math.floor(activeVehicle.stats.performance)} pts</div>
                </div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Thin gold rule */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(184,151,90,.3) 30%, rgba(184,151,90,.3) 70%, transparent)", flexShrink: 0 }} />

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.75rem 2rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(184,151,90,.08)", padding: ".65rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: ".52rem", color: "rgba(184,151,90,.45)", letterSpacing: ".2em", fontFamily: "'Lato', sans-serif", fontWeight: 700, textTransform: "uppercase" }}>Rags to Races · MIT License · Built from Garbage</span>
          <span style={{ fontSize: ".45rem", color: "rgba(184,151,90,.35)", letterSpacing: ".12em", fontFamily: "'Lato', sans-serif" }}>v{BUILD_VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FooterThemeSwitcher />
          <button onClick={() => setActiveTab("settings")} style={{ fontSize: ".6rem", opacity: 0.5, background: "none", border: "none", cursor: "pointer", color: "inherit", letterSpacing: ".1em" }}>&#9881; SETTINGS</button>
        </div>

      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL — hacker / matrix
// ═══════════════════════════════════════════════════════════════════════════════

function TerminalShell({ activeTab, setActiveTab, children }: Props) {
  const { prestigeCount, activeVehicle, vehicleDef } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.terminal as React.CSSProperties, fontFamily: "'Fira Code', monospace", background: "#000800", minHeight: "100vh", color: "#30b830", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=Fira+Code:wght@400;500;600&display=swap');
        .tm { font-family: 'VT323', monospace; }
        .tm-scanlines { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(48,184,48,.03) 0, rgba(48,184,48,.03) 1px, transparent 1px, transparent 3px); }
        .tm-crt { pointer-events: none; position: fixed; inset: 0; z-index: 1; background: radial-gradient(ellipse at center, transparent 65%, rgba(0,8,0,.6) 100%); }
        .tm-rain { pointer-events: none; position: fixed; inset: 0; z-index: 0; background-image: linear-gradient(0deg, rgba(64,216,64,.02) 25%, transparent 25%), linear-gradient(0deg, rgba(64,216,64,.015) 50%, transparent 50%); background-size: 20px 40px; animation: tm-fall 8s linear infinite; }
        @keyframes tm-fall { 0% { background-position: 0 0; } 100% { background-position: 0 480px; } }
        @keyframes tm-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .tm-cursor { animation: tm-blink 1s step-end infinite; }
        .tm-stat-label { font-family: 'VT323', monospace; font-size: .75rem; letter-spacing: .1em; color: #30a030; }
        .tm-glow { text-shadow: 0 0 8px rgba(64,216,64,.6), 0 0 20px rgba(64,216,64,.2); }
      `}</style>

      <div className="tm-rain" />
      <div className="tm-scanlines" />
      <div className="tm-crt" />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(0,8,0,.8)", borderBottom: "1px solid #208020", padding: ".65rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="tm tm-glow" style={{ fontSize: "2rem", color: "#40d840", lineHeight: 1 }}>RAGS TO RACES<span className="tm-cursor">_</span></span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".85rem", background: "rgba(64,216,64,.08)", border: "1px solid rgba(64,216,64,.2)", color: "#40d840", padding: ".05rem .4rem", fontFamily: "'VT323', monospace" }}>
              [P{prestigeCount}]
            </span>
          )}
          <span className="tm" style={{ fontSize: ".9rem", color: "#30a030" }}>&gt; RUN RACE.EXE</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <CurrencyBar activeTab={activeTab} />
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="tm" style={{ fontSize: "1.3rem", color: "#40d840" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="tm-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid #185018", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="tm" style={{ fontSize: ".85rem", color: "#38a038" }}>RAGS_TO_RACES // MIT // &gt; RUN RACE.EXE</span>
          <span className="tm" style={{ fontSize: ".7rem", color: "#308030" }}>v{BUILD_VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FooterThemeSwitcher />
          <button onClick={() => setActiveTab("settings")} style={{ fontSize: ".6rem", opacity: 0.5, background: "none", border: "none", cursor: "pointer", color: "inherit", letterSpacing: ".1em" }}>&#9881; SETTINGS</button>
        </div>

      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VAPORWAVE — retro 80s aesthetic
// ═══════════════════════════════════════════════════════════════════════════════

function VaporwaveShell({ activeTab, setActiveTab, children }: Props) {
  const { prestigeCount, activeVehicle, vehicleDef } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.vaporwave as React.CSSProperties, fontFamily: "'Space Mono', monospace", background: "#1a0030", minHeight: "100vh", color: "#e0b0f0", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap');
        .vw { font-family: 'Press Start 2P', cursive; }
        .vw-stat-label { font-family: 'Space Mono', monospace; font-size: .5rem; font-weight: 700; letter-spacing: .15em; color: rgba(185,103,255,.4); text-transform: uppercase; }
        .vw-glow-pink { text-shadow: 0 0 10px rgba(255,113,206,.6), 0 0 25px rgba(255,113,206,.25); }
        .vw-glow-cyan { text-shadow: 0 0 10px rgba(1,205,254,.6), 0 0 25px rgba(1,205,254,.25); }
        .vw-header-stripe { background: linear-gradient(90deg, #ff71ce, #b967ff, #01cdfe, #b967ff, #ff71ce); height: 3px; opacity: .6; }
        .vw-bg-grid { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: linear-gradient(rgba(185,103,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(185,103,255,.03) 1px, transparent 1px); background-size: 40px 40px; }
        .vw-bg-glow { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at 50% 120%, rgba(255,113,206,.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 0%, rgba(1,205,254,.06) 0%, transparent 40%); }
      `}</style>

      <div className="vw-bg-grid" />
      <div className="vw-bg-glow" />

      {/* Gradient stripe */}
      <div className="vw-header-stripe" style={{ position: "relative", zIndex: 10, flexShrink: 0 }} />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(26,0,48,.8)", borderBottom: "1px solid rgba(255,113,206,.12)", padding: ".75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="vw vw-glow-pink" style={{ fontSize: ".9rem", color: "#ff71ce", lineHeight: 1.4 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".42rem", color: "#01cdfe", letterSpacing: ".2em", marginTop: ".2rem", fontFamily: "'Press Start 2P', cursive" }}>PRESTIGE {prestigeCount}</div>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(185,103,255,.2)" }} />
          <div className="vw" style={{ fontSize: ".42rem", color: "rgba(1,205,254,.4)", letterSpacing: ".3em" }}>A E S T H E T I C</div>
        </div>
        <div style={{ display: "flex", gap: "1.8rem", alignItems: "center" }}>
          <CurrencyBar activeTab={activeTab} />
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="vw" style={{ fontSize: ".6rem", color: "#b967ff", textShadow: "0 0 10px rgba(185,103,255,.5)" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="vw-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Gradient stripe */}
      <div className="vw-header-stripe" style={{ position: "relative", zIndex: 10, flexShrink: 0 }} />

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, background: "rgba(26,0,48,.8)", padding: ".65rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="vw" style={{ fontSize: ".38rem", color: "rgba(185,103,255,.45)", letterSpacing: ".2em" }}>RAGS TO RACES · MIT · A E S T H E T I C</span>
          <span className="vw" style={{ fontSize: ".32rem", color: "rgba(185,103,255,.35)", letterSpacing: ".12em" }}>v{BUILD_VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FooterThemeSwitcher />
          <button onClick={() => setActiveTab("settings")} style={{ fontSize: ".6rem", opacity: 0.5, background: "none", border: "none", cursor: "pointer", color: "inherit", letterSpacing: ".1em" }}>&#9881; SETTINGS</button>
        </div>

      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDNIGHT — late-night street racing
// ═══════════════════════════════════════════════════════════════════════════════

function MidnightShell({ activeTab, setActiveTab, children }: Props) {
  const { prestigeCount, activeVehicle, vehicleDef } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.midnight as React.CSSProperties, fontFamily: "'IBM Plex Mono', monospace", background: "#080c18", minHeight: "100vh", color: "#b0c4dc", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .mn { font-family: 'Chakra Petch', sans-serif; }
        .mn-asphalt { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(59,130,246,.012) 0, rgba(59,130,246,.012) 1px, transparent 1px, transparent 6px); }
        .mn-headlights { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at 30% 110%, rgba(59,130,246,.06) 0%, transparent 45%), radial-gradient(ellipse at 70% 110%, rgba(245,158,11,.04) 0%, transparent 40%); }
        .mn-glow-b { text-shadow: 0 0 10px rgba(59,130,246,.6), 0 0 25px rgba(59,130,246,.2); }
        .mn-glow-a { text-shadow: 0 0 10px rgba(245,158,11,.6), 0 0 25px rgba(245,158,11,.2); }
        .mn-stat-label { font-family: 'Chakra Petch', sans-serif; font-size: .5rem; font-weight: 600; letter-spacing: .18em; color: rgba(59,130,246,.5); text-transform: uppercase; }
        .mn-speed-line { height: 2px; background: linear-gradient(90deg, transparent, rgba(59,130,246,.4) 20%, #3b82f6 50%, rgba(59,130,246,.4) 80%, transparent); }
      `}</style>

      <div className="mn-asphalt" />
      <div className="mn-headlights" />

      {/* Speed line accent */}
      <div className="mn-speed-line" style={{ position: "relative", zIndex: 10, flexShrink: 0 }} />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(8,12,24,.85)", borderBottom: "1px solid rgba(59,130,246,.12)", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(4px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="mn mn-glow-b" style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: ".06em", color: "#3b82f6", lineHeight: 1 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".5rem", color: "#f59e0b", letterSpacing: ".2em", marginTop: ".1rem", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600 }}>PRESTIGE {prestigeCount}</div>
            )}
          </div>
          <div style={{ width: 1, height: 30, background: "rgba(59,130,246,.15)" }} />
          <div className="mn" style={{ fontSize: ".55rem", color: "rgba(59,130,246,.45)", letterSpacing: ".2em", fontWeight: 600 }}>LIGHTS OUT. SEND IT.</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <CurrencyBar activeTab={activeTab} />
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="mn" style={{ fontSize: "1.1rem", fontWeight: 600, color: "#d8e4f0", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="mn-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Speed line accent */}
      <div className="mn-speed-line" style={{ position: "relative", zIndex: 10, flexShrink: 0 }} />

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, background: "rgba(8,12,24,.85)", padding: ".65rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="mn" style={{ fontSize: ".52rem", color: "rgba(59,130,246,.45)", letterSpacing: ".18em", fontWeight: 600 }}>RAGS TO RACES · MIT · LIGHTS OUT. SEND IT.</span>
          <span style={{ fontSize: ".45rem", color: "rgba(59,130,246,.35)", letterSpacing: ".12em", fontFamily: "'IBM Plex Mono', monospace" }}>v{BUILD_VERSION}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <FooterThemeSwitcher />
          <button onClick={() => setActiveTab("settings")} style={{ fontSize: ".6rem", opacity: 0.5, background: "none", border: "none", cursor: "pointer", color: "inherit", letterSpacing: ".1em" }}>&#9881; SETTINGS</button>
        </div>

      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Router — picks shell based on theme
// ═══════════════════════════════════════════════════════════════════════════════

export default function ThemeShell(props: Props) {
  const [theme] = useTheme();

  const shells: Record<Theme, React.ReactNode> = {
    grease:    <GreaseShell    {...props} />,
    neon:      <NeonShell      {...props} />,
    prestige:  <PrestigeShell  {...props} />,
    vaporwave: <VaporwaveShell {...props} />,
    terminal:  <TerminalShell  {...props} />,
    midnight:  <MidnightShell  {...props} />,
  };

  const vars = resolvedThemeVars(theme);

  // Portaled overlays mount under document.body rather than the themed shell.
  // Mirror the active palette onto :root after hydration and live switching so
  // those overlays inherit the same tokens as the rest of the application.
  useEffect(() => {
    const root = document.documentElement;
    for (const [property, value] of Object.entries(resolvedThemeVars(theme))) {
      root.style.setProperty(property, value);
    }
  }, [theme]);

  return (
    <>
      <div className="shell-content">
        {shells[theme]}
      </div>
      <MobileNav
        activeTab={props.activeTab}
        setActiveTab={props.setActiveTab}
        themeVars={vars}
      />
      <DesktopSidebar
        activeTab={props.activeTab}
        setActiveTab={props.setActiveTab}
        themeVars={vars}
      />
    </>
  );
}
