"use client";

import { useGameStore } from "@/state/store";
import { formatNumber } from "@/utils/format";
import { getVehicleById } from "@/data/vehicles";
import { useTheme, type Theme } from "@/hooks/useTheme";
import ThemeSwitcher from "./ThemeSwitcher";

type TabId = "junkyard" | "garage" | "race" | "shop" | "dev";

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  children: React.ReactNode;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "junkyard", label: "Junkyard" },
  { id: "garage",   label: "Garage"   },
  { id: "race",     label: "Race"     },
  { id: "shop",     label: "Shop"     },
  { id: "dev",      label: "Dev"      },
];

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
    <div style={{ fontFamily: "'Share Tech Mono', monospace", background: "#0f0a04", minHeight: "100vh", color: "#d4b896", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');
        .gm { font-family: 'Bebas Neue', cursive; }
        .gm-tab { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: .08em; cursor: pointer; padding: .7rem 1.4rem; border-bottom: 2.5px solid transparent; transition: all .12s; color: #5a4228; background: none; border-top: none; border-left: none; border-right: none; }
        .gm-tab:hover { color: #c4872a; }
        .gm-tab-on { color: #c83e0c !important; border-bottom-color: #c83e0c !important; }
        .gm-tab-dev { margin-left: auto; color: #4a3520 !important; }
        .gm-tab-dev:hover { color: #c4872a !important; }
        .gm-tab-dev-on { color: #f0b020 !important; border-bottom-color: #f0b020 !important; }
        .gm-stripe { background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.015) 0, rgba(255,255,255,.015) 1px, transparent 1px, transparent 8px); }
        .gm-panel { background: #181008; border: 1px solid #3a2510; border-top-color: #503518; }
        /* Override panel bg inside grease shell */
        .gm-content .rounded-lg { background: #181008 !important; border-color: #3a2510 !important; }
        .gm-content h2, .gm-content h3 { color: #c4872a !important; }
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
          <span style={{ fontSize: ".58rem", color: "#3a2510", letterSpacing: ".2em" }}>BUILT FROM GARBAGE</span>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="gm" style={{ fontSize: "1.25rem", color: "#c4872a", letterSpacing: ".04em" }}>${formatNumber(scrapBucks)}</div>
            <div style={{ fontSize: ".55rem", color: "#4a3520", letterSpacing: ".18em" }}>SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="gm" style={{ fontSize: "1.25rem", color: "#6aaa3a", letterSpacing: ".04em" }}>{formatNumber(repPoints)}</div>
            <div style={{ fontSize: ".55rem", color: "#4a3520", letterSpacing: ".18em" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <div style={{ textAlign: "right" }}>
              <div className="gm" style={{ fontSize: "1.25rem", color: "#c83e0c", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
              <div style={{ fontSize: ".55rem", color: "#4a3520", letterSpacing: ".18em" }}>{Math.floor(activeVehicle.stats.performance)} PTS</div>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ background: "#0d0803", borderBottom: "1px solid #2a1c0a", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.map((t) => {
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
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".6rem", color: "#4a3520", marginRight: ".5rem", letterSpacing: ".12em" }}>
            <span style={{ color: "#c83e0c" }}>◉</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="gm-content" style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #2a1c0a", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: ".6rem", color: "#3a2510", letterSpacing: ".15em" }}>RAGS TO RACES · MIT · BUILT FROM GARBAGE</span>
        <ThemeSwitcher />
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
    <div style={{ fontFamily: "'Rajdhani', sans-serif", background: "#000", minHeight: "100vh", color: "#c0d8e0", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        .mc { font-family: 'Orbitron', sans-serif; }
        .mc-scanlines { pointer-events: none; position: fixed; inset: 0; z-index: 0; background: repeating-linear-gradient(0deg, rgba(0,229,255,.018) 0, rgba(0,229,255,.018) 1px, transparent 1px, transparent 3px); }
        .mc-glow-c { text-shadow: 0 0 12px rgba(0,229,255,.7), 0 0 30px rgba(0,229,255,.3); }
        .mc-glow-m { text-shadow: 0 0 12px rgba(255,0,144,.7), 0 0 30px rgba(255,0,144,.3); }
        .mc-tab { font-family: 'Orbitron', sans-serif; font-size: .62rem; font-weight: 700; letter-spacing: .12em; cursor: pointer; padding: .8rem 1.2rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(0,229,255,.25); transition: all .14s; text-transform: uppercase; }
        .mc-tab:hover { color: rgba(0,229,255,.7); }
        .mc-tab-on { color: #00e5ff !important; border-bottom-color: #00e5ff !important; text-shadow: 0 0 10px rgba(0,229,255,.6); }
        .mc-tab-dev { margin-left: auto; color: rgba(255,0,144,.2) !important; }
        .mc-tab-dev:hover { color: rgba(255,0,144,.6) !important; }
        .mc-tab-dev-on { color: #ff0090 !important; border-bottom-color: #ff0090 !important; text-shadow: 0 0 10px rgba(255,0,144,.6); }
        .mc-stat-label { font-family: 'Orbitron', sans-serif; font-size: .48rem; font-weight: 700; letter-spacing: .18em; color: rgba(0,229,255,.35); }
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
          <div style={{ fontSize: ".55rem", color: "rgba(0,229,255,.3)", letterSpacing: ".2em", fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>MIDNIGHT CIRCUIT</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="mc mc-glow-c" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#00e5ff", letterSpacing: ".06em" }}>${formatNumber(scrapBucks)}</div>
            <div className="mc-stat-label">SCRAP BUCKS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mc" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ff0090", letterSpacing: ".06em", textShadow: "0 0 12px rgba(255,0,144,.6)" }}>{formatNumber(repPoints)}</div>
            <div className="mc-stat-label" style={{ color: "rgba(255,0,144,.35)" }}>REP</div>
          </div>
          {vehicleDef && activeVehicle && (
            <div style={{ textAlign: "right" }}>
              <div className="mc" style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c0d8e0", letterSpacing: ".04em" }}>{vehicleDef.name.toUpperCase()}</div>
              <div className="mc-stat-label">{Math.floor(activeVehicle.stats.performance)} PTS</div>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(0,0,0,.6)", borderBottom: "1px solid rgba(0,229,255,.08)", display: "flex", padding: "0 1.5rem", flexShrink: 0 }}>
        {TABS.map((t) => {
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
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".55rem", color: "rgba(0,229,255,.3)", marginRight: ".5rem", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, letterSpacing: ".12em" }}>
            <span style={{ color: "#00e5ff", textShadow: "0 0 8px #00e5ff" }}>●</span> AUTO
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(0,229,255,.08)", padding: ".6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span className="mc" style={{ fontSize: ".5rem", color: "rgba(0,229,255,.2)", letterSpacing: ".2em" }}>RAGS TO RACES · MIT · BUILT FROM GARBAGE</span>
        <ThemeSwitcher />
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
    <div style={{ fontFamily: "'Lato', sans-serif", background: "#080810", minHeight: "100vh", color: "#c8c0d0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        .pc { font-family: 'Playfair Display', serif; }
        .pc-tab { font-family: 'Lato', sans-serif; font-size: .65rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; cursor: pointer; padding: .9rem 1.3rem; border-bottom: 1px solid transparent; border-top: none; border-left: none; border-right: none; background: none; color: rgba(184,151,90,.25); transition: all .15s; }
        .pc-tab:hover { color: rgba(184,151,90,.65); }
        .pc-tab-on { color: #b8975a !important; border-bottom-color: #b8975a !important; }
        .pc-tab-dev { margin-left: auto; color: rgba(184,151,90,.15) !important; }
        .pc-tab-dev:hover { color: rgba(184,151,90,.4) !important; }
        .pc-tab-dev-on { color: rgba(184,151,90,.7) !important; border-bottom-color: rgba(184,151,90,.7) !important; }
        .pc-rule { width: 1px; background: rgba(184,151,90,.15); height: 28px; }
        .pc-stat-label { font-family: 'Lato', sans-serif; font-size: .52rem; font-weight: 700; letter-spacing: .2em; color: rgba(184,151,90,.35); text-transform: uppercase; }
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
          <div style={{ fontSize: ".5rem", color: "rgba(184,151,90,.2)", letterSpacing: ".25em", fontFamily: "'Lato', sans-serif", fontWeight: 700, textTransform: "uppercase" }}>The Collector&apos;s Edition</div>
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
            <>
              <div className="pc-rule" />
              <div style={{ textAlign: "right" }}>
                <div className="pc" style={{ fontSize: "1rem", color: "rgba(200,192,208,.7)", fontStyle: "italic" }}>{vehicleDef.name}</div>
                <div className="pc-stat-label">{Math.floor(activeVehicle.stats.performance)} pts</div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Thin gold rule */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(184,151,90,.3) 30%, rgba(184,151,90,.3) 70%, transparent)", flexShrink: 0 }} />

      {/* Tabs */}
      <nav style={{ background: "#060610", borderBottom: "1px solid rgba(184,151,90,.08)", display: "flex", padding: "0 2rem", flexShrink: 0 }}>
        {TABS.map((t) => {
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
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".52rem", color: "rgba(184,151,90,.25)", marginRight: ".5rem", fontFamily: "'Lato', sans-serif", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" }}>
            <span style={{ color: "rgba(184,151,90,.5)" }}>◆</span> Auto
          </div>
        )}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1152, width: "100%", margin: "0 auto", flex: 1, padding: "1.75rem 2rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(184,151,90,.08)", padding: ".65rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: ".52rem", color: "rgba(184,151,90,.2)", letterSpacing: ".2em", fontFamily: "'Lato', sans-serif", fontWeight: 700, textTransform: "uppercase" }}>Rags to Races · MIT License · Built from Garbage</span>
        <ThemeSwitcher />
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Router — picks shell based on theme
// ═══════════════════════════════════════════════════════════════════════════════

export default function ThemeShell(props: Props) {
  const [theme] = useTheme();

  if (theme === "neon")    return <NeonShell    {...props} />;
  if (theme === "prestige") return <PrestigeShell {...props} />;
  return <GreaseShell {...props} />;
}
