"use client";

import { useState } from "react";

// ─── Shared mock data ─────────────────────────────────────────────────────────

const MOCK = {
  scrapBucks: 2847,
  rep: 23,
  vehicle: { name: "Go-Kart", tier: 2, perf: 79 },
  inventory: [
    { name: "V4 Engine",     category: "engine",      condition: "worn",    value: 28 },
    { name: "Sport Tire",    category: "wheel",       condition: "good",    value: 22 },
    { name: "Scrap Frame",   category: "frame",       condition: "rusted",  value: 1  },
    { name: "Basic Wiring",  category: "electronics", condition: "decent",  value: 4  },
    { name: "Gas Can",       category: "fuel",        condition: "worn",    value: 1  },
    { name: "Old Seat",      category: "misc",        condition: "decent",  value: 2  },
  ],
  locations: [
    { id: "curbside",      name: "Curbside Trash",      tier: 0, locked: false },
    { id: "neighborhood",  name: "Neighborhood Yards",  tier: 1, locked: false },
    { id: "junkyard",      name: "Local Junkyard",      tier: 2, locked: false },
    { id: "auction",       name: "Salvage Auction",     tier: 3, locked: true  },
    { id: "industrial",    name: "Industrial Surplus",  tier: 4, locked: true  },
  ],
};

const COND: Record<string, { label: string; hex: string }> = {
  rusted: { label: "Rusted",  hex: "#e05c1a" },
  worn:   { label: "Worn",    hex: "#c4872a" },
  decent: { label: "Decent",  hex: "#9aaa2a" },
  good:   { label: "Good",    hex: "#4ab04a" },
  pristine:{ label: "Pristine",hex:"#2aadad" },
};

const TABS = [
  { id: "junkyard", emoji: "🗑", label: "Junkyard" },
  { id: "garage",   emoji: "🔧", label: "Garage"   },
  { id: "race",     emoji: "🏁", label: "Race"     },
  { id: "shop",     emoji: "🛒", label: "Shop"     },
  { id: "dev",      emoji: "⚙",  label: "Dev"      },
];

// ═══════════════════════════════════════════════════════════════════════════════
// THEME 1 — GREASE MONKEY  (industrial workshop, rubber-stamp, hot rod soul)
// ═══════════════════════════════════════════════════════════════════════════════

