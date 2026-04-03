"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset, type Threshold } from "../MiniChart";
import { calculateLegacyPoints, type RunStats } from "@/engine/prestige";
import { ControlPanel, Slider, Insight, Formula } from "./ChartControls";
import { calcFatigue } from "./balanceUtils";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";

/** Sum LP multiplier from momentum tiers active at a given fatigue level */
function lpMultAtFatigue(fatigue: number): number {
  return MOMENTUM_TIERS
    .filter((t) => t.effect.type === "lp_multiplier" && t.condition.type === "fatigue_gte" && fatigue >= t.condition.value)
    .reduce((sum, t) => sum + t.effect.value, 0);
}

// Derive the fatigue thresholds and names for the two LP-boosting tiers
const LP_TIERS = MOMENTUM_TIERS
  .filter((t) => t.effect.type === "lp_multiplier" && t.condition.type === "fatigue_gte")
  .sort((a, b) => a.condition.value - b.condition.value);
const DEEP_RUN_FATIGUE = LP_TIERS[0]?.condition.value ?? 60;
const LEGENDARY_FATIGUE = LP_TIERS[1]?.condition.value ?? 80;
const DEEP_RUN_MULT = 1 + lpMultAtFatigue(DEEP_RUN_FATIGUE);
const LEGENDARY_MULT = 1 + lpMultAtFatigue(LEGENDARY_FATIGUE);

