"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset } from "../MiniChart";
import { calculateLegacyPoints } from "@/engine/prestige";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { ControlPanel, Slider, Insight, Formula } from "./ChartControls";
import type { GameSnapshot } from "./balanceUtils";

export default function LpSimulator({ snapshot }: { snapshot?: GameSnapshot }) {
  const [scrap, setScrap] = useState(Math.max(1000, snapshot?.lifetimeScrap ?? 50000));
  const [circuitTier, setCircuitTier] = useState(snapshot?.circuitTier ?? 2);
  const [rivals, setRivals] = useState(2);
  const datasets = useMemo<Dataset[]>(() => {
    const circuit = CIRCUIT_DEFINITIONS.find((c) => c.tier === circuitTier)!;
    const points = Array.from({ length: 101 }, (_, i) => {
      const earnedScrap = Math.round(scrap * 2 * i / 100);
      return { x: earnedScrap, y: calculateLegacyPoints({ earnedScrap,
        featureWins: { [circuit.id]: { feature: 1 } }, rivalCount: rivals,
        lifetimeScrapBucks: earnedScrap, lifetimeRaces: 0, fatigue: 0,
        highestCircuitTier: circuitTier, workshopUpgradesBought: 0 }) };
    });
    return [{ label: "Base LP before permanent bonuses", color: "#3b82f6", points, fill: true }];
  }, [scrap, circuitTier, rivals]);
  return <div className="flex flex-col gap-5">
    <ControlPanel>
      <Slider label="Run-earned Scrap Bucks" value={scrap} min={1000} max={500000} step={1000} badge={`$${scrap.toLocaleString()}`} onChange={setScrap} />
      <Slider label="Highest Feature won" value={circuitTier} min={0} max={6} badge={`T${circuitTier}`} onChange={setCircuitTier} />
      <Slider label="Unique rivals beaten this run" value={rivals} min={0} max={10} onChange={setRivals} />
    </ControlPanel>
    <MiniChart datasets={datasets} xLabel="Run-earned Scrap Bucks" yLabel="Legacy Points" height={380} />
    <Formula>Base LP = floor((20 + highest Feature reward + 8 × log2(1 + earned Scrap / 1000)) × (1 + 0.1 × unique rivals))</Formula>
    <Insight>Feature rewards by tier are 10, 20, 35, 60, 110, 165 and 240. Only the highest counts. Waiting, fatigue, starting grants and raw race counts add no reward. The reset screen includes your permanent bonuses and actual run history.</Insight>
  </div>;
}
