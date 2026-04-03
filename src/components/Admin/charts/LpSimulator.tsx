"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset, type Threshold } from "../MiniChart";
import { calculateLegacyPoints, type RunStats } from "@/engine/prestige";

function calcFatigue(races: number, offset: number): number {
  const effective = Math.max(0, races - offset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}

export default function LpSimulator() {
  const [scrap, setScrap] = useState(50000);
  const [circuitTier, setCircuitTier] = useState(2);
  const [workshopCount, setWorkshopCount] = useState(10);
  const [ironWill, setIronWill] = useState(0);

  const breakdownRaces = 150;

  // LP breakdown at a specific race count
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

    const scrapComp = Math.sqrt(stats.lifetimeScrapBucks / 100);
    const raceComp = Math.log2(1 + stats.lifetimeRaces / 10);
    const tierMult = 1 + stats.highestCircuitTier * 0.5;
    const fatigueFloor = Math.max(0.3, Math.min(1, stats.fatigue / 30));
    const workshopBonus = 1 + stats.workshopUpgradesBought * 0.05;
    const baseLp = calculateLegacyPoints(stats);

    return {
      scrapComp: scrapComp.toFixed(1),
      raceComp: raceComp.toFixed(1),
      tierMult: tierMult.toFixed(1),
      fatigueFloor: fatigueFloor.toFixed(2),
      workshopBonus: workshopBonus.toFixed(2),
      baseLp,
      deepRunLp: Math.floor(baseLp * 1.5),
      legendaryLp: Math.floor(baseLp * 2.5),
      fatigue,
    };
  }, [scrap, circuitTier, workshopCount, ironWill]);

  // LP vs races chart
  const datasets = useMemo<Dataset[]>(() => {
    const base: Dataset = { label: "Base LP", color: "#3b82f6", points: [] };
    const deepRun: Dataset = { label: "Deep Run (+50%)", color: "#f97316", points: [], dashed: true };
    const legendary: Dataset = { label: "Legendary (+150%)", color: "#ef4444", points: [], dashed: true };

    for (let r = 10; r <= 300; r += 3) {
      const fatigue = calcFatigue(r, ironWill * 5);
      const stats: RunStats = {
        lifetimeScrapBucks: scrap,
        lifetimeRaces: r,
        fatigue,
        repPoints: 0,
        highestCircuitTier: circuitTier,
        workshopUpgradesBought: workshopCount,
      };
      const lp = calculateLegacyPoints(stats);
      base.points.push({ x: r, y: lp });
      deepRun.points.push({ x: r, y: Math.floor(lp * 1.5) });
      legendary.points.push({ x: r, y: Math.floor(lp * 2.5) });
    }

    return [base, deepRun, legendary];
  }, [scrap, circuitTier, workshopCount, ironWill]);

  const thresholds = useMemo<Threshold[]>(() => {
    // Find race count where fatigue hits 60 and 80
    let deepRunRaces = 0;
    let legendaryRaces = 0;
    for (let r = 0; r <= 500; r++) {
      const f = calcFatigue(r, ironWill * 5);
      if (f >= 60 && deepRunRaces === 0) deepRunRaces = r;
      if (f >= 80 && legendaryRaces === 0) legendaryRaces = r;
    }
    return [
      { value: deepRunRaces, axis: "x" as const, color: "#f97316", label: `Deep Run (~${deepRunRaces} races)` },
      { value: legendaryRaces, axis: "x" as const, color: "#ef4444", label: `Legendary (~${legendaryRaces} races)` },
    ].filter(t => t.value > 0 && t.value <= 300);
  }, [ironWill]);

  const sliderStyle = "w-full";
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Lifetime Scrap: ${scrap.toLocaleString()}</label>
          <input type="range" min={1000} max={500000} step={1000} value={scrap} onChange={(e) => setScrap(Number(e.target.value))} className={sliderStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Circuit Tier: {circuitTier}</label>
          <input type="range" min={0} max={4} value={circuitTier} onChange={(e) => setCircuitTier(Number(e.target.value))} className={sliderStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Workshop Upgrades: {workshopCount}</label>
          <input type="range" min={0} max={30} value={workshopCount} onChange={(e) => setWorkshopCount(Number(e.target.value))} className={sliderStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Iron Will: {ironWill}</label>
          <input type="range" min={0} max={10} value={ironWill} onChange={(e) => setIronWill(Number(e.target.value))} className={sliderStyle} />
        </div>
      </div>

      <MiniChart datasets={datasets} xLabel="Races" yLabel="Legacy Points" thresholds={thresholds} height={340} />

      {/* Breakdown table */}
      <div style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }} className="rounded-lg border p-3">
        <p style={{ color: "var(--text-heading)" }} className="text-xs font-semibold uppercase tracking-wider mb-2">
          LP Breakdown at {breakdownRaces} races (fatigue {breakdown.fatigue})
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <Stat label="Scrap Component" value={breakdown.scrapComp} sub={`sqrt(${scrap.toLocaleString()}/100)`} />
          <Stat label="Race Component" value={breakdown.raceComp} sub={`log2(1 + ${breakdownRaces}/10) * 3`} />
          <Stat label="Tier Multiplier" value={`${breakdown.tierMult}x`} sub={`1 + tier ${circuitTier} * 0.5`} />
          <Stat label="Fatigue Floor" value={breakdown.fatigueFloor} sub={`max(0.3, fatigue/${30})`} />
          <Stat label="Workshop Bonus" value={`${breakdown.workshopBonus}x`} sub={`1 + ${workshopCount} * 0.05`} />
          <Stat label="Base LP" value={String(breakdown.baseLp)} accent />
        </div>
        <div style={{ borderColor: "var(--divider)" }} className="border-t mt-2 pt-2 grid grid-cols-3 gap-2 text-xs">
          <Stat label="Base" value={String(breakdown.baseLp)} />
          <Stat label="Deep Run (+50%)" value={String(breakdown.deepRunLp)} />
          <Stat label="Legendary (+150%)" value={String(breakdown.legendaryLp)} accent />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ color: "var(--text-muted)" }} className="text-xs">{label}</div>
      <div style={{ color: accent ? "var(--accent)" : "var(--text-white)" }} className="font-mono font-semibold">{value}</div>
      {sub && <div style={{ color: "var(--text-muted)" }} className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}