export default function LpSimulator() {
  const [scrap, setScrap] = useState(50000);
  const [circuitTier, setCircuitTier] = useState(2);
  const [workshopCount, setWorkshopCount] = useState(10);
  const [ironWill, setIronWill] = useState(0);

  const breakdownRaces = 150;

  const breakdown = useMemo(() => {
    const fatigue = calcFatigue(breakdownRaces, ironWill * 5);
    const stats: RunStats = {
      lifetimeScrapBucks: scrap,
      lifetimeRaces: breakdownRaces,
      fatigue,
      repPoints: 0,
      highestCircuitTier: circuitTier,
      workshopUpgradesBought: workshopCount,
    };

    // Sub-components mirrored from calculateLegacyPoints (src/engine/prestige.ts)
    // for breakdown display. Keep in sync if the LP formula changes.
    const scrapComp = Math.sqrt(stats.lifetimeScrapBucks / 100);
    const raceComp = Math.log2(1 + stats.lifetimeRaces / 10);
    const tierMult = 1 + stats.highestCircuitTier * 0.5;
    const fatigueFloor = Math.max(0.3, Math.min(1, stats.fatigue / 30));
    const workshopBonus = 1 + stats.workshopUpgradesBought * 0.05;
    const baseLp = calculateLegacyPoints(stats);

    return { scrapComp, raceComp, tierMult, fatigueFloor, workshopBonus, baseLp, fatigue,
      deepRunLp: Math.floor(baseLp * DEEP_RUN_MULT),
      legendaryLp: Math.floor(baseLp * LEGENDARY_MULT),
    };
  }, [scrap, circuitTier, workshopCount, ironWill]);

  const datasets = useMemo<Dataset[]>(() => {
    const drPct = Math.round((DEEP_RUN_MULT - 1) * 100);
    const lgPct = Math.round((LEGENDARY_MULT - 1) * 100);
    const base: Dataset = { label: "Base LP", color: "#3b82f6", points: [], fill: true };
    const deepRun: Dataset = { label: `Deep Run (+${drPct}%)`, color: "#f97316", points: [], dashed: true };
    const legendary: Dataset = { label: `Legendary (+${lgPct}%)`, color: "#ef4444", points: [], dashed: true };

    for (let r = 10; r <= 300; r += 3) {
      const fatigue = calcFatigue(r, ironWill * 5);
      const stats: RunStats = {
        lifetimeScrapBucks: scrap, lifetimeRaces: r, fatigue,
        repPoints: 0, highestCircuitTier: circuitTier, workshopUpgradesBought: workshopCount,
      };
      const lp = calculateLegacyPoints(stats);
      base.points.push({ x: r, y: lp });
      deepRun.points.push({ x: r, y: Math.floor(lp * DEEP_RUN_MULT) });
      legendary.points.push({ x: r, y: Math.floor(lp * LEGENDARY_MULT) });
    }
    return [base, deepRun, legendary];
  }, [scrap, circuitTier, workshopCount, ironWill]);

  const thresholds = useMemo<Threshold[]>(() => {
    let dr = 0, lg = 0;
    for (let r = 0; r <= 500; r++) {
      const f = calcFatigue(r, ironWill * 5);
      if (f >= DEEP_RUN_FATIGUE && !dr) dr = r;
      if (f >= LEGENDARY_FATIGUE && !lg) lg = r;
    }
    return [
      dr > 0 && dr <= 300 ? { value: dr, axis: "x" as const, color: "#f97316", label: `Deep Run (~${dr})` } : null,
      lg > 0 && lg <= 300 ? { value: lg, axis: "x" as const, color: "#ef4444", label: `Legendary (~${lg})` } : null,
    ].filter(Boolean) as Threshold[];
  }, [ironWill]);

  return (
    <div className="flex flex-col gap-5">
      <ControlPanel>
        <Slider label="Lifetime Scrap" value={scrap} min={1000} max={500000} step={1000} badge={`$${scrap.toLocaleString()}`} onChange={setScrap} />
        <Slider label="Circuit Tier" value={circuitTier} min={0} max={4} badge={`T${circuitTier}`} onChange={setCircuitTier} />
        <Slider label="Workshop Upgrades" value={workshopCount} min={0} max={30} onChange={setWorkshopCount} />
        <Slider label="Iron Will Level" value={ironWill} min={0} max={10} onChange={setIronWill} />
      </ControlPanel>

      <MiniChart datasets={datasets} xLabel="Races" yLabel="Legacy Points" thresholds={thresholds} height={380} />

      {/* LP Breakdown */}
      <div
        style={{ borderColor: "var(--divider)" }}
        className="rounded-lg border overflow-hidden"
      >
        <div
          style={{ borderColor: "var(--divider)" }}
          className="border-b px-4 py-2.5 flex items-center justify-between"
        >
          <span style={{ color: "var(--text-heading)" }} className="text-xs font-bold uppercase tracking-wider">
            Breakdown at {breakdownRaces} races
          </span>
          <span style={{ color: "var(--text-muted)" }} className="text-xs font-mono">fatigue {breakdown.fatigue}</span>
        </div>
        <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { label: "Scrap", value: breakdown.scrapComp.toFixed(1), sub: "sqrt(scrap/100)" },
            { label: "Races", value: breakdown.raceComp.toFixed(1), sub: "log2 * 3" },
            { label: "Tier", value: `${breakdown.tierMult.toFixed(1)}x`, sub: `tier ${circuitTier}` },
            { label: "Fatigue Floor", value: breakdown.fatigueFloor.toFixed(2), sub: "min 0.3" },
            { label: "Workshop", value: `${breakdown.workshopBonus.toFixed(2)}x`, sub: `${workshopCount} bought` },
            { label: "Base LP", value: String(breakdown.baseLp), accent: true },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div style={{ color: "var(--text-muted)" }} className="text-xs mb-0.5">{s.label}</div>
              <div
                style={{ color: s.accent ? "var(--accent)" : "var(--text-white)" }}
                className="font-mono font-bold text-sm"
              >
                {s.value}
              </div>
              {s.sub && <div style={{ color: "var(--text-muted)" }} className="text-xs opacity-50 mt-0.5">{s.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ borderColor: "var(--divider)" }} className="border-t px-4 py-3 flex justify-around">
          {[
            { label: "Base", value: breakdown.baseLp, color: "#3b82f6" },
            { label: `Deep Run (+${Math.round((DEEP_RUN_MULT - 1) * 100)}%)`, value: breakdown.deepRunLp, color: "#f97316" },
            { label: `Legendary (+${Math.round((LEGENDARY_MULT - 1) * 100)}%)`, value: breakdown.legendaryLp, color: "#ef4444" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div style={{ color: "var(--text-muted)" }} className="text-xs">{m.label}</div>
              <div className="font-mono font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <Formula>
        LP = (sqrt(scrap/100) + log2(1+races/10)*3) * tierMult * fatigueFloor * workshopBonus
      </Formula>

      <Insight>
        The fatigue floor penalizes early prestige (below ~50 races). Race component has heavy diminishing returns
        via log2. Pushing to Deep Run or Legendary thresholds gives massive LP multipliers that outweigh the
        penalty of continued fatigue.
      </Insight>
    </div>
  );
}
