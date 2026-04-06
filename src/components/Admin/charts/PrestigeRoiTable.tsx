"use client";

import { useState, useMemo, useEffect } from "react";
import { calculateLegacyPoints, type RunStats } from "@/engine/prestige";
import { LEGACY_UPGRADE_DEFINITIONS, legacyUpgradeCost } from "@/data/legacyUpgrades";
import { ControlPanel, Slider, Insight } from "./ChartControls";
import { calcFatigue, type GameSnapshot } from "./balanceUtils";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";

export default function PrestigeRoiTable({ snapshot }: { snapshot?: GameSnapshot }) {
  const [races, setRaces] = useState(100);
  const [scrap, setScrap] = useState(30000);
  const [tier, setTier] = useState(2);
  const [workshopCount, setWorkshopCount] = useState(10);
  const [ironWill, setIronWill] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- initialise from snapshot prop */
  useEffect(() => {
    if (!snapshot) return;
    setRaces(Math.max(10, snapshot.lifetimeRaces));
    setScrap(Math.max(1000, snapshot.lifetimeScrap));
    setTier(snapshot.circuitTier);
    setWorkshopCount(snapshot.workshopCount);
    setIronWill(snapshot.ironWill);
  }, [snapshot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const scenarios = useMemo(() => {
    function makeLp(raceCount: number, scrapBucks: number) {
      const fatigue = calcFatigue(raceCount, ironWill * 5);
      const stats: RunStats = {
        lifetimeScrapBucks: scrapBucks, lifetimeRaces: raceCount, fatigue,
        repPoints: 0, highestCircuitTier: tier, workshopUpgradesBought: workshopCount,
      };
      const baseLp = calculateLegacyPoints(stats);
      // Derive LP multiplier from canonical momentum tier data
      const lpMult = MOMENTUM_TIERS
        .filter((t) => t.effect.type === "lp_multiplier" && t.condition.type === "fatigue_gte" && fatigue >= t.condition.value)
        .reduce((sum, t) => sum + t.effect.value, 0);
      return { baseLp, withMomentum: Math.floor(baseLp * (1 + lpMult)), fatigue };
    }

    const now = makeLp(races, scrap);
    const scrapPerRace = 200;

    const plus50 = makeLp(races + 50, scrap + 50 * scrapPerRace);
    const plus100 = makeLp(races + 100, scrap + 100 * scrapPerRace);

    let deepRunRaces = races;
    while (calcFatigue(deepRunRaces, ironWill * 5) < 60 && deepRunRaces < 500) deepRunRaces++;
    const toDeepRun = makeLp(deepRunRaces, scrap + (deepRunRaces - races) * scrapPerRace);

    let legendaryRaces = races;
    while (calcFatigue(legendaryRaces, ironWill * 5) < 80 && legendaryRaces < 500) legendaryRaces++;
    const toLegendary = makeLp(legendaryRaces, scrap + (legendaryRaces - races) * scrapPerRace);

    return [
      { label: "Prestige Now", races, ...now, extra: "", highlight: true as const },
      { label: "+50 Races", races: races + 50, ...plus50, extra: `+${(50 * scrapPerRace).toLocaleString()} scrap est.`, highlight: false as const },
      { label: "+100 Races", races: races + 100, ...plus100, extra: `+${(100 * scrapPerRace).toLocaleString()} scrap est.`, highlight: false as const },
      { label: "Push to Deep Run", races: deepRunRaces, ...toDeepRun, extra: deepRunRaces > races ? `${deepRunRaces - races} more races` : "Already there", highlight: false as const },
      { label: "Push to Legendary", races: legendaryRaces, ...toLegendary, extra: legendaryRaces > races ? `${legendaryRaces - races} more races` : "Already there", highlight: false as const },
    ];
  }, [races, scrap, tier, workshopCount, ironWill]);

  const buyableUpgrades = useMemo(() => {
    const currentLp = scenarios[0].withMomentum;
    return LEGACY_UPGRADE_DEFINITIONS.map((def) => {
      let total = 0;
      let maxAffordable = 0;
      for (let l = 1; l <= def.maxLevel; l++) {
        total += legacyUpgradeCost(def, l);
        if (total > currentLp) break;
        maxAffordable = l;
      }
      return { name: def.name, maxAffordable, maxLevel: def.maxLevel };
    }).filter((u) => u.maxAffordable > 0);
  }, [scenarios]);

  // Find best scenario
  const bestIdx = scenarios.reduce((best, s, i) => s.withMomentum > scenarios[best].withMomentum ? i : best, 0);

  return (
    <div className="flex flex-col gap-5">
      <ControlPanel>
        <Slider label="Current Races" value={races} min={10} max={300} onChange={setRaces} />
        <Slider label="Lifetime Scrap" value={scrap} min={1000} max={500000} step={1000} badge={`$${scrap.toLocaleString()}`} onChange={setScrap} />
        <Slider label="Circuit Tier" value={tier} min={0} max={4} badge={`T${tier}`} onChange={setTier} />
        <Slider label="Workshop Upgrades" value={workshopCount} min={0} max={30} onChange={setWorkshopCount} />
        <Slider label="Iron Will" value={ironWill} min={0} max={10} onChange={setIronWill} />
      </ControlPanel>

      {/* Scenario table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--divider)" }}>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr style={{ color: "var(--text-muted)", borderColor: "var(--divider)" }} className="border-b">
                <th className="text-left py-3 px-4 font-medium">Scenario</th>
                <th className="text-right py-3 px-3 font-medium">Races</th>
                <th className="text-right py-3 px-3 font-medium">Fatigue</th>
                <th className="text-right py-3 px-3 font-medium">Base LP</th>
                <th className="text-right py-3 px-3 font-medium">With Momentum</th>
                <th className="text-right py-3 px-3 font-medium">LP Gain</th>
                <th className="text-left py-3 px-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-secondary)" }}>
              {scenarios.map((s, i) => {
                const gain = s.withMomentum - scenarios[0].withMomentum;
                const isBest = i === bestIdx && i > 0;
                return (
                  <tr
                    key={i}
                    style={{
                      borderColor: "var(--divider)",
                      background: isBest
                        ? "color-mix(in srgb, var(--success) 6%, transparent)"
                        : s.highlight
                          ? "color-mix(in srgb, var(--accent) 4%, transparent)"
                          : undefined,
                    }}
                    className="border-t"
                  >
                    <td className="py-2.5 px-4 font-semibold" style={{ color: "var(--text-white)" }}>
                      {s.label}
                      {isBest && (
                        <span
                          style={{ background: "var(--success)", color: "var(--btn-primary-text)" }}
                          className="ml-2 text-xs rounded px-1.5 py-0.5 font-semibold"
                        >
                          BEST
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono">{s.races}</td>
                    <td className="text-right py-2.5 px-3 font-mono">
                      <span
                        className="inline-block rounded px-1.5 py-0.5"
                        style={{
                          color: s.fatigue >= 80 ? "var(--danger)" : s.fatigue >= 60 ? "var(--warning)" : s.fatigue >= 40 ? "var(--text-white)" : "var(--text-muted)",
                          background: s.fatigue >= 80
                            ? "color-mix(in srgb, var(--danger) 12%, transparent)"
                            : s.fatigue >= 60
                              ? "color-mix(in srgb, var(--warning) 12%, transparent)"
                              : undefined,
                        }}
                      >
                        {s.fatigue}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono">{s.baseLp}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold" style={{ color: "var(--accent)" }}>
                      {s.withMomentum}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono" style={{ color: gain > 0 ? "var(--success)" : "var(--text-muted)" }}>
                      {i === 0 ? "-" : `+${gain}`}
                    </td>
                    <td className="py-2.5 px-4" style={{ color: "var(--text-muted)" }}>
                      {s.extra}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shopping list */}
      {buyableUpgrades.length > 0 && (
        <div
          style={{ borderColor: "var(--divider)" }}
          className="rounded-lg border overflow-hidden"
        >
          <div
            style={{ borderColor: "var(--divider)" }}
            className="border-b px-4 py-2.5"
          >
            <span style={{ color: "var(--text-heading)" }} className="text-xs font-bold uppercase tracking-wider">
              With {scenarios[0].withMomentum} LP you could buy
            </span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {buyableUpgrades.map((u) => (
              <span
                key={u.name}
                className="text-xs font-semibold rounded-md px-3 py-1.5"
                style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
              >
                {u.name}
                <span style={{ color: "var(--text-muted)" }} className="ml-1 font-normal">
                  lvl {u.maxAffordable}/{u.maxLevel}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Insight>
        Momentum tier jumps (especially Deep Run +50% and Legendary +150%) often provide more LP
        than dozens of extra races. Look at the &quot;LP Gain&quot; column to decide if pushing further is worth the
        pain of high fatigue.
      </Insight>
    </div>
  );
}