function GreaseMonkey() {
  const [tab, setTab] = useState("junkyard");

  return (
    <div style={{ fontFamily: "'Share Tech Mono', monospace", background: "#0f0a04", minHeight: "100vh", color: "#d4b896" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');
        .gm { font-family: 'Bebas Neue', cursive; }
        .gm-card { background: #181008; border: 1px solid #3a2510; border-top-color: #503518; box-shadow: inset 0 1px 0 rgba(196,135,42,.08); }
        .gm-btn  { font-family: 'Bebas Neue', cursive; letter-spacing: .1em; font-size: 1.5rem; background: #c83e0c; color: #ffd896; border: none; cursor: pointer; padding: .75rem 2.5rem; transition: background .15s; text-transform: uppercase; }
        .gm-btn:hover { background: #e05010; box-shadow: 0 0 18px rgba(200,62,12,.45); }
        .gm-sell { background: transparent; border: 1px solid #3a2510; color: #6b5232; font-size: .65rem; padding: .2rem .45rem; cursor: pointer; font-family: 'Share Tech Mono', monospace; }
        .gm-sell:hover { color: #c83e0c; border-color: #c83e0c; }
        .gm-tab { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: .08em; cursor: pointer; padding: .7rem 1.2rem; border-bottom: 2.5px solid transparent; transition: all .12s; color: #5a4228; background: none; border-top: none; border-left: none; border-right: none; }
        .gm-tab:hover { color: #c4872a; }
        .gm-tab-on { color: #c83e0c !important; border-bottom-color: #c83e0c !important; }
        @keyframes gmPulse { 0%,100% { box-shadow: 0 0 0 rgba(200,62,12,0) } 50% { box-shadow: 0 0 22px rgba(200,62,12,.35) } }
        .gm-btn { animation: gmPulse 2.2s ease-in-out infinite; }
        .gm-btn:hover { animation: none; }
        .gm-stripe { background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.015) 0, rgba(255,255,255,.015) 1px, transparent 1px, transparent 8px); }
      `}</style>

      {/* HUD */}
      <header className="gm-stripe" style={{ background: "#0a0703", borderBottom: "1px solid #3a2510", boxShadow: "0 1px 0 #503518", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".75rem" }}>
          <span className="gm" style={{ fontSize: "2.2rem", color: "#c83e0c", letterSpacing: ".04em", lineHeight: 1 }}>RAGS TO RACES</span>
          <span style={{ fontSize: ".65rem", color: "#4a3520", letterSpacing: ".2em" }}>BUILT FROM GARBAGE</span>
        </div>
        <div style={{ display: "flex", gap: "2.5rem" }}>
          {[
            { label: "SCRAP BUCKS", val: `$${MOCK.scrapBucks.toLocaleString()}`, c: "#c4872a" },
            { label: "REP",         val: String(MOCK.rep),                        c: "#6aaa3a" },
            { label: "ACTIVE VEHICLE", val: `T${MOCK.vehicle.tier} ${MOCK.vehicle.name.toUpperCase()}`, c: "#c83e0c" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "right" }}>
              <div className="gm" style={{ fontSize: "1.3rem", color: s.c, letterSpacing: ".04em" }}>{s.val}</div>
              <div style={{ fontSize: ".6rem", color: "#4a3520", letterSpacing: ".18em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ background: "#0d0803", borderBottom: "1px solid #2a1c0a", display: "flex", padding: "0 1.5rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`gm-tab${tab === t.id ? " gm-tab-on" : ""}`}>
            {t.label.toUpperCase()}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".65rem", color: "#4a3520" }}>
          <span>◉</span> AUTO-SCAVENGE ACTIVE
        </div>
      </nav>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem", display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem" }}>

        {/* Locations */}
        <aside>
          <div className="gm" style={{ fontSize: ".75rem", letterSpacing: ".22em", color: "#4a3520", marginBottom: ".75rem" }}>— LOCATIONS —</div>
          {MOCK.locations.map(loc => (
            <div key={loc.id} className="gm-card" style={{ padding: ".6rem .8rem", marginBottom: ".5rem", borderLeft: `3px solid ${loc.id === "junkyard" ? "#c83e0c" : "transparent"}`, opacity: loc.locked ? .38 : 1, cursor: loc.locked ? "default" : "pointer" }}>
              <div className="gm" style={{ fontSize: "1.05rem", letterSpacing: ".04em", color: loc.id === "junkyard" ? "#d4b896" : "#7a5a30" }}>
                {loc.locked ? "🔒 " : ""}{loc.name.toUpperCase()}
              </div>
              <div style={{ fontSize: ".6rem", color: "#3a2510", marginTop: ".1rem", letterSpacing: ".12em" }}>TIER {loc.tier} SITE</div>
            </div>
          ))}
        </aside>

        {/* Scavenge + Inventory */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button className="gm-btn">⚡ SCAVENGE</button>
            <div style={{ borderLeft: "1px solid #3a2510", paddingLeft: "1rem", fontSize: ".7rem", lineHeight: 1.6 }}>
              <div className="gm" style={{ letterSpacing: ".08em", color: "#c4872a" }}>LOCAL JUNKYARD</div>
              <div style={{ color: "#4a3520" }}>TIER 2 · UP TO 3 PARTS PER RUN</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: ".7rem", color: "#4a3520" }}>{MOCK.inventory.length} PARTS IN HOLD</div>
            <button className="gm-sell" style={{ fontSize: ".75rem", padding: ".3rem .75rem" }}>SELL ALL</button>
          </div>

          <div className="gm-card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 65px 50px", gap: ".5rem", padding: ".45rem .8rem", borderBottom: "1px solid #251a08", fontSize: ".6rem", letterSpacing: ".16em", color: "#3a2510" }}>
              <span>PART</span><span>CONDITION</span><span>VALUE</span><span></span>
            </div>
            {MOCK.inventory.map((item, i) => {
              const c = COND[item.condition];
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 65px 50px", gap: ".5rem", padding: ".6rem .8rem", borderBottom: "1px solid #1a1008", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: ".88rem", color: "#d4b896" }}>{item.name}</span>
                    <span style={{ fontSize: ".62rem", color: "#3a2510", marginLeft: ".5rem" }}>{item.category}</span>
                  </div>
                  <span className="gm" style={{ fontSize: ".95rem", color: c.hex, letterSpacing: ".04em" }}>{c.label.toUpperCase()}</span>
                  <span style={{ color: "#c4872a" }}>${item.value}</span>
                  <button className="gm-sell">SELL</button>
                </div>
              );
            })}
          </div>

          {/* Decorative bottom bar */}
          <div style={{ borderTop: "1px solid #2a1c0a", paddingTop: ".75rem", display: "flex", gap: "2rem", fontSize: ".65rem", color: "#3a2510", letterSpacing: ".12em" }}>
            <span>SCRAP YIELD: 58 BUCKS/RUN</span>
            <span>BEST FIND: V6 ENGINE (DECENT)</span>
            <span style={{ marginLeft: "auto" }}>RUNS TODAY: 47</span>
          </div>
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEME 2 — MIDNIGHT CIRCUIT  (synthwave arcade, neon void, OutRun energy)
// ═══════════════════════════════════════════════════════════════════════════════

function MidnightCircuit() {
  const [tab, setTab] = useState("junkyard");

  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", background: "#000005", minHeight: "100vh", color: "#c8e0ff", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        .mc { font-family: 'Orbitron', monospace; }
        .mc-card { background: rgba(0,20,50,.6); border: 1px solid rgba(0,229,255,.12); backdrop-filter: blur(8px); }
        .mc-card-active { border-color: rgba(0,229,255,.5); box-shadow: 0 0 20px rgba(0,229,255,.1), inset 0 0 20px rgba(0,229,255,.04); }
        .mc-btn { font-family: 'Orbitron', monospace; font-size: .85rem; font-weight: 700; letter-spacing: .12em; background: transparent; border: 1.5px solid #00e5ff; color: #00e5ff; cursor: pointer; padding: .75rem 2.5rem; transition: all .18s; text-transform: uppercase; position: relative; clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%); }
        .mc-btn:hover { background: rgba(0,229,255,.1); box-shadow: 0 0 25px rgba(0,229,255,.5), inset 0 0 15px rgba(0,229,255,.08); text-shadow: 0 0 10px #00e5ff; }
        .mc-sell { background: transparent; border: 1px solid rgba(255,0,144,.3); color: rgba(255,0,144,.6); font-size: .65rem; padding: .2rem .5rem; cursor: pointer; font-family: 'Orbitron', monospace; letter-spacing: .06em; transition: all .15s; }
        .mc-sell:hover { border-color: #ff0090; color: #ff0090; box-shadow: 0 0 8px rgba(255,0,144,.3); }
        .mc-tab { font-family: 'Orbitron', monospace; font-size: .72rem; letter-spacing: .1em; cursor: pointer; padding: .8rem 1.1rem; border-bottom: 2px solid transparent; transition: all .15s; color: rgba(100,150,255,.4); background: none; border-top: none; border-left: none; border-right: none; }
        .mc-tab:hover { color: rgba(0,229,255,.7); }
        .mc-tab-on { color: #00e5ff !important; border-bottom-color: #00e5ff !important; text-shadow: 0 0 8px rgba(0,229,255,.6); }
        .mc-scanlines { position: fixed; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.12) 2px, rgba(0,0,0,.12) 4px); pointer-events: none; z-index: 9999; }
        .mc-grid { position: fixed; bottom: 0; left: 0; right: 0; height: 45%; background-image: linear-gradient(rgba(0,229,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,.07) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(600px) rotateX(60deg); transform-origin: bottom center; pointer-events: none; z-index: 0; }
        @keyframes mcGlow { 0%,100% { opacity: .7 } 50% { opacity: 1; text-shadow: 0 0 12px currentColor; } }
        .mc-live { animation: mcGlow 1.8s ease-in-out infinite; }
        @keyframes mcScan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .mc-beam { position: fixed; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(0,229,255,.15), rgba(0,229,255,.4), rgba(0,229,255,.15), transparent); animation: mcScan 4s linear infinite; pointer-events: none; z-index: 9998; }
        .mc-loc-locked { opacity: .3; filter: grayscale(1); }
      `}</style>

      <div className="mc-scanlines" />
      <div className="mc-beam" />
      <div className="mc-grid" />

      {/* HUD */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(0,5,20,.9)", borderBottom: "1px solid rgba(0,229,255,.15)", boxShadow: "0 0 30px rgba(0,229,255,.06)", padding: ".7rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="mc" style={{ fontSize: "1.6rem", fontWeight: 900, color: "#00e5ff", letterSpacing: ".08em", textShadow: "0 0 20px rgba(0,229,255,.6), 0 0 40px rgba(0,229,255,.3)", lineHeight: 1 }}>
            RAGS<span style={{ color: "#ff0090", textShadow: "0 0 20px rgba(255,0,144,.6)" }}>.</span>TO<span style={{ color: "#ff0090", textShadow: "0 0 20px rgba(255,0,144,.6)" }}>.</span>RACES
          </div>
          <div className="mc" style={{ fontSize: ".5rem", letterSpacing: ".3em", color: "rgba(0,229,255,.35)", marginTop: ".15rem" }}>IDLE RACING SYSTEM v0.1.0</div>
        </div>
        <div style={{ display: "flex", gap: "2.5rem", alignItems: "center" }}>
          {[
            { label: "CREDITS",  val: `${MOCK.scrapBucks.toLocaleString()}`,        c: "#ffe100", unit: "¥" },
            { label: "REP LVL",  val: String(MOCK.rep),                              c: "#00e5ff", unit: "" },
            { label: "UNIT",     val: `T${MOCK.vehicle.tier} ${MOCK.vehicle.name.toUpperCase()}`, c: "#ff0090", unit: "" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "right" }}>
              <div className="mc mc-live" style={{ fontSize: "1.2rem", fontWeight: 700, color: s.c, letterSpacing: ".06em" }}>{s.unit}{s.val}</div>
              <div className="mc" style={{ fontSize: ".5rem", letterSpacing: ".2em", color: "rgba(100,150,255,.4)", marginTop: ".1rem" }}>{s.label}</div>
            </div>
          ))}
          <div style={{ width: 1, height: 32, background: "rgba(0,229,255,.2)" }} />
          <div className="mc mc-live" style={{ fontSize: ".65rem", color: "#00e5ff", letterSpacing: ".08em" }}>◉ ONLINE</div>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ position: "relative", zIndex: 10, background: "rgba(0,5,15,.85)", borderBottom: "1px solid rgba(0,229,255,.1)", display: "flex", padding: "0 1.5rem", backdropFilter: "blur(4px)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`mc-tab${tab === t.id ? " mc-tab-on" : ""}`}>
            {t.label.toUpperCase()}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".6rem" }}>
          <span className="mc mc-live" style={{ fontSize: ".55rem", color: "#ffe100", letterSpacing: ".12em" }}>AUTO-SCAVENGE: ON</span>
        </div>
      </nav>

      {/* Body */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto", padding: "1.5rem", display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem" }}>

        {/* Locations */}
        <aside>
          <div className="mc" style={{ fontSize: ".55rem", letterSpacing: ".28em", color: "rgba(0,229,255,.35)", marginBottom: ".75rem" }}>/ SCAN ZONES /</div>
          {MOCK.locations.map(loc => (
            <div key={loc.id} className={`mc-card${loc.id === "junkyard" ? " mc-card-active" : ""}${loc.locked ? " mc-loc-locked" : ""}`}
              style={{ padding: ".65rem .85rem", marginBottom: ".45rem", cursor: loc.locked ? "default" : "pointer", position: "relative", overflow: "hidden" }}>
              {loc.id === "junkyard" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "#00e5ff", boxShadow: "0 0 8px #00e5ff" }} />}
              <div className="mc" style={{ fontSize: ".8rem", fontWeight: 700, letterSpacing: ".06em", color: loc.id === "junkyard" ? "#00e5ff" : "rgba(100,150,255,.5)", textShadow: loc.id === "junkyard" ? "0 0 8px rgba(0,229,255,.4)" : "none" }}>
                {loc.locked ? "[ LOCKED ]" : loc.name.toUpperCase()}
              </div>
              <div className="mc" style={{ fontSize: ".52rem", color: "rgba(100,150,255,.3)", marginTop: ".15rem", letterSpacing: ".12em" }}>ZONE-{loc.tier} ACCESS</div>
            </div>
          ))}
        </aside>

        {/* Scavenge + Inventory */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button className="mc-btn">▶ EXECUTE SCAN</button>
            <div className="mc" style={{ fontSize: ".6rem", letterSpacing: ".1em", lineHeight: 1.7, color: "rgba(0,229,255,.45)" }}>
              <div style={{ color: "#00e5ff" }}>ZONE: LOCAL JUNKYARD</div>
              <div>TIER 2 · YIELD: 1–3 COMPONENTS</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span className="mc" style={{ fontSize: ".6rem", color: "rgba(100,150,255,.5)", letterSpacing: ".1em" }}>{MOCK.inventory.length} ITEMS</span>
              <button className="mc-sell" style={{ fontSize: ".62rem", padding: ".3rem .8rem" }}>DUMP ALL</button>
            </div>
          </div>

          <div className="mc-card" style={{ overflow: "hidden" }}>
            <div className="mc" style={{ display: "grid", gridTemplateColumns: "1fr 100px 70px 55px", gap: ".5rem", padding: ".45rem .85rem", borderBottom: "1px solid rgba(0,229,255,.08)", fontSize: ".52rem", letterSpacing: ".18em", color: "rgba(0,229,255,.3)" }}>
              <span>COMPONENT</span><span>STATUS</span><span>VALUE</span><span></span>
            </div>
            {MOCK.inventory.map((item, i) => {
              const c = COND[item.condition];
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 70px 55px", gap: ".5rem", padding: ".6rem .85rem", borderBottom: "1px solid rgba(0,229,255,.04)", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#c8e0ff", fontSize: ".88rem" }}>{item.name}</span>
                    <span className="mc" style={{ fontSize: ".52rem", color: "rgba(100,150,255,.35)", marginLeft: ".5rem", letterSpacing: ".08em" }}>{item.category.toUpperCase()}</span>
                  </div>
                  <span className="mc" style={{ fontSize: ".72rem", fontWeight: 700, color: c.hex, letterSpacing: ".06em", textShadow: `0 0 6px ${c.hex}55` }}>{c.label.toUpperCase()}</span>
                  <span className="mc" style={{ fontSize: ".85rem", color: "#ffe100", letterSpacing: ".04em" }}>¥{item.value}</span>
                  <button className="mc-sell">SELL</button>
                </div>
              );
            })}
          </div>

          {/* Stats strip */}
          <div className="mc" style={{ display: "flex", gap: "2rem", padding: ".6rem .85rem", background: "rgba(0,229,255,.03)", border: "1px solid rgba(0,229,255,.06)", fontSize: ".55rem", letterSpacing: ".12em", color: "rgba(0,229,255,.3)" }}>
            <span>YIELD AVG: <span style={{ color: "#00e5ff" }}>58¥/RUN</span></span>
            <span>BEST: <span style={{ color: "#ffe100" }}>V6 ENGINE (DECENT)</span></span>
            <span style={{ marginLeft: "auto" }}>RUNS: <span style={{ color: "#00e5ff" }}>47</span></span>
          </div>
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEME 3 — PRESTIGE CLASS  (luxury editorial, Playfair, champagne gold)
// ═══════════════════════════════════════════════════════════════════════════════

function PrestigeClass() {
  const [tab, setTab] = useState("junkyard");

  return (
    <div style={{ fontFamily: "'Lato', sans-serif", background: "#080810", minHeight: "100vh", color: "#f0ece4", fontWeight: 300 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        .pc { font-family: 'Playfair Display', Georgia, serif; }
        .pc-card { background: #0e0e1c; border: 1px solid rgba(184,151,90,.14); }
        .pc-rule { height: 1px; background: linear-gradient(90deg, transparent, rgba(184,151,90,.4), transparent); }
        .pc-label { font-size: .6rem; letter-spacing: .25em; text-transform: uppercase; color: rgba(184,151,90,.55); font-family: 'Lato', sans-serif; font-weight: 700; }
        .pc-btn { font-family: 'Lato', sans-serif; font-weight: 700; font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; background: #b8975a; color: #080810; border: none; cursor: pointer; padding: .7rem 2.2rem; transition: all .18s; }
        .pc-btn:hover { background: #cead72; box-shadow: 0 4px 20px rgba(184,151,90,.25); }
        .pc-sell { background: transparent; border: 1px solid rgba(184,151,90,.2); color: rgba(184,151,90,.5); font-size: .6rem; padding: .2rem .55rem; cursor: pointer; font-family: 'Lato', sans-serif; letter-spacing: .1em; text-transform: uppercase; transition: all .15s; }
        .pc-sell:hover { border-color: rgba(184,151,90,.6); color: #b8975a; }
        .pc-tab { font-family: 'Lato', sans-serif; font-weight: 700; font-size: .65rem; letter-spacing: .2em; text-transform: uppercase; cursor: pointer; padding: .8rem 1.3rem; border-bottom: 1px solid transparent; transition: all .15s; color: rgba(184,151,90,.3); background: none; border-top: none; border-left: none; border-right: none; }
        .pc-tab:hover { color: rgba(184,151,90,.7); }
        .pc-tab-on { color: #b8975a !important; border-bottom-color: #b8975a !important; }
        .pc-loc-btn { display: block; width: 100%; text-align: left; background: transparent; border: none; cursor: pointer; padding: 0; }
        .pc-number { font-family: 'Playfair Display', Georgia, serif; font-size: 2rem; color: #b8975a; line-height: 1; }
      `}</style>

      {/* HUD */}
      <header style={{ background: "#050510", borderBottom: "1px solid rgba(184,151,90,.12)", padding: ".8rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="pc" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f0ece4", letterSpacing: ".03em", lineHeight: 1 }}>
            Rags to Races
          </div>
          <div className="pc-label" style={{ marginTop: ".25rem" }}>Incremental Racing — Early Access</div>
        </div>

        {/* Thin gold rule as separator */}
        <div style={{ flex: 1, margin: "0 2.5rem" }}>
          <div className="pc-rule" />
        </div>

        <div style={{ display: "flex", gap: "3rem", alignItems: "flex-end" }}>
          {[
            { label: "Scrap Bucks",    val: `$${MOCK.scrapBucks.toLocaleString()}` },
            { label: "Reputation",     val: String(MOCK.rep)                       },
            { label: "Active Vehicle", val: `T${MOCK.vehicle.tier} ${MOCK.vehicle.name}` },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "right" }}>
              <div className="pc" style={{ fontSize: "1.1rem", color: "#b8975a", lineHeight: 1 }}>{s.val}</div>
              <div className="pc-label" style={{ marginTop: ".2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ background: "#050510", borderBottom: "1px solid rgba(184,151,90,.1)", display: "flex", padding: "0 2rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`pc-tab${tab === t.id ? " pc-tab-on" : ""}`}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <span className="pc-label" style={{ color: "rgba(100,200,100,.5)" }}>● Auto-Scavenge</span>
        </div>
      </nav>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem", display: "grid", gridTemplateColumns: "240px 1fr", gap: "2.5rem" }}>

        {/* Locations */}
        <aside>
          <div className="pc-label" style={{ marginBottom: "1.25rem" }}>Scavenging Sites</div>
          <div className="pc-rule" style={{ marginBottom: "1.25rem" }} />
          {MOCK.locations.map(loc => (
            <button key={loc.id} className="pc-loc-btn" disabled={loc.locked} style={{ opacity: loc.locked ? .3 : 1, marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: ".6rem" }}>
                {loc.id === "junkyard" && <div style={{ width: 2, height: 14, background: "#b8975a", flexShrink: 0, marginTop: "auto" }} />}
                <div>
                  <div style={{ fontWeight: 400, color: loc.id === "junkyard" ? "#f0ece4" : "rgba(240,236,228,.45)", fontSize: ".92rem", letterSpacing: ".01em" }}>
                    {loc.locked ? "Locked" : loc.name}
                  </div>
                  <div className="pc-label" style={{ marginTop: ".15rem" }}>Tier {loc.tier} Location</div>
                </div>
              </div>
            </button>
          ))}
        </aside>

        {/* Scavenge + Inventory */}
        <section>

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <div className="pc" style={{ fontSize: "1.6rem", fontWeight: 400, color: "#f0ece4", lineHeight: 1 }}>
                Local Junkyard
              </div>
              <div className="pc-label" style={{ marginTop: ".3rem" }}>Tier 2 · Up to 3 parts per search</div>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontSize: ".8rem", color: "rgba(240,236,228,.3)", letterSpacing: ".04em" }}>{MOCK.inventory.length} items</span>
              <button className="pc-sell" style={{ padding: ".3rem .9rem" }}>Sell All</button>
              <button className="pc-btn">Search</button>
            </div>
          </div>

          <div className="pc-rule" style={{ marginBottom: "1.5rem" }} />

          {/* Inventory — editorial table */}
          <div className="pc-card" style={{ overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 70px 55px", gap: ".5rem", padding: ".6rem 1.2rem", borderBottom: "1px solid rgba(184,151,90,.1)" }}>
              {["Part", "Condition", "Value", ""].map(h => (
                <span key={h} className="pc-label">{h}</span>
              ))}
            </div>
            {MOCK.inventory.map((item, i) => {
              const c = COND[item.condition];
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 70px 55px", gap: ".5rem", padding: ".75rem 1.2rem", borderBottom: "1px solid rgba(184,151,90,.06)", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: ".92rem", fontWeight: 400, color: "#f0ece4" }}>{item.name}</span>
                    <span style={{ fontSize: ".65rem", color: "rgba(184,151,90,.35)", marginLeft: ".5rem", letterSpacing: ".08em", textTransform: "uppercase" }}>{item.category}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.hex, flexShrink: 0 }} />
                    <span style={{ fontSize: ".78rem", color: c.hex, fontWeight: 700, letterSpacing: ".04em" }}>{c.label}</span>
                  </div>
                  <span className="pc" style={{ fontSize: ".95rem", color: "#b8975a" }}>${item.value}</span>
                  <button className="pc-sell">Sell</button>
                </div>
              );
            })}
          </div>

          {/* Bottom stats */}
          <div style={{ display: "flex", gap: "3rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(184,151,90,.08)" }}>
            {[
              { label: "Average Yield",  val: "$58" },
              { label: "Searches Today", val: "47"  },
              { label: "Best Find",      val: "V6 Engine, Decent" },
            ].map(s => (
              <div key={s.label}>
                <div className="pc" style={{ fontSize: "1.15rem", color: "#b8975a" }}>{s.val}</div>
                <div className="pc-label" style={{ marginTop: ".15rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWITCHER
// ═══════════════════════════════════════════════════════════════════════════════

const THEMES = [
  { id: 0, name: "Grease Monkey",    sub: "Industrial · Hot Rod · Rubber Stamp",   component: GreaseMonkey    },
  { id: 1, name: "Midnight Circuit", sub: "Synthwave · Neon Arcade · OutRun",       component: MidnightCircuit },
  { id: 2, name: "Prestige Class",   sub: "Luxury Editorial · Playfair · Gold",     component: PrestigeClass   },
];

export default function DesignPage() {
  const [active, setActive] = useState(0);
  const Theme = THEMES[active].component;

  return (
    <div style={{ position: "relative" }}>
      <Theme />

      {/* Floating theme switcher */}
      <div style={{
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: ".5rem", zIndex: 99999,
        background: "rgba(0,0,0,.85)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,.12)", borderRadius: "999px", padding: ".4rem",
        boxShadow: "0 8px 32px rgba(0,0,0,.6)",
      }}>
        {THEMES.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            background: active === t.id ? "rgba(255,255,255,.15)" : "transparent",
            border: active === t.id ? "1px solid rgba(255,255,255,.25)" : "1px solid transparent",
            color: active === t.id ? "#fff" : "rgba(255,255,255,.45)",
            borderRadius: "999px", padding: ".35rem 1rem",
            cursor: "pointer", fontSize: ".72rem", fontWeight: 600, letterSpacing: ".04em",
            transition: "all .15s", whiteSpace: "nowrap",
          }}>
            {t.name}
          </button>
        ))}
        <div style={{ display: "flex", alignItems: "center", paddingLeft: ".5rem", paddingRight: ".25rem", borderLeft: "1px solid rgba(255,255,255,.12)", fontSize: ".6rem", color: "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>
          {THEMES[active].sub}
        </div>
      </div>
    </div>
  );
}
