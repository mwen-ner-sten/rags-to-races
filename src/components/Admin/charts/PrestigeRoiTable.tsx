"use client";

import { useState, useMemo } from "react";
import { calculateLegacyPoints, type RunStats } from "@/engine/prestige";
import { LEGACY_UPGRADE_DEFINITIONS, legacyUpgradeCost } from "@/data/legacyUpgrades";

function calcFatigue(races: number, offset: number): number {
  const effective = Math.max(0, races - offset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}

export default function PrestigeRoiTable() {
  const [races, setRaces] = useState(100);
  const [scrap, setScrap] = useState(30000);
  const [tier, setTier] = useState(2);
  const [workshopCount, setWorkshopCount] = useState(10);
  const [ironWill, setIronWill] = useState(0);

  const scenarios = useMemo(() => {
    function makeLp(raceCount: number, scrapBucks: number) {
      const fatigue = calcFatigue(raceCount, ironWill * 5);
      const stats: RunStats = {
        lifetimeScrapBucks: scrapBucks,
        lifetimeRaces: raceCount,
        fatigue,
        repPoints: 0,
        highestCircuitTier: tier,
        workshopUpgradesBought: workshopCount,
      };
      const baseLp = calculateLegacyPoints(stats);
      // Momentum bonuses based on fatigue thresholds
      let momentumMult = 1;
      if (fatigue >= 80) momentumMult = 2.5; // +100% legendary (stacks with deep run but code uses max)
      else if (fatigue >= 60) momentumMult = 1.5; // +50% deep run
      return { baseLp, withMomentum: Math.floor(baseLp * momentumMult), fatigue };
    }

    const now = makeLp(races, scrap);

    // Estimate scrap per race (rough: ~200 per race avg for mid-game)
    const scrapPerRace = 200;

    const plus50 = makeLp(races + 50, scrap + 50 * scrapPerRace);
    const plus100 = makeLp(races + 100, scrap + 100 * scrapPerRace);

    // Find race count for deep run and legendary thresholds
    let deepRunRaces = races;
    while (calcFatigue(deepRunRaces, ironWill * 5) < 60 && deepRunRaces < 500) deepRunRaces++;
    const toDeepRun = makeLp(deepRunRaces, scrap + (deepRunRaces - races) * scrapPerRace);

    let legendaryRaces = races;
    while (calcFatigue(legendaryRaces, ironWill * 5) < 80 && legendaryRaces < 500) legendaryRaces++;
    const toLegendary = makeLp(legendaryRaces, scrap + (legendaryRaces - races) * scrapPerRace);

    return [
      { label: "Prestige Now", races, ...now, extra: "" },
      { label: "+50 Races", races: races + 50, ...plus50, extra: `+${50 * scrapPerRace} scrap est.` },
      { label: "+100 Races", races: races + 100, ...plus100, extra: `+${100 * scrapPerRace} scrap est.` },
      { label: `Push to Deep Run`, races: deepRunRaces, ...toDeepRun, extra: deepRunRaces > races ? `${deepRunRaces - races} more races` : "Already there" },
      { label: `Push to Legendary`, races: legendaryRaces, ...toLegendary, extra: legendaryRaces > races ? `${legendaryRaces - races} more races` : "Already there" },
    ];
  }, [races, scrap, tier, workshopCount, ironWill]);

  // What can you buy with LP?
  const buyableUpgrades = useMemo(() => {
    const currentLp = scenarios[0].withMomentum;
    return LEGACY_UPGRADE_DEFINITIONS.map((def) => {
      const lvl1Cost = legacyUpgradeCost(def, 1);
      const maxAffordable = (() => {
        let total = 0;
        for (let l = 1; l <= def.maxLevel; l++) {
          total += legacyUpgradeCost(def, l);
          if (total > currentLp) return l - 1;
        }
        return def.maxLevel;
      })();
      return { name: def.name, lvl1Cost, maxAffordable, maxLevel: def.maxLevel };
    }).filter((u) => u.maxAffordable > 0);
  }, [scenarios]);

  const labelStyle = { color: "var(--text-muted)" };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Current Races: {races}</label>
          <input type="range" min={10} max={300} value={races} onChange={(e) => setRaces(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Lifetime Scrap: ${scrap.toLocaleString()}</label>
          <input type="range" min={1000} max={500000} step={1000} value={scrap} onChange={(e) => setScrap(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Circuit Tier: {tier}</label>
          <input type="range" min={0} max={4} value={tier} onChange={(e) => setTier(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Workshop Upgrades: {workshopCount}</label>
          <input type="range" min={0} max={30} value={workshopCount} onChange={(e) => setWorkshopCount(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Iron Will: {ironWill}</label>
          <input type="range" min={0} max={10} value={ironWill} onChange={(e) => setIronWill(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      {/* Scenario comparison table */}
      <div className="overflow-x-auto">
        <table className="text-xs w-full" style={{ color: "var(--text-secondary)" }}>
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="text-left py-2 pr-3">Scenario</th>
              <th className="text-right py-2 pr-3">Races</th>
              <th className="text-right py-2 pr-3">Fatigue</th>
              <th className="text-right py-2 pr-3">Base LP</th>
              <th className="text-right py-2 pr-3">With Momentum</th>
              <th className="text-right py-2 pr-3">LP Gain vs Now</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, i) => {
              const gain = s.withMomentum - scenarios[0].withMomentum;
              return (
                <tr key={i} style={{ borderColor: "var(--divider)", background: i === 0 ? "rgba(59,130,246,.06)" : undefined }} className="border-t">
                  <td className="py-2 pr-3 font-semibold">{s.label}</td>
                  <td className="text-right py-2 pr-3 font-mono">{s.races}</td>
                  <td className="text-right py-2 pr-3 font-mono" style={{ color: s.fatigue >= 80 ? "var(--danger)" : s.fatigue >= 60 ? "var(--warning)" : undefined }}>
                    {s.fatigue}
                  </td>
                  <td className="text-right py-2 pr-3 font-mono">{s.baseLp}</td>
                  <td className="text-right py-2 pr-3 font-mono font-semibold" style={{ color: "var(--accent)" }}>
                    {s.withMomentum}
                  </td>
                  <td className="text-right py-2 pr-3 font-mono" style={{ color: gain > 0 ? "var(--success)" : undefined }}>
                    {i === 0 ? "-" : `+${gain}`}
                  </td>
                  <td className="py-2 text-xs" style={{ color: "var(--text-muted)" }}>{s.extra}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* What can you buy */}
      {buyableUpgrades.length > 0 && (
        <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-3">
          <p style={{ color: "var(--text-heading)" }} className="text-xs font-semibold uppercase tracking-wider mb-2">
            With {scenarios[0].withMomentum} LP you could buy:
          </p>
          <div className="flex flex-wrap gap-2">
            {buyableUpgrades.map((u) => (
              <span
                key={u.name}
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                className="text-xs rounded px-2 py-1"
              >
                {u.name} (up to lvl {u.maxAffordable}/{u.maxLevel})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
