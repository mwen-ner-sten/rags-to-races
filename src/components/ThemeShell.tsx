"use client";

import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import { getVehicleById } from "@/data/vehicles";
import { useTheme, type Theme } from "@/hooks/useTheme";
import StatsTooltip from "@/components/StatsTooltip";
import VehicleTooltip from "@/components/VehicleTooltip";
import FooterThemeSwitcher from "@/components/FooterThemeSwitcher";
type TabId = "junkyard" | "garage" | "race" | "locker" | "workshop" | "shop" | "help" | "settings" | "dev";

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  children: React.ReactNode;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "junkyard", label: "Junkyard" },
  { id: "garage",   label: "Garage"   },
  { id: "race",     label: "Race"     },
  { id: "locker",   label: "Locker"   },
  { id: "workshop", label: "Workshop" },
  { id: "shop",     label: "Shop"     },
  { id: "help",     label: "Help"     },
  { id: "dev",      label: "Dev"      },
];

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";
const SHOW_DEV_TAB = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

// ─── Theme CSS custom properties ─────────────────────────────────────────────
// These cascade into all content panels so they can use var(--panel-bg) etc.
const THEME_VARS: Record<Theme, Record<string, string>> = {
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
    "--panel-border": "rgba(0,229,255,.2)",
    "--panel-border-active": "#00e5ff",
    "--text-primary": "#c0d8e0",
    "--text-secondary": "rgba(0,229,255,.6)",
    "--text-muted": "rgba(0,229,255,.4)",
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
    "--info": "rgba(0,229,255,.8)",
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
  rustbelt: {
    "--panel-bg": "#140c08",
    "--panel-border": "#2a1a0a",
    "--panel-border-active": "#b44a1a",
    "--text-primary": "#b8a090",
    "--text-secondary": "#8a6a40",
    "--text-muted": "#7a5230",
    "--text-heading": "#b44a1a",
    "--text-white": "#d8c8b8",
    "--accent": "#b44a1a",
    "--accent-secondary": "#c87030",
    "--accent-bg": "rgba(180,74,26,.1)",
    "--accent-border": "rgba(180,74,26,.4)",
    "--btn-primary-bg": "#b44a1a",
    "--btn-primary-text": "#fff",
    "--btn-primary-hover": "#c85a2a",
    "--btn-border": "#5a3a20",
    "--btn-border-hover": "#8a6a40",
    "--success": "#6a8a3a",
    "--warning": "#c87030",
    "--danger": "#b44a1a",
    "--info": "#8a6a40",
    "--input-bg": "#0c0806",
    "--input-border": "#2a1a0a",
    "--input-focus": "#b44a1a",
    "--divider": "#2a1a0a",
  },
  arctic: {
    "--panel-bg": "rgba(6,10,16,.8)",
    "--panel-border": "rgba(72,184,232,.1)",
    "--panel-border-active": "#48b8e8",
    "--text-primary": "#b0c8d8",
    "--text-secondary": "rgba(72,184,232,.55)",
    "--text-muted": "rgba(72,184,232,.25)",
    "--text-heading": "#48b8e8",
    "--text-white": "#d8e8f0",
    "--accent": "#48b8e8",
    "--accent-secondary": "#88d0f0",
    "--accent-bg": "rgba(72,184,232,.08)",
    "--accent-border": "rgba(72,184,232,.4)",
    "--btn-primary-bg": "#48b8e8",
    "--btn-primary-text": "#060a10",
    "--btn-primary-hover": "#60c8f0",
    "--btn-border": "rgba(72,184,232,.2)",
    "--btn-border-hover": "rgba(72,184,232,.55)",
    "--success": "#48b8e8",
    "--warning": "#88d0f0",
    "--danger": "#e87068",
    "--info": "#88d0f0",
    "--input-bg": "rgba(6,10,16,.9)",
    "--input-border": "rgba(72,184,232,.1)",
    "--input-focus": "#48b8e8",
    "--divider": "rgba(72,184,232,.06)",
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
  tactical: {
    "--panel-bg": "#0c0e0a",
    "--panel-border": "rgba(74,138,40,.15)",
    "--panel-border-active": "#4a8a28",
    "--text-primary": "#8a9a78",
    "--text-secondary": "rgba(74,138,40,.55)",
    "--text-muted": "rgba(74,138,40,.25)",
    "--text-heading": "#4a8a28",
    "--text-white": "#b8c8a8",
    "--accent": "#4a8a28",
    "--accent-secondary": "#c8a848",
    "--accent-bg": "rgba(74,138,40,.08)",
    "--accent-border": "rgba(74,138,40,.4)",
    "--btn-primary-bg": "#4a8a28",
    "--btn-primary-text": "#0a0c08",
    "--btn-primary-hover": "#5a9a38",
    "--btn-border": "rgba(74,138,40,.2)",
    "--btn-border-hover": "rgba(74,138,40,.55)",
    "--success": "#4a8a28",
    "--warning": "#c8a848",
    "--danger": "#c84828",
    "--info": "#c8a848",
    "--input-bg": "#0a0c08",
    "--input-border": "rgba(74,138,40,.15)",
    "--input-focus": "#4a8a28",
    "--divider": "rgba(74,138,40,.1)",
  },
  sunset: {
    "--panel-bg": "#160a08",
    "--panel-border": "#3a1810",
    "--panel-border-active": "#e85020",
    "--text-primary": "#d8b0a0",
    "--text-secondary": "#8a5040",
    "--text-muted": "#6a4030",
    "--text-heading": "#e85020",
    "--text-white": "#f0d8d0",
    "--accent": "#e85020",
    "--accent-secondary": "#a830a0",
    "--accent-bg": "rgba(232,80,32,.1)",
    "--accent-border": "rgba(232,80,32,.4)",
    "--btn-primary-bg": "#e85020",
    "--btn-primary-text": "#fff",
    "--btn-primary-hover": "#f06030",
    "--btn-border": "#6a4030",
    "--btn-border-hover": "#8a5040",
    "--success": "#6aaa3a",
    "--warning": "#c03860",
    "--danger": "#e85020",
    "--info": "#a830a0",
    "--input-bg": "#120808",
    "--input-border": "#3a1810",
    "--input-focus": "#e85020",
    "--divider": "#2a1208",
  },
  deepsix: {
    "--panel-bg": "rgba(2,8,16,.8)",
    "--panel-border": "rgba(0,184,156,.1)",
    "--panel-border-active": "#00b89c",
    "--text-primary": "#68a8b8",
    "--text-secondary": "rgba(0,184,156,.55)",
    "--text-muted": "rgba(0,184,156,.25)",
    "--text-heading": "#00b89c",
    "--text-white": "#b0d8e0",
    "--accent": "#00b89c",
    "--accent-secondary": "#2060d0",
    "--accent-bg": "rgba(0,184,156,.08)",
    "--accent-border": "rgba(0,184,156,.4)",
    "--btn-primary-bg": "#00b89c",
    "--btn-primary-text": "#020810",
    "--btn-primary-hover": "#10c8ac",
    "--btn-border": "rgba(0,184,156,.2)",
    "--btn-border-hover": "rgba(0,184,156,.55)",
    "--success": "#00b89c",
    "--warning": "#2060d0",
    "--danger": "#c84848",
    "--info": "#2060d0",
    "--input-bg": "rgba(2,8,16,.9)",
    "--input-border": "rgba(0,184,156,.1)",
    "--input-focus": "#00b89c",
    "--divider": "rgba(0,184,156,.06)",
  },
  bloodmoon: {
    "--panel-bg": "#0e0606",
    "--panel-border": "rgba(192,16,32,.15)",
    "--panel-border-active": "#c01020",
    "--text-primary": "#a08080",
    "--text-secondary": "#8a5050",
    "--text-muted": "#6a3535",
    "--text-heading": "#c01020",
    "--text-white": "#d0b0b0",
    "--accent": "#c01020",
    "--accent-secondary": "#801020",
    "--accent-bg": "rgba(192,16,32,.08)",
    "--accent-border": "rgba(192,16,32,.4)",
    "--btn-primary-bg": "#c01020",
    "--btn-primary-text": "#fff",
    "--btn-primary-hover": "#d02030",
    "--btn-border": "#4a2020",
    "--btn-border-hover": "#6a3838",
    "--success": "#6a8a3a",
    "--warning": "#c87030",
    "--danger": "#c01020",
    "--info": "#801020",
    "--input-bg": "#0a0404",
    "--input-border": "rgba(192,16,32,.12)",
    "--input-focus": "#c01020",
    "--divider": "rgba(192,16,32,.1)",
  },
  sakura: {
    "--panel-bg": "#140a10",
    "--panel-border": "rgba(232,112,152,.1)",
    "--panel-border-active": "#e87098",
    "--text-primary": "#d0b8c8",
    "--text-secondary": "rgba(232,112,152,.55)",
    "--text-muted": "rgba(232,112,152,.25)",
    "--text-heading": "#e87098",
    "--text-white": "#f0d8e8",
    "--accent": "#e87098",
    "--accent-secondary": "#88c088",
    "--accent-bg": "rgba(232,112,152,.08)",
    "--accent-border": "rgba(232,112,152,.4)",
    "--btn-primary-bg": "#e87098",
    "--btn-primary-text": "#100810",
    "--btn-primary-hover": "#f080a8",
    "--btn-border": "rgba(232,112,152,.2)",
    "--btn-border-hover": "rgba(232,112,152,.55)",
    "--success": "#88c088",
    "--warning": "#e87098",
    "--danger": "#e05060",
    "--info": "#88c088",
    "--input-bg": "#100810",
    "--input-border": "rgba(232,112,152,.1)",
    "--input-focus": "#e87098",
    "--divider": "rgba(232,112,152,.06)",
  },
  outlaw: {
    "--panel-bg": "#120a06",
    "--panel-border": "#3a2010",
    "--panel-border-active": "#c88830",
    "--text-primary": "#c0a880",
    "--text-secondary": "#8a6838",
    "--text-muted": "#6a5030",
    "--text-heading": "#c88830",
    "--text-white": "#e0d0b0",
    "--accent": "#c88830",
    "--accent-secondary": "#a08848",
    "--accent-bg": "rgba(200,136,48,.1)",
    "--accent-border": "rgba(200,136,48,.4)",
    "--btn-primary-bg": "#c88830",
    "--btn-primary-text": "#0e0a06",
    "--btn-primary-hover": "#d89840",
    "--btn-border": "#6a5030",
    "--btn-border-hover": "#8a6838",
    "--success": "#6a8a3a",
    "--warning": "#d8a850",
    "--danger": "#c85020",
    "--info": "#a08848",
    "--input-bg": "#0e0a06",
    "--input-border": "#3a2010",
    "--input-focus": "#c88830",
    "--divider": "#2a1c0c",
  },
  chrome: {
    "--panel-bg": "#0e0e10",
    "--panel-border": "rgba(208,216,224,.1)",
    "--panel-border-active": "#d0d8e0",
    "--text-primary": "#b0b8c0",
    "--text-secondary": "rgba(208,216,224,.55)",
    "--text-muted": "rgba(208,216,224,.2)",
    "--text-heading": "#d0d8e0",
    "--text-white": "#e0e4e8",
    "--accent": "#d0d8e0",
    "--accent-secondary": "#5878a8",
    "--accent-bg": "rgba(208,216,224,.06)",
    "--accent-border": "rgba(208,216,224,.3)",
    "--btn-primary-bg": "#d0d8e0",
    "--btn-primary-text": "#0a0a0c",
    "--btn-primary-hover": "#e0e4e8",
    "--btn-border": "rgba(208,216,224,.15)",
    "--btn-border-hover": "rgba(208,216,224,.4)",
    "--success": "#5878a8",
    "--warning": "#c8a848",
    "--danger": "#c85050",
    "--info": "#5878a8",
    "--input-bg": "#0a0a0c",
    "--input-border": "rgba(208,216,224,.1)",
    "--input-focus": "#d0d8e0",
    "--divider": "rgba(208,216,224,.08)",
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
  sandstorm: {
    "--panel-bg": "#140e08",
    "--panel-border": "#3a2810",
    "--panel-border-active": "#d89030",
    "--text-primary": "#c0a878",
    "--text-secondary": "#8a6838",
    "--text-muted": "#6a5028",
    "--text-heading": "#d89030",
    "--text-white": "#e8d8b8",
    "--accent": "#d89030",
    "--accent-secondary": "#a06020",
    "--accent-bg": "rgba(216,144,48,.08)",
    "--accent-border": "rgba(216,144,48,.4)",
    "--btn-primary-bg": "#d89030",
    "--btn-primary-text": "#100c06",
    "--btn-primary-hover": "#e8a040",
    "--btn-border": "#6a5028",
    "--btn-border-hover": "#8a6838",
    "--success": "#6a8a3a",
    "--warning": "#d89030",
    "--danger": "#c85020",
    "--info": "#a06020",
    "--input-bg": "#100c06",
    "--input-border": "#3a2810",
    "--input-focus": "#d89030",
    "--divider": "#2a1c08",
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

// ─── Shared store hook ─────────────────────────────────────────────────────────
function useHUDData() {
  const scrapBucks   = useGameStore((s) => s.scrapBucks);
  const repPoints    = useGameStore((s) => s.repPoints);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const activeVehicleId = useGameStore((s) => s.activeVehicleId);
  const garage       = useGameStore((s) => s.garage);
  const autoScavengeUnlocked = useGameStore((s) => s.autoScavengeUnlocked);

  const activeVehicle = garage.find((v) => v.id === activeVehicleId);
  const vehicleDef    = activeVehicle ? getVehicleById(activeVehicle.definitionId) : null;

  return { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GREASE MONKEY — industrial workshop, hot-rod soul
// ═══════════════════════════════════════════════════════════════════════════════

function GreaseShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.grease as React.CSSProperties, fontFamily: "'Share Tech Mono', monospace", background: "#0f0a04", minHeight: "100vh", color: "#d4b896", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');
        .gm { font-family: 'Bebas Neue', cursive; }
        .gm-tab { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: .08em; cursor: pointer; padding: .7rem 1.4rem; border-bottom: 2.5px solid transparent; transition: all .12s; color: #7a5a38; background: none; border-top: none; border-left: none; border-right: none; }
        .gm-tab:hover { color: #c4872a; }
        .gm-tab-on { color: #c83e0c !important; border-bottom-color: #c83e0c !important; }
        .gm-tab-dev { margin-left: auto; color: #6a4a30 !important; }
        .gm-tab-dev:hover { color: #c4872a !important; }
        .gm-tab-dev-on { color: #f0b020 !important; border-bottom-color: #f0b020 !important; }
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
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="gm" style={{ fontSize: "1.25rem", color: "#c4872a", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div style={{ fontSize: ".55rem", color: "#6a5030", letterSpacing: ".18em" }}>SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="gm" style={{ fontSize: "1.25rem", color: "#6aaa3a", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div style={{ fontSize: ".55rem", color: "#6a5030", letterSpacing: ".18em" }}>REP</div>
          </div>
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

      {/* Tabs */}
      <nav style={{ background: "#0d0803", borderBottom: "1px solid #2a1c0a", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`gm-tab${isDev ? " gm-tab-dev" : ""}${isOn ? (isDev ? " gm-tab-dev-on" : " gm-tab-on") : ""}`}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".6rem", color: "#6a5030", marginRight: ".5rem", letterSpacing: ".12em" }}>
            <span style={{ color: "#c83e0c" }}>&#9673;</span> AUTO
          </div>
        )}
      </nav>

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
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.neon as React.CSSProperties, fontFamily: "'Rajdhani', sans-serif", background: "#000", minHeight: "100vh", color: "#c0d8e0", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        .mc { font-family: 'Orbitron', sans-serif; }
        .mc-scanlines { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(0,229,255,.018) 0, rgba(0,229,255,.018) 1px, transparent 1px, transparent 3px); }
        .mc-glow-c { text-shadow: 0 0 12px rgba(0,229,255,.7), 0 0 30px rgba(0,229,255,.3); }
        .mc-glow-m { text-shadow: 0 0 12px rgba(255,0,144,.7), 0 0 30px rgba(255,0,144,.3); }
        .mc-tab { font-family: 'Orbitron', sans-serif; font-size: .62rem; font-weight: 700; letter-spacing: .12em; cursor: pointer; padding: .8rem 1.2rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(0,229,255,.45); transition: all .14s; text-transform: uppercase; }
        .mc-tab:hover { color: rgba(0,229,255,.7); }
        .mc-tab-on { color: #00e5ff !important; border-bottom-color: #00e5ff !important; text-shadow: 0 0 10px rgba(0,229,255,.6); }
        .mc-tab-dev { margin-left: auto; color: rgba(255,0,144,.4) !important; }
        .mc-tab-dev:hover { color: rgba(255,0,144,.6) !important; }
        .mc-tab-dev-on { color: #ff0090 !important; border-bottom-color: #ff0090 !important; text-shadow: 0 0 10px rgba(255,0,144,.6); }
        .mc-stat-label { font-family: 'Orbitron', sans-serif; font-size: .48rem; font-weight: 700; letter-spacing: .18em; color: rgba(0,229,255,.5); }
      `}</style>

      <div className="mc-scanlines" />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(0,229,255,.03)", borderBottom: "1px solid rgba(0,229,255,.12)", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(4px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="mc mc-glow-c" style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: ".08em", color: "#00e5ff", lineHeight: 1 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".5rem", color: "#ff0090", letterSpacing: ".2em", marginTop: ".1rem" }}>PRESTIGE {prestigeCount}</div>
            )}
          </div>
          <div style={{ width: 1, height: 32, background: "rgba(0,229,255,.15)" }} />
          <div style={{ fontSize: ".55rem", color: "rgba(0,229,255,.45)", letterSpacing: ".2em", fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>MIDNIGHT CIRCUIT</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="mc mc-glow-c" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#00e5ff", letterSpacing: ".06em" }}>${formatNumber(scrapBucks)}</div>
            <div className="mc-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mc" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ff0090", letterSpacing: ".06em", textShadow: "0 0 12px rgba(255,0,144,.6)" }}>{formatNumber(repPoints)}</div>
            <div className="mc-stat-label" style={{ color: "rgba(255,0,144,.5)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="mc" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c0d8e0", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="mc-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(0,0,0,.6)", borderBottom: "1px solid rgba(0,229,255,.08)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`mc-tab${isDev ? " mc-tab-dev" : ""}${isOn ? (isDev ? " mc-tab-dev-on" : " mc-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".55rem", color: "rgba(0,229,255,.45)", marginRight: ".5rem", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, letterSpacing: ".12em" }}>
            <span style={{ color: "#00e5ff", textShadow: "0 0 8px #00e5ff" }}>&#9679;</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,229,255,.08)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="mc" style={{ fontSize: ".5rem", color: "rgba(0,229,255,.45)", letterSpacing: ".2em" }}>RAGS TO RACES · MIT · BUILT FROM GARBAGE</span>
          <span className="mc" style={{ fontSize: ".42rem", color: "rgba(0,229,255,.35)", letterSpacing: ".15em" }}>v{BUILD_VERSION}</span>
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
// PRESTIGE CLASS — luxury editorial
// ═══════════════════════════════════════════════════════════════════════════════

function PrestigeShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.prestige as React.CSSProperties, fontFamily: "'Lato', sans-serif", background: "#080810", minHeight: "100vh", color: "#c8c0d0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        .pc { font-family: 'Playfair Display', serif; }
        .pc-tab { font-family: 'Lato', sans-serif; font-size: .65rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; cursor: pointer; padding: .9rem 1.3rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(184,151,90,.45); transition: all .15s; }
        .pc-tab:hover { color: rgba(184,151,90,.7); }
        .pc-tab-on { color: #b8975a !important; border-bottom-color: #b8975a !important; }
        .pc-tab-dev { margin-left: auto; color: rgba(184,151,90,.35) !important; }
        .pc-tab-dev:hover { color: rgba(184,151,90,.55) !important; }
        .pc-tab-dev-on { color: rgba(184,151,90,.7) !important; border-bottom-color: rgba(184,151,90,.7) !important; }
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
          <div style={{ textAlign: "right" }}>
            <div className="pc" style={{ fontSize: "1.25rem", color: "#b8975a", fontWeight: 400, letterSpacing: ".02em" }}>${formatNumber(scrapBucks)}</div>
            <div className="pc-stat-label">Scrap Bucks</div>
          </div>
          <div className="pc-rule" />
          <div style={{ textAlign: "right" }}>
            <div className="pc" style={{ fontSize: "1.25rem", color: "rgba(200,192,208,.8)", fontWeight: 400 }}>{formatNumber(repPoints)}</div>
            <div className="pc-stat-label">Reputation</div>
          </div>
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

      {/* Tabs */}
      <nav style={{ background: "#060610", borderBottom: "1px solid rgba(184,151,90,.08)", display: "flex", padding: "0 2rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pc-tab${isDev ? " pc-tab-dev" : ""}${isOn ? (isDev ? " pc-tab-dev-on" : " pc-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".52rem", color: "rgba(184,151,90,.4)", marginRight: ".5rem", fontFamily: "'Lato', sans-serif", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" }}>
            <span style={{ color: "rgba(184,151,90,.6)" }}>&#9670;</span> Auto
          </div>
        )}
      </nav>

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
// OUTLAW — wild west / outlaw racing
// ═══════════════════════════════════════════════════════════════════════════════

function OutlawShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.outlaw as React.CSSProperties, fontFamily: "'Libre Baskerville', serif", background: "#0e0a06", minHeight: "100vh", color: "#c0a880", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rye&family=Libre+Baskerville:wght@400;700&display=swap');
        .ol { font-family: 'Rye', cursive; }
        .ol-tab { font-family: 'Rye', cursive; font-size: .72rem; letter-spacing: .06em; cursor: pointer; padding: .75rem 1.3rem; border-bottom: 2px solid transparent; transition: all .12s; color: #8a6838; background: none; border-top: none; border-left: none; border-right: none; }
        .ol-tab:hover { color: #c88830; }
        .ol-tab-on { color: #c88830 !important; border-bottom-color: #c88830 !important; }
        .ol-tab-dev { margin-left: auto; color: #6a5030 !important; }
        .ol-tab-dev:hover { color: #c88830 !important; }
        .ol-tab-dev-on { color: #d8a850 !important; border-bottom-color: #d8a850 !important; }
        .ol-stat-label { font-family: 'Rye', cursive; font-size: .48rem; letter-spacing: .15em; color: #8a6838; text-transform: uppercase; }
        .ol-wanted { border: 3px double #884020; outline: 1px solid #6a3818; outline-offset: 3px; }
        .ol-paper { background-image: radial-gradient(ellipse at 50% 0%, rgba(200,136,48,.06) 0%, transparent 70%), repeating-linear-gradient(0deg, rgba(192,168,128,.02) 0, rgba(192,168,128,.02) 1px, transparent 1px, transparent 6px); }
      `}</style>

      {/* HUD */}
      <header className="ol-wanted ol-paper" style={{ background: "#0c0804", padding: ".75rem 1.5rem", margin: ".5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="ol" style={{ fontSize: "1.8rem", color: "#c88830", lineHeight: 1 }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".55rem", background: "rgba(200,136,48,.12)", border: "1px solid rgba(200,136,48,.25)", color: "#c88830", padding: ".1rem .45rem", letterSpacing: ".15em", fontFamily: "'Rye', cursive" }}>
              P{prestigeCount}
            </span>
          )}
          <span style={{ fontSize: ".55rem", color: "#884020", letterSpacing: ".18em", fontFamily: "'Rye', cursive" }}>WANTED: SPEED</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="ol" style={{ fontSize: "1.2rem", color: "#c88830", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div className="ol-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ol" style={{ fontSize: "1.2rem", color: "#a08848", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div className="ol-stat-label">REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="ol" style={{ fontSize: "1.2rem", color: "#c88830", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="ol-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ background: "#0b0804", borderBottom: "2px solid #2a1c0c", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`ol-tab${isDev ? " ol-tab-dev" : ""}${isOn ? (isDev ? " ol-tab-dev-on" : " ol-tab-on") : ""}`}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".58rem", color: "#6a5030", marginRight: ".5rem", letterSpacing: ".12em", fontFamily: "'Rye', cursive" }}>
            <span style={{ color: "#c88830" }}>★</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "2px solid #2a1c0c", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="ol" style={{ fontSize: ".5rem", color: "#8a6838", letterSpacing: ".15em" }}>RAGS TO RACES · MIT · WANTED: SPEED</span>
          <span style={{ fontSize: ".42rem", color: "#7a5830", letterSpacing: ".1em", fontFamily: "'Libre Baskerville', serif" }}>v{BUILD_VERSION}</span>
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
// CHROME — clean minimalist / futuristic
// ═══════════════════════════════════════════════════════════════════════════════

function ChromeShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.chrome as React.CSSProperties, fontFamily: "'Inter', sans-serif", background: "#0a0a0c", minHeight: "100vh", color: "#b0b8c0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;500;700;900&family=Inter:wght@300;400;500;600&display=swap');
        .cr { font-family: 'Exo 2', sans-serif; }
        .cr-tab { font-family: 'Exo 2', sans-serif; font-size: .62rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; padding: .8rem 1.3rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(208,216,224,.4); transition: all .14s; }
        .cr-tab:hover { color: rgba(208,216,224,.65); }
        .cr-tab-on { color: #d0d8e0 !important; border-bottom-color: #d0d8e0 !important; }
        .cr-tab-dev { margin-left: auto; color: rgba(88,120,168,.4) !important; }
        .cr-tab-dev:hover { color: rgba(88,120,168,.6) !important; }
        .cr-tab-dev-on { color: #5878a8 !important; border-bottom-color: #5878a8 !important; }
        .cr-stat-label { font-family: 'Exo 2', sans-serif; font-size: .48rem; font-weight: 600; letter-spacing: .2em; color: rgba(176,184,192,.5); text-transform: uppercase; }
        .cr-chrome-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(208,216,224,.15) 20%, rgba(208,216,224,.25) 50%, rgba(208,216,224,.15) 80%, transparent); }
        .cr-sheen { background-image: linear-gradient(135deg, rgba(208,216,224,.03) 0%, transparent 40%, rgba(88,120,168,.03) 70%, transparent 100%); }
      `}</style>

      {/* HUD */}
      <header className="cr-sheen" style={{ background: "#08080a", borderBottom: "none", padding: ".75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="cr" style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: ".1em", color: "#d0d8e0", lineHeight: 1 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".48rem", color: "#5878a8", letterSpacing: ".22em", marginTop: ".15rem", fontFamily: "'Exo 2', sans-serif", fontWeight: 600 }}>PRESTIGE {prestigeCount}</div>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(208,216,224,.1)" }} />
          <div className="cr" style={{ fontSize: ".5rem", color: "rgba(208,216,224,.35)", letterSpacing: ".25em", fontWeight: 500 }}>PURE MACHINE</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="cr" style={{ fontSize: "1.15rem", fontWeight: 700, color: "#d0d8e0", letterSpacing: ".06em" }}>${formatNumber(scrapBucks)}</div>
            <div className="cr-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="cr" style={{ fontSize: "1.15rem", fontWeight: 700, color: "#5878a8", letterSpacing: ".06em" }}>{formatNumber(repPoints)}</div>
            <div className="cr-stat-label" style={{ color: "rgba(88,120,168,.5)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="cr" style={{ fontSize: "1.05rem", fontWeight: 600, color: "rgba(208,216,224,.7)", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="cr-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>
      <div className="cr-chrome-line" />

      {/* Tabs */}
      <nav style={{ background: "#09090b", borderBottom: "none", display: "flex", padding: "0 2rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`cr-tab${isDev ? " cr-tab-dev" : ""}${isOn ? (isDev ? " cr-tab-dev-on" : " cr-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".52rem", color: "rgba(208,216,224,.4)", marginRight: ".5rem", fontFamily: "'Exo 2', sans-serif", fontWeight: 600, letterSpacing: ".14em" }}>
            <span style={{ color: "#d0d8e0" }}>◈</span> AUTO
          </div>
        )}
      </nav>
      <div className="cr-chrome-line" />

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem 2rem" }}>
        {children}
      </main>

      {/* Footer */}
      <div className="cr-chrome-line" />
      <footer style={{ padding: ".65rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="cr" style={{ fontSize: ".48rem", color: "rgba(208,216,224,.4)", letterSpacing: ".22em", fontWeight: 500 }}>RAGS TO RACES · MIT · PURE MACHINE</span>
          <span className="cr" style={{ fontSize: ".4rem", color: "rgba(208,216,224,.32)", letterSpacing: ".15em", fontWeight: 500 }}>v{BUILD_VERSION}</span>
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
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

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
        .tm-tab { font-family: 'VT323', monospace; font-size: 1rem; letter-spacing: .06em; cursor: pointer; padding: .65rem 1.2rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: #208020; transition: all .1s; }
        .tm-tab:hover { color: #40d840; text-shadow: 0 0 8px rgba(64,216,64,.4); }
        .tm-tab-on { color: #40d840 !important; border-bottom-color: #40d840 !important; text-shadow: 0 0 10px rgba(64,216,64,.6); }
        .tm-tab-dev { margin-left: auto; color: #287028 !important; }
        .tm-tab-dev:hover { color: #30a030 !important; }
        .tm-tab-dev-on { color: #30a030 !important; border-bottom-color: #30a030 !important; text-shadow: 0 0 10px rgba(48,160,48,.5); }
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
          <div style={{ textAlign: "right" }}>
            <div className="tm tm-glow" style={{ fontSize: "1.3rem", color: "#40d840" }}>${formatNumber(scrapBucks)}</div>
            <div className="tm-stat-label">SCRAP_BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="tm" style={{ fontSize: "1.3rem", color: "#30b830" }}>{formatNumber(repPoints)}</div>
            <div className="tm-stat-label">REP_PTS</div>
          </div>
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

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(0,4,0,.7)", borderBottom: "1px solid #185018", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`tm-tab${isDev ? " tm-tab-dev" : ""}${isOn ? (isDev ? " tm-tab-dev-on" : " tm-tab-on") : ""}`}
            >
              {`[${t.label.toUpperCase()}]`}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".85rem", color: "#208020", marginRight: ".5rem", fontFamily: "'VT323', monospace" }}>
            <span style={{ color: "#40d840" }} className="tm-cursor">●</span> AUTO
          </div>
        )}
      </nav>

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
// SANDSTORM — Dakar rally / desert
// ═══════════════════════════════════════════════════════════════════════════════

function SandstormShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.sandstorm as React.CSSProperties, fontFamily: "'Barlow', sans-serif", background: "#100c06", minHeight: "100vh", color: "#c0a878", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Barlow:wght@400;500;600;700&display=swap');
        .sd { font-family: 'Teko', sans-serif; }
        .sd-dust { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: linear-gradient(180deg, rgba(216,144,48,.04) 0%, transparent 30%, transparent 70%, rgba(160,96,32,.06) 100%), radial-gradient(ellipse at 80% 20%, rgba(216,144,48,.05) 0%, transparent 50%); }
        .sd-stripe { background-image: repeating-linear-gradient(90deg, rgba(216,144,48,.04) 0, rgba(216,144,48,.04) 3px, transparent 3px, transparent 40px); }
        .sd-tab { font-family: 'Teko', sans-serif; font-size: 1.05rem; font-weight: 600; letter-spacing: .1em; cursor: pointer; padding: .6rem 1.3rem; border-bottom: 2px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: #8a6838; transition: all .12s; text-transform: uppercase; }
        .sd-tab:hover { color: #d89030; }
        .sd-tab-on { color: #d89030 !important; border-bottom-color: #d89030 !important; }
        .sd-tab-dev { margin-left: auto; color: #6a5028 !important; }
        .sd-tab-dev:hover { color: #a06020 !important; }
        .sd-tab-dev-on { color: #a06020 !important; border-bottom-color: #a06020 !important; }
        .sd-stat-label { font-family: 'Teko', sans-serif; font-size: .7rem; font-weight: 500; letter-spacing: .18em; color: #8a6838; text-transform: uppercase; }
        .sd-rally-stripe { height: 3px; background: linear-gradient(90deg, #d89030 0%, #d89030 30%, #a06020 30%, #a06020 35%, transparent 35%); }
      `}</style>

      <div className="sd-dust" />

      {/* Rally stripe */}
      <div className="sd-rally-stripe" style={{ flexShrink: 0 }} />

      {/* HUD */}
      <header className="sd-stripe" style={{ position: "relative", zIndex: 10, background: "#0e0a04", borderBottom: "1px solid #3a2810", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="sd" style={{ fontSize: "2.2rem", fontWeight: 700, color: "#d89030", letterSpacing: ".06em", lineHeight: 1 }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".65rem", background: "rgba(216,144,48,.1)", border: "1px solid rgba(216,144,48,.25)", color: "#d89030", padding: ".1rem .45rem", letterSpacing: ".12em", fontFamily: "'Teko', sans-serif", fontWeight: 600 }}>
              P{prestigeCount}
            </span>
          )}
          <span className="sd" style={{ fontSize: ".85rem", color: "#a06020", letterSpacing: ".18em", fontWeight: 500 }}>EAT MY DUST</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="sd" style={{ fontSize: "1.5rem", fontWeight: 600, color: "#d89030", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div className="sd-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="sd" style={{ fontSize: "1.5rem", fontWeight: 600, color: "#a08040", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div className="sd-stat-label">REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="sd" style={{ fontSize: "1.4rem", fontWeight: 600, color: "#d89030", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="sd-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "#0c0a04", borderBottom: "1px solid #2a1c08", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`sd-tab${isDev ? " sd-tab-dev" : ""}${isOn ? (isDev ? " sd-tab-dev-on" : " sd-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".75rem", color: "#8a6838", marginRight: ".5rem", fontFamily: "'Teko', sans-serif", fontWeight: 600, letterSpacing: ".12em" }}>
            <span style={{ color: "#d89030" }}>◉</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <div className="sd-rally-stripe" style={{ flexShrink: 0 }} />
      <footer style={{ position: "relative", zIndex: 10, padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="sd" style={{ fontSize: ".75rem", color: "#8a6838", letterSpacing: ".15em", fontWeight: 500 }}>RAGS TO RACES · MIT · EAT MY DUST</span>
          <span className="sd" style={{ fontSize: ".6rem", color: "#7a5830", letterSpacing: ".1em", fontWeight: 500 }}>v{BUILD_VERSION}</span>
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
// SUNSET STRIP — desert sunset racing
// ═══════════════════════════════════════════════════════════════════════════════

function SunsetShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.sunset as React.CSSProperties, fontFamily: "'Quicksand', sans-serif", background: "#120808", minHeight: "100vh", color: "#d8b0a0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Quicksand:wght@400;500;600;700&display=swap');
        .ss { font-family: 'Permanent Marker', cursive; }
        .ss-tab { font-family: 'Permanent Marker', cursive; font-size: .85rem; letter-spacing: .06em; cursor: pointer; padding: .7rem 1.4rem; border-bottom: 2.5px solid transparent; transition: all .12s; color: #8a5840; background: none; border-top: none; border-left: none; border-right: none; }
        .ss-tab:hover { color: #e85020; }
        .ss-tab-on { color: #e85020 !important; border-bottom-color: #e85020 !important; text-shadow: 0 0 12px rgba(232,80,32,.4); }
        .ss-tab-dev { margin-left: auto; color: #6a4030 !important; }
        .ss-tab-dev:hover { color: #a830a0 !important; }
        .ss-tab-dev-on { color: #a830a0 !important; border-bottom-color: #a830a0 !important; text-shadow: 0 0 12px rgba(168,48,160,.4); }
        .ss-stat-label { font-family: 'Quicksand', sans-serif; font-size: .52rem; font-weight: 700; letter-spacing: .18em; color: #8a5840; text-transform: uppercase; }
        .ss-warm-glow { background: radial-gradient(ellipse at 50% 0%, rgba(232,80,32,.06) 0%, transparent 60%); }
      `}</style>

      {/* HUD */}
      <header className="ss-warm-glow" style={{ background: "#0e0604", borderBottom: "1px solid #3a1810", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="ss" style={{ fontSize: "1.9rem", color: "#e85020", lineHeight: 1 }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".58rem", background: "rgba(232,80,32,.12)", border: "1px solid rgba(232,80,32,.3)", color: "#e85020", padding: ".1rem .4rem", letterSpacing: ".15em", fontFamily: "'Quicksand', sans-serif", fontWeight: 700 }}>
              P{prestigeCount}
            </span>
          )}
          <span style={{ fontSize: ".55rem", color: "#6a4030", letterSpacing: ".2em", fontFamily: "'Quicksand', sans-serif", fontWeight: 700 }}>DUST TILL DAWN</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="ss" style={{ fontSize: "1.25rem", color: "#e85020" }}>${formatNumber(scrapBucks)}</div>
            <div className="ss-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ss" style={{ fontSize: "1.25rem", color: "#a830a0" }}>{formatNumber(repPoints)}</div>
            <div className="ss-stat-label" style={{ color: "#7a3870" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="ss" style={{ fontSize: "1.25rem", color: "#e85020" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="ss-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Gradient bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #e85020 0%, #c03860 50%, #a830a0 100%)", flexShrink: 0 }} />

      {/* Tabs */}
      <nav style={{ background: "#0c0504", borderBottom: "1px solid #2a1208", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`ss-tab${isDev ? " ss-tab-dev" : ""}${isOn ? (isDev ? " ss-tab-dev-on" : " ss-tab-on") : ""}`}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".58rem", color: "#8a5840", marginRight: ".5rem", letterSpacing: ".12em", fontFamily: "'Quicksand', sans-serif", fontWeight: 700 }}>
            <span style={{ color: "#e85020" }}>◉</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <div style={{ height: 2, background: "linear-gradient(90deg, #e85020 0%, #c03860 50%, #a830a0 100%)", opacity: 0.3, flexShrink: 0 }} />
      <footer style={{ padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="ss" style={{ fontSize: ".55rem", color: "#8a5840", letterSpacing: ".12em" }}>RAGS TO RACES · MIT · DUST TILL DAWN</span>
          <span style={{ fontSize: ".45rem", color: "#7a4838", letterSpacing: ".1em", fontFamily: "'Quicksand', sans-serif" }}>v{BUILD_VERSION}</span>
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
// DEEP SIX — deep ocean / submarine
// ═══════════════════════════════════════════════════════════════════════════════

function DeepSixShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.deepsix as React.CSSProperties, fontFamily: "'Exo 2', sans-serif", background: "#020810", minHeight: "100vh", color: "#68a8b8", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Exo+2:wght@300;400;500;600;700&display=swap');
        .ds { font-family: 'Audiowide', cursive; }
        .ds-shimmer { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at 30% 80%, rgba(0,184,156,.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 20%, rgba(32,96,208,.04) 0%, transparent 50%); animation: ds-shift 12s ease-in-out infinite alternate; }
        @keyframes ds-shift { 0% { opacity: .6; } 50% { opacity: 1; } 100% { opacity: .6; } }
        .ds-bubbles { pointer-events: none; position: fixed; inset: 0; z-index: 0; background-image: radial-gradient(circle at 20% 70%, rgba(0,184,156,.03) 0%, transparent 1%), radial-gradient(circle at 60% 85%, rgba(32,96,208,.03) 0%, transparent 1%), radial-gradient(circle at 80% 60%, rgba(0,184,156,.02) 0%, transparent 1%); background-size: 120px 160px, 200px 200px, 80px 120px; animation: ds-rise 20s linear infinite; }
        @keyframes ds-rise { 0% { background-position: 0 0, 0 0, 0 0; } 100% { background-position: 0 -480px, 0 -600px, 0 -360px; } }
        .ds-glow-t { text-shadow: 0 0 10px rgba(0,184,156,.5), 0 0 25px rgba(0,184,156,.2); }
        .ds-glow-b { text-shadow: 0 0 10px rgba(32,96,208,.5), 0 0 25px rgba(32,96,208,.2); }
        .ds-tab { font-family: 'Audiowide', cursive; font-size: .65rem; letter-spacing: .1em; cursor: pointer; padding: .75rem 1.3rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(0,184,156,.45); transition: all .14s; text-transform: uppercase; }
        .ds-tab:hover { color: rgba(0,184,156,.7); }
        .ds-tab-on { color: #00b89c !important; border-bottom-color: #00b89c !important; text-shadow: 0 0 10px rgba(0,184,156,.5); }
        .ds-tab-dev { margin-left: auto; color: rgba(32,96,208,.4) !important; }
        .ds-tab-dev:hover { color: rgba(32,96,208,.65) !important; }
        .ds-tab-dev-on { color: #2060d0 !important; border-bottom-color: #2060d0 !important; text-shadow: 0 0 10px rgba(32,96,208,.5); }
        .ds-stat-label { font-family: 'Audiowide', cursive; font-size: .48rem; letter-spacing: .16em; color: rgba(0,184,156,.45); text-transform: uppercase; }
      `}</style>

      <div className="ds-shimmer" />
      <div className="ds-bubbles" />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(2,8,16,.85)", borderBottom: "1px solid rgba(0,184,156,.12)", backdropFilter: "blur(4px)", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="ds ds-glow-t" style={{ fontSize: "1.4rem", color: "#00b89c", letterSpacing: ".06em", lineHeight: 1 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".5rem", color: "#2060d0", letterSpacing: ".2em", marginTop: ".1rem", fontFamily: "'Audiowide', cursive" }}>DEPTH {prestigeCount}</div>
            )}
          </div>
          <div style={{ width: 1, height: 30, background: "rgba(0,184,156,.15)" }} />
          <div style={{ fontSize: ".5rem", color: "rgba(0,184,156,.4)", letterSpacing: ".2em", fontFamily: "'Audiowide', cursive" }}>SUBMERGED</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="ds ds-glow-t" style={{ fontSize: "1.15rem", color: "#00b89c", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div className="ds-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ds ds-glow-b" style={{ fontSize: "1.15rem", color: "#2060d0", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div className="ds-stat-label" style={{ color: "rgba(32,96,208,.45)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="ds" style={{ fontSize: "1.05rem", color: "#68a8b8", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="ds-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(2,8,16,.6)", borderBottom: "1px solid rgba(0,184,156,.06)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`ds-tab${isDev ? " ds-tab-dev" : ""}${isOn ? (isDev ? " ds-tab-dev-on" : " ds-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".52rem", color: "rgba(0,184,156,.4)", marginRight: ".5rem", fontFamily: "'Audiowide', cursive", letterSpacing: ".12em" }}>
            <span style={{ color: "#00b89c", textShadow: "0 0 8px rgba(0,184,156,.6)" }}>●</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,184,156,.06)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="ds" style={{ fontSize: ".48rem", color: "rgba(0,184,156,.42)", letterSpacing: ".18em" }}>RAGS TO RACES · MIT · SUBMERGED</span>
          <span className="ds" style={{ fontSize: ".4rem", color: "rgba(0,184,156,.35)", letterSpacing: ".12em" }}>v{BUILD_VERSION}</span>
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
// BLOODMOON — dark horror
// ═══════════════════════════════════════════════════════════════════════════════

function BloodmoonShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.bloodmoon as React.CSSProperties, fontFamily: "'Crimson Text', serif", background: "#0a0404", minHeight: "100vh", color: "#a08080", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Crimson+Text:wght@400;600;700&display=swap');
        .bm { font-family: 'Creepster', cursive; }
        .bm-vignette { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at center, transparent 50%, rgba(10,4,4,.8) 100%); }
        .bm-drip { border-bottom: 3px solid #c01020; box-shadow: inset 0 -6px 12px -4px rgba(192,16,32,.15); background-image: radial-gradient(ellipse at 15% 100%, rgba(192,16,32,.12) 0%, transparent 30%), radial-gradient(ellipse at 45% 100%, rgba(128,16,32,.1) 0%, transparent 20%), radial-gradient(ellipse at 75% 100%, rgba(192,16,32,.08) 0%, transparent 25%); }
        .bm-glow { text-shadow: 0 0 12px rgba(192,16,32,.6), 0 0 30px rgba(192,16,32,.2); }
        .bm-tab { font-family: 'Creepster', cursive; font-size: .9rem; letter-spacing: .08em; cursor: pointer; padding: .7rem 1.3rem; border-bottom: 2px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: #6a3030; transition: all .12s; }
        .bm-tab:hover { color: #c01020; }
        .bm-tab-on { color: #c01020 !important; border-bottom-color: #c01020 !important; text-shadow: 0 0 10px rgba(192,16,32,.5); }
        .bm-tab-dev { margin-left: auto; color: #5a2828 !important; }
        .bm-tab-dev:hover { color: #801020 !important; }
        .bm-tab-dev-on { color: #801020 !important; border-bottom-color: #801020 !important; text-shadow: 0 0 10px rgba(128,16,32,.4); }
        .bm-stat-label { font-family: 'Crimson Text', serif; font-size: .52rem; font-weight: 700; letter-spacing: .16em; color: #6a3535; text-transform: uppercase; }
      `}</style>

      <div className="bm-vignette" />

      {/* HUD */}
      <header className="bm-drip" style={{ position: "relative", zIndex: 10, background: "#080303", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="bm bm-glow" style={{ fontSize: "2rem", color: "#c01020", lineHeight: 1 }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".6rem", background: "rgba(192,16,32,.1)", border: "1px solid rgba(192,16,32,.25)", color: "#c01020", padding: ".1rem .4rem", letterSpacing: ".15em", fontFamily: "'Creepster', cursive" }}>
              P{prestigeCount}
            </span>
          )}
          <span className="bm" style={{ fontSize: ".7rem", color: "#6a3030", letterSpacing: ".15em" }}>DEAD HEAT</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="bm bm-glow" style={{ fontSize: "1.25rem", color: "#c01020" }}>${formatNumber(scrapBucks)}</div>
            <div className="bm-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="bm" style={{ fontSize: "1.25rem", color: "#801020", textShadow: "0 0 8px rgba(128,16,32,.4)" }}>{formatNumber(repPoints)}</div>
            <div className="bm-stat-label" style={{ color: "#5a2828" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="bm" style={{ fontSize: "1.2rem", color: "#a08080" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="bm-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "#080303", borderBottom: "1px solid rgba(192,16,32,.12)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`bm-tab${isDev ? " bm-tab-dev" : ""}${isOn ? (isDev ? " bm-tab-dev-on" : " bm-tab-on") : ""}`}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".58rem", color: "#6a3535", marginRight: ".5rem", letterSpacing: ".12em", fontFamily: "'Creepster', cursive" }}>
            <span style={{ color: "#c01020", textShadow: "0 0 6px rgba(192,16,32,.5)" }}>☠</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(192,16,32,.1)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="bm" style={{ fontSize: ".55rem", color: "#7a3838", letterSpacing: ".12em" }}>RAGS TO RACES · MIT · DEAD HEAT</span>
          <span style={{ fontSize: ".45rem", color: "#6a3030", letterSpacing: ".1em", fontFamily: "'Crimson Text', serif" }}>v{BUILD_VERSION}</span>
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
// SAKURA — Japanese cherry blossom
// ═══════════════════════════════════════════════════════════════════════════════

function SakuraShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.sakura as React.CSSProperties, fontFamily: "'Noto Sans JP', sans-serif", background: "#100810", minHeight: "100vh", color: "#d0b8c8", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&family=Noto+Sans+JP:wght@300;400;500;600&display=swap');
        .sk { font-family: 'Zen Maru Gothic', serif; }
        .sk-petal { background: radial-gradient(ellipse at 30% 20%, rgba(232,112,152,.03) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(136,192,136,.02) 0%, transparent 50%); }
        .sk-tab { font-family: 'Zen Maru Gothic', serif; font-size: .72rem; font-weight: 500; letter-spacing: .08em; cursor: pointer; padding: .8rem 1.3rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(232,112,152,.45); transition: all .18s ease; }
        .sk-tab:hover { color: rgba(232,112,152,.7); }
        .sk-tab-on { color: #e87098 !important; border-bottom-color: #e87098 !important; }
        .sk-tab-dev { margin-left: auto; color: rgba(136,192,136,.4) !important; }
        .sk-tab-dev:hover { color: rgba(136,192,136,.6) !important; }
        .sk-tab-dev-on { color: #88c088 !important; border-bottom-color: #88c088 !important; }
        .sk-stat-label { font-family: 'Noto Sans JP', sans-serif; font-size: .48rem; font-weight: 500; letter-spacing: .18em; color: rgba(232,112,152,.45); text-transform: uppercase; }
        .sk-thin-border { border: 1px solid rgba(232,112,152,.08); }
      `}</style>

      {/* HUD */}
      <header className="sk-petal" style={{ background: "#0e060c", borderBottom: "1px solid rgba(232,112,152,.1)", padding: ".8rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="sk" style={{ fontSize: "1.5rem", color: "#e87098", fontWeight: 700, letterSpacing: ".04em", lineHeight: 1 }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".5rem", color: "#88c088", letterSpacing: ".2em", marginTop: ".15rem", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500 }}>
                花 PRESTIGE {prestigeCount}
              </div>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(232,112,152,.1)" }} />
          <div className="sk" style={{ fontSize: ".6rem", color: "rgba(232,112,152,.4)", letterSpacing: ".15em", fontWeight: 500 }}>花見レース</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="sk" style={{ fontSize: "1.2rem", color: "#e87098", fontWeight: 700, letterSpacing: ".02em" }}>${formatNumber(scrapBucks)}</div>
            <div className="sk-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="sk" style={{ fontSize: "1.2rem", color: "#88c088", fontWeight: 700, letterSpacing: ".02em" }}>{formatNumber(repPoints)}</div>
            <div className="sk-stat-label" style={{ color: "rgba(136,192,136,.45)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="sk" style={{ fontSize: "1.05rem", color: "#d0b8c8", fontWeight: 500 }}>{vehicleDef.name}</div>
                <div className="sk-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Thin decorative line */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(232,112,152,.15) 20%, rgba(136,192,136,.1) 80%, transparent)", flexShrink: 0 }} />

      {/* Tabs */}
      <nav style={{ background: "#0c060a", borderBottom: "1px solid rgba(232,112,152,.06)", display: "flex", padding: "0 2rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`sk-tab${isDev ? " sk-tab-dev" : ""}${isOn ? (isDev ? " sk-tab-dev-on" : " sk-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".52rem", color: "rgba(232,112,152,.4)", marginRight: ".5rem", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, letterSpacing: ".12em" }}>
            <span style={{ color: "#e87098" }}>❀</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem 2rem" }}>
        {children}
      </main>

      {/* Footer */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(232,112,152,.1) 30%, rgba(136,192,136,.06) 70%, transparent)", flexShrink: 0 }} />
      <footer style={{ padding: ".65rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="sk" style={{ fontSize: ".5rem", color: "rgba(232,112,152,.42)", letterSpacing: ".15em", fontWeight: 500 }}>RAGS TO RACES · MIT · 花見レース</span>
          <span style={{ fontSize: ".42rem", color: "rgba(232,112,152,.35)", letterSpacing: ".1em", fontFamily: "'Noto Sans JP', sans-serif" }}>v{BUILD_VERSION}</span>
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
// RUST BELT — post-industrial decay
// ═══════════════════════════════════════════════════════════════════════════════

function RustBeltShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.rustbelt as React.CSSProperties, fontFamily: "'IBM Plex Mono', monospace", background: "#0c0806", minHeight: "100vh", color: "#b8a090", display: "flex", flexDirection: "column", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        .rb { font-family: 'Russo One', sans-serif; }
        .rb-tab { font-family: 'Russo One', sans-serif; font-size: .72rem; letter-spacing: .1em; cursor: pointer; padding: .75rem 1.3rem; border-bottom: 2px solid transparent; transition: all .12s; color: #7a5230; background: none; border-top: none; border-left: none; border-right: none; text-transform: uppercase; }
        .rb-tab:hover { color: #b44a1a; }
        .rb-tab-on { color: #b44a1a !important; border-bottom-color: #b44a1a !important; text-shadow: 0 0 8px rgba(180,74,26,.4); }
        .rb-tab-dev { margin-left: auto; color: #5a3a20 !important; }
        .rb-tab-dev:hover { color: #7a3a1a !important; }
        .rb-tab-dev-on { color: #c87030 !important; border-bottom-color: #c87030 !important; }
        .rb-stat-label { font-family: 'IBM Plex Mono', monospace; font-size: .5rem; font-weight: 600; letter-spacing: .18em; color: #7a5230; text-transform: uppercase; }
        .rb-rust-overlay { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at 20% 50%, rgba(180,74,26,.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(122,58,26,.08) 0%, transparent 40%), radial-gradient(ellipse at 60% 80%, rgba(180,74,26,.04) 0%, transparent 45%); }
        .rb-grit { background-image: repeating-linear-gradient(90deg, rgba(180,74,26,.02) 0, rgba(180,74,26,.02) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(0deg, rgba(122,58,26,.015) 0, rgba(122,58,26,.015) 1px, transparent 1px, transparent 6px); }
      `}</style>

      <div className="rb-rust-overlay" />

      {/* HUD */}
      <header className="rb-grit" style={{ position: "relative", zIndex: 10, background: "#0a0604", borderBottom: "2px solid #2a1a0a", boxShadow: "0 2px 0 #3a1a08", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="rb" style={{ fontSize: "1.9rem", color: "#b44a1a", letterSpacing: ".06em", lineHeight: 1, textShadow: "0 0 12px rgba(180,74,26,.3)" }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".58rem", background: "rgba(180,74,26,.12)", border: "1px solid rgba(180,74,26,.3)", color: "#b44a1a", padding: ".15rem .45rem", letterSpacing: ".15em", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
              P{prestigeCount}
            </span>
          )}
          <span style={{ fontSize: ".55rem", color: "#5a3a20", letterSpacing: ".22em", fontWeight: 600 }}>CORRODED BUT RUNNING</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="rb" style={{ fontSize: "1.2rem", color: "#b44a1a", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div className="rb-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="rb" style={{ fontSize: "1.2rem", color: "#8a6a40", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div className="rb-stat-label">REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="rb" style={{ fontSize: "1.2rem", color: "#b8a090", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="rb-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "#0a0705", borderBottom: "1px solid #2a1a0a", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rb-tab${isDev ? " rb-tab-dev" : ""}${isOn ? (isDev ? " rb-tab-dev-on" : " rb-tab-on") : ""}`}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".58rem", color: "#7a5230", marginRight: ".5rem", letterSpacing: ".12em", fontWeight: 600 }}>
            <span style={{ color: "#b44a1a", textShadow: "0 0 6px rgba(180,74,26,.5)" }}>&#9673;</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "2px solid #2a1a0a", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: ".55rem", color: "#7a5230", letterSpacing: ".18em", fontWeight: 600 }}>RAGS TO RACES · MIT · CORRODED BUT RUNNING</span>
          <span style={{ fontSize: ".45rem", color: "#6a4220", letterSpacing: ".1em", fontFamily: "'IBM Plex Mono', monospace" }}>v{BUILD_VERSION}</span>
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
// ARCTIC — frozen tundra rally
// ═══════════════════════════════════════════════════════════════════════════════

function ArcticShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.arctic as React.CSSProperties, fontFamily: "'Nunito Sans', sans-serif", background: "#060a10", minHeight: "100vh", color: "#b0c8d8", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Nunito+Sans:wght@400;600;700;800&display=swap');
        .ar { font-family: 'Michroma', sans-serif; }
        .ar-tab { font-family: 'Michroma', sans-serif; font-size: .58rem; letter-spacing: .12em; cursor: pointer; padding: .8rem 1.2rem; border-bottom: 1px solid transparent; transition: all .14s; color: rgba(72,184,232,.4); background: none; border-top: none; border-left: none; border-right: none; text-transform: uppercase; }
        .ar-tab:hover { color: rgba(72,184,232,.65); }
        .ar-tab-on { color: #48b8e8 !important; border-bottom-color: #48b8e8 !important; text-shadow: 0 0 10px rgba(72,184,232,.4); }
        .ar-tab-dev { margin-left: auto; color: rgba(136,208,240,.35) !important; }
        .ar-tab-dev:hover { color: rgba(136,208,240,.55) !important; }
        .ar-tab-dev-on { color: #88d0f0 !important; border-bottom-color: #88d0f0 !important; text-shadow: 0 0 8px rgba(136,208,240,.4); }
        .ar-stat-label { font-family: 'Michroma', sans-serif; font-size: .45rem; letter-spacing: .18em; color: rgba(72,184,232,.45); text-transform: uppercase; }
        .ar-frost { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at 30% 0%, rgba(136,208,240,.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(72,184,232,.04) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(200,230,255,.02) 0%, transparent 60%); }
        .ar-shimmer { pointer-events: none; position: fixed; inset: 0; z-index: 1; background: linear-gradient(135deg, transparent 40%, rgba(200,230,255,.015) 45%, transparent 50%, transparent 55%, rgba(136,208,240,.01) 60%, transparent 65%); }
        .ar-glow { text-shadow: 0 0 10px rgba(72,184,232,.5), 0 0 25px rgba(72,184,232,.2); }
      `}</style>

      <div className="ar-frost" />
      <div className="ar-shimmer" />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(72,184,232,.03)", borderBottom: "1px solid rgba(72,184,232,.1)", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(2px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div className="ar ar-glow" style={{ fontSize: "1.3rem", color: "#48b8e8", letterSpacing: ".1em", lineHeight: 1, textShadow: "0 0 16px rgba(72,184,232,.3)" }}>RAGS TO RACES</div>
            {prestigeCount > 0 && (
              <div style={{ fontSize: ".48rem", color: "#88d0f0", letterSpacing: ".2em", marginTop: ".15rem", fontFamily: "'Michroma', sans-serif" }}>PRESTIGE {prestigeCount}</div>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(72,184,232,.12)" }} />
          <div style={{ fontSize: ".48rem", color: "rgba(72,184,232,.4)", letterSpacing: ".22em", fontFamily: "'Michroma', sans-serif" }}>COLD START</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="ar" style={{ fontSize: "1.05rem", color: "#48b8e8", letterSpacing: ".06em", textShadow: "0 0 10px rgba(72,184,232,.3)" }}>${formatNumber(scrapBucks)}</div>
            <div className="ar-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ar" style={{ fontSize: "1.05rem", color: "#88d0f0", letterSpacing: ".06em" }}>{formatNumber(repPoints)}</div>
            <div className="ar-stat-label" style={{ color: "rgba(136,208,240,.45)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="ar" style={{ fontSize: "1.05rem", color: "#b0c8d8", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="ar-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(6,10,16,.8)", borderBottom: "1px solid rgba(72,184,232,.06)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`ar-tab${isDev ? " ar-tab-dev" : ""}${isOn ? (isDev ? " ar-tab-dev-on" : " ar-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".5rem", color: "rgba(72,184,232,.4)", marginRight: ".5rem", fontFamily: "'Michroma', sans-serif", letterSpacing: ".12em" }}>
            <span style={{ color: "#48b8e8", textShadow: "0 0 8px rgba(72,184,232,.6)" }}>&#10052;</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(72,184,232,.06)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="ar" style={{ fontSize: ".45rem", color: "rgba(72,184,232,.42)", letterSpacing: ".2em" }}>RAGS TO RACES · MIT · COLD START</span>
          <span className="ar" style={{ fontSize: ".38rem", color: "rgba(72,184,232,.35)", letterSpacing: ".15em" }}>v{BUILD_VERSION}</span>
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
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.vaporwave as React.CSSProperties, fontFamily: "'Space Mono', monospace", background: "#1a0030", minHeight: "100vh", color: "#e0b0f0", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap');
        .vw { font-family: 'Press Start 2P', cursive; }
        .vw-tab { font-family: 'Press Start 2P', cursive; font-size: .48rem; letter-spacing: .06em; cursor: pointer; padding: .9rem 1.1rem; border-bottom: 2px solid transparent; transition: all .14s; color: rgba(255,113,206,.4); background: none; border-top: none; border-left: none; border-right: none; text-transform: uppercase; }
        .vw-tab:hover { color: rgba(255,113,206,.7); text-shadow: 0 0 8px rgba(255,113,206,.3); }
        .vw-tab-on { color: #ff71ce !important; border-bottom-color: #ff71ce !important; text-shadow: 0 0 12px rgba(255,113,206,.6), 0 0 24px rgba(255,113,206,.2) !important; }
        .vw-tab-dev { margin-left: auto; color: rgba(185,103,255,.35) !important; }
        .vw-tab-dev:hover { color: rgba(185,103,255,.6) !important; }
        .vw-tab-dev-on { color: #b967ff !important; border-bottom-color: #b967ff !important; text-shadow: 0 0 12px rgba(185,103,255,.6) !important; }
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
          <div style={{ textAlign: "right" }}>
            <div className="vw vw-glow-cyan" style={{ fontSize: ".7rem", color: "#01cdfe" }}>${formatNumber(scrapBucks)}</div>
            <div className="vw-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="vw vw-glow-pink" style={{ fontSize: ".7rem", color: "#ff71ce" }}>{formatNumber(repPoints)}</div>
            <div className="vw-stat-label" style={{ color: "rgba(255,113,206,.4)" }}>REP</div>
          </div>
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

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(26,0,48,.6)", borderBottom: "1px solid rgba(185,103,255,.08)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`vw-tab${isDev ? " vw-tab-dev" : ""}${isOn ? (isDev ? " vw-tab-dev-on" : " vw-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".45rem", color: "rgba(1,205,254,.45)", marginRight: ".5rem", fontFamily: "'Press Start 2P', cursive", letterSpacing: ".1em" }}>
            <span style={{ color: "#01cdfe", textShadow: "0 0 8px #01cdfe" }}>&#9830;</span> AUTO
          </div>
        )}
      </nav>

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
// TACTICAL — military ops
// ═══════════════════════════════════════════════════════════════════════════════

function TacticalShell({ activeTab, setActiveTab, children }: Props) {
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.tactical as React.CSSProperties, fontFamily: "'Source Code Pro', monospace", background: "#0a0c08", minHeight: "100vh", color: "#8a9a78", display: "flex", flexDirection: "column", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Source+Code+Pro:wght@400;500;600;700&display=swap');
        .tc { font-family: 'Black Ops One', cursive; }
        .tc-tab { font-family: 'Black Ops One', cursive; font-size: .65rem; letter-spacing: .1em; cursor: pointer; padding: .75rem 1.3rem; border-bottom: 2px solid transparent; transition: all .12s; color: rgba(74,138,40,.45); background: none; border-top: none; border-left: none; border-right: none; text-transform: uppercase; }
        .tc-tab:hover { color: rgba(74,138,40,.7); }
        .tc-tab-on { color: #4a8a28 !important; border-bottom-color: #4a8a28 !important; text-shadow: 0 0 8px rgba(74,138,40,.4); }
        .tc-tab-dev { margin-left: auto; color: rgba(200,168,72,.35) !important; }
        .tc-tab-dev:hover { color: rgba(200,168,72,.6) !important; }
        .tc-tab-dev-on { color: #c8a848 !important; border-bottom-color: #c8a848 !important; text-shadow: 0 0 8px rgba(200,168,72,.4); }
        .tc-stat-label { font-family: 'Source Code Pro', monospace; font-size: .5rem; font-weight: 600; letter-spacing: .18em; color: rgba(74,138,40,.5); text-transform: uppercase; }
        .tc-bracket { position: relative; }
        .tc-bracket::before, .tc-bracket::after { content: ''; position: absolute; width: 12px; height: 12px; border-color: rgba(74,138,40,.25); border-style: solid; }
        .tc-bracket::before { top: 0; left: 0; border-width: 2px 0 0 2px; }
        .tc-bracket::after { top: 0; right: 0; border-width: 2px 2px 0 0; }
        .tc-bracket-bottom { position: relative; }
        .tc-bracket-bottom::before, .tc-bracket-bottom::after { content: ''; position: absolute; width: 12px; height: 12px; border-color: rgba(74,138,40,.25); border-style: solid; }
        .tc-bracket-bottom::before { bottom: 0; left: 0; border-width: 0 0 2px 2px; }
        .tc-bracket-bottom::after { bottom: 0; right: 0; border-width: 0 2px 2px 0; }
        .tc-scanline { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(74,138,40,.012) 0, rgba(74,138,40,.012) 1px, transparent 1px, transparent 4px); }
      `}</style>

      <div className="tc-scanline" />

      {/* HUD */}
      <header className="tc-bracket tc-bracket-bottom" style={{ position: "relative", zIndex: 10, background: "#080a06", borderBottom: "1px solid rgba(74,138,40,.15)", padding: ".75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="tc" style={{ fontSize: "1.6rem", color: "#4a8a28", letterSpacing: ".06em", lineHeight: 1, textShadow: "0 0 10px rgba(74,138,40,.3)" }}>RAGS TO RACES</span>
          {prestigeCount > 0 && (
            <span style={{ fontSize: ".55rem", background: "rgba(200,168,72,.1)", border: "1px solid rgba(200,168,72,.3)", color: "#c8a848", padding: ".15rem .45rem", letterSpacing: ".15em", fontFamily: "'Source Code Pro', monospace", fontWeight: 600 }}>
              LVL {prestigeCount}
            </span>
          )}
          <span style={{ fontSize: ".52rem", color: "rgba(74,138,40,.45)", letterSpacing: ".22em", fontWeight: 600 }}>OPERATION SCRAPYARD</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="tc" style={{ fontSize: "1.1rem", color: "#4a8a28", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div className="tc-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="tc" style={{ fontSize: "1.1rem", color: "#c8a848", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div className="tc-stat-label" style={{ color: "rgba(200,168,72,.5)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <VehicleTooltip vehicleDef={vehicleDef} activeVehicle={activeVehicle}>
              <div style={{ textAlign: "right" }}>
                <div className="tc" style={{ fontSize: "1.1rem", color: "#8a9a78", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
                <div className="tc-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
              </div>
            </VehicleTooltip>
          )}
          <StatsTooltip />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "#090b07", borderBottom: "1px solid rgba(74,138,40,.1)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`tc-tab${isDev ? " tc-tab-dev" : ""}${isOn ? (isDev ? " tc-tab-dev-on" : " tc-tab-on") : ""}`}
            >
              {t.label.toUpperCase()}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".55rem", color: "rgba(74,138,40,.45)", marginRight: ".5rem", fontFamily: "'Source Code Pro', monospace", fontWeight: 600, letterSpacing: ".12em" }}>
            <span style={{ color: "#4a8a28", textShadow: "0 0 6px rgba(74,138,40,.5)" }}>&#9654;</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(74,138,40,.1)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: ".52rem", color: "rgba(74,138,40,.45)", letterSpacing: ".18em", fontFamily: "'Source Code Pro', monospace", fontWeight: 600 }}>RAGS TO RACES · MIT · OPERATION SCRAPYARD</span>
          <span style={{ fontSize: ".42rem", color: "rgba(74,138,40,.35)", letterSpacing: ".1em", fontFamily: "'Source Code Pro', monospace" }}>v{BUILD_VERSION}</span>
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
  const { scrapBucks, repPoints, prestigeCount, activeVehicle, vehicleDef, autoScavengeUnlocked } = useHUDData();

  return (
    <div style={{ ...THEME_VARS.midnight as React.CSSProperties, fontFamily: "'IBM Plex Mono', monospace", background: "#080c18", minHeight: "100vh", color: "#b0c4dc", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .mn { font-family: 'Chakra Petch', sans-serif; }
        .mn-asphalt { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(59,130,246,.012) 0, rgba(59,130,246,.012) 1px, transparent 1px, transparent 6px); }
        .mn-headlights { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: radial-gradient(ellipse at 30% 110%, rgba(59,130,246,.06) 0%, transparent 45%), radial-gradient(ellipse at 70% 110%, rgba(245,158,11,.04) 0%, transparent 40%); }
        .mn-glow-b { text-shadow: 0 0 10px rgba(59,130,246,.6), 0 0 25px rgba(59,130,246,.2); }
        .mn-glow-a { text-shadow: 0 0 10px rgba(245,158,11,.6), 0 0 25px rgba(245,158,11,.2); }
        .mn-tab { font-family: 'Chakra Petch', sans-serif; font-size: .7rem; font-weight: 600; letter-spacing: .12em; cursor: pointer; padding: .8rem 1.3rem; border-bottom: 2px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(59,130,246,.4); transition: all .14s; text-transform: uppercase; }
        .mn-tab:hover { color: rgba(59,130,246,.7); }
        .mn-tab-on { color: #3b82f6 !important; border-bottom-color: #3b82f6 !important; text-shadow: 0 0 10px rgba(59,130,246,.5); }
        .mn-tab-dev { margin-left: auto; color: rgba(245,158,11,.35) !important; }
        .mn-tab-dev:hover { color: rgba(245,158,11,.6) !important; }
        .mn-tab-dev-on { color: #f59e0b !important; border-bottom-color: #f59e0b !important; text-shadow: 0 0 10px rgba(245,158,11,.5); }
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
          <div style={{ textAlign: "right" }}>
            <div className="mn mn-glow-b" style={{ fontSize: "1.15rem", fontWeight: 700, color: "#3b82f6", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div className="mn-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mn mn-glow-a" style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f59e0b", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div className="mn-stat-label" style={{ color: "rgba(245,158,11,.45)" }}>REP</div>
          </div>
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

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(6,10,20,.7)", borderBottom: "1px solid rgba(59,130,246,.08)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.filter(t => SHOW_DEV_TAB || t.id !== "dev").map((t) => {
          const isDev = t.id === "dev";
          const isOn  = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`mn-tab${isDev ? " mn-tab-dev" : ""}${isOn ? (isDev ? " mn-tab-dev-on" : " mn-tab-on") : ""}`}
            >
              {t.label}
            </button>
          );
        })}
        {autoScavengeUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".55rem", color: "rgba(59,130,246,.45)", marginRight: ".5rem", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, letterSpacing: ".12em" }}>
            <span style={{ color: "#3b82f6", textShadow: "0 0 8px rgba(59,130,246,.6)" }}>&#9679;</span> AUTO
          </div>
        )}
      </nav>

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

  if (theme === "neon")       return <NeonShell       {...props} />;
  if (theme === "prestige")   return <PrestigeShell   {...props} />;
  if (theme === "outlaw")     return <OutlawShell     {...props} />;
  if (theme === "chrome")     return <ChromeShell     {...props} />;
  if (theme === "terminal")   return <TerminalShell   {...props} />;
  if (theme === "sandstorm")  return <SandstormShell  {...props} />;
  if (theme === "sunset")     return <SunsetShell     {...props} />;
  if (theme === "deepsix")    return <DeepSixShell    {...props} />;
  if (theme === "bloodmoon")  return <BloodmoonShell  {...props} />;
  if (theme === "sakura")     return <SakuraShell     {...props} />;
  if (theme === "rustbelt")   return <RustBeltShell   {...props} />;
  if (theme === "arctic")     return <ArcticShell     {...props} />;
  if (theme === "vaporwave")  return <VaporwaveShell  {...props} />;
  if (theme === "midnight")   return <MidnightShell   {...props} />;
  if (theme === "tactical")   return <TacticalShell   {...props} />;
  return <GreaseShell {...props} />;
}
