"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset } from "../MiniChart";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { BASE_WEAR_PER_RACE, REPAIR_COST_BASE, REPAIR_COST_PER_POINT_PER_TIER } from "@/data/vehicles";

function calcFatigue(races: number, offset: number): number {
  const effective = Math.max(0, races - offset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}

const MAX_RACES = 300;
const STEP = 2;

export default function RunEconomyChart() {
  const [circuitIdx, setCircuitIdx] = useState(2);
  const [vehiclePerf, setVehiclePerf] = useState(40);
  const [vehicleTier, setVehicleTier] = useState(4);
  const [reliability, setReliability] = useState(60);
  const [scrapMultLevel, setScrapMultLevel] = useState(0);
  const [ironWill, setIronWill] = useState(0);

  const circuit = CIRCUIT_DEFINITIONS[circuitIdx];
  const scrapMult = 1 + scrapMultLevel * 0.2;

  const { datasets, crossoverRace } = useMemo(() => {
    const income: Dataset = { label: "Expected Income", color: "#22c55e", points: [] };
    const repairCost: Dataset = { label: "Repair Cost / Race", color: "#ef4444", points: [] };
    const net: Dataset = { label: "Net Income", color: "#3b82f6", points: [] };

    let crossoverRace = -1;

    for (let r = 0; r <= MAX_RACES; r += STEP) {
      const fatigue = calcFatigue(r, ironWill * 5);
      const fatigueMult = 1 - fatigue * 0.005;

      // Win chance
      const effectivePerf = vehiclePerf * fatigueMult;
      const winChance = Math.min(0.95, Math.max(0.05, effectivePerf / (circuit.difficulty * 2)));
      const dnfChance = Math.max(0, 0.3 - reliability / 200);
      const lossChance = 1 - winChance - dnfChance;

      // Expected income per race
      const winIncome = circuit.rewardBase * scrapMult;
      const lossIncome = circuit.rewardBase * 0.3 * 0.5 * scrapMult; // avg position ~4 → (8-4)/8 * 0.3
      const expectedIncome = winChance * winIncome + Math.max(0, lossChance) * lossIncome - circuit.entryFee;

      // Repair cost per race (wear * cost per point)
      const wear = BASE_WEAR_PER_RACE * (1 + fatigue * 0.008);
      const costPerPoint = REPAIR_COST_BASE + vehicleTier * REPAIR_COST_PER_POINT_PER_TIER;
      const repair = wear * costPerPoint * (1 + fatigue * 0.01);

      const netIncome = expectedIncome - repair;

      income.points.push({ x: r, y: expectedIncome });
      repairCost.points.push({ x: r, y: repair });
      net.points.push({ x: r, y: netIncome });

      if (crossoverRace === -1 && netIncome < 0) crossoverRace = r;
    }

    return { datasets: [income, repairCost, net], crossoverRace };
  }, [circuit, vehiclePerf, vehicleTier, reliability, scrapMult, ironWill]);

  const labelStyle = { color: "var(--text-muted)" };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Circuit: {circuit.name} (T{circuit.tier})</label>
          <select
            value={circuitIdx}
            onChange={(e) => setCircuitIdx(Number(e.target.value))}
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
            className="rounded border px-2 py-1 text-sm"
          >
            {CIRCUIT_DEFINITIONS.map((c, i) => (
              <option key={c.id} value={i}>T{c.tier} {c.name} (reward: ${c.rewardBase})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Vehicle Performance: {vehiclePerf}</label>
          <input type="range" min={5} max={200} value={vehiclePerf} onChange={(e) => setVehiclePerf(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Vehicle Tier: {vehicleTier}</label>
          <input type="range" min={0} max={9} value={vehicleTier} onChange={(e) => setVehicleTier(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Reliability: {reliability}</label>
          <input type="range" min={10} max={100} value={reliability} onChange={(e) => setReliability(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Scrap Magnate Level: {scrapMultLevel} (+{(scrapMultLevel * 20)}%)</label>
          <input type="range" min={0} max={10} value={scrapMultLevel} onChange={(e) => setScrapMultLevel(Number(e.target.value))} className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label style={labelStyle} className="text-xs font-semibold">Iron Will: {ironWill}</label>
          <input type="range" min={0} max={10} value={ironWill} onChange={(e) => setIronWill(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      <MiniChart datasets={datasets} xLabel="Races" yLabel="Scrap / Race" shadeNegative height={360} />

      {crossoverRace > 0 ? (
        <div style={{ background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.3)", color: "var(--danger)" }} className="rounded-lg border px-3 py-2 text-xs">
          Net income goes negative at ~{crossoverRace} races. This is the natural prestige wall for this configuration.
        </div>
      ) : (
        <div style={{ background: "rgba(34,197,94,.08)", borderColor: "rgba(34,197,94,.3)", color: "var(--success)" }} className="rounded-lg border px-3 py-2 text-xs">
          Net income stays positive through {MAX_RACES} races. Fatigue may not be creating enough pressure here.
        </div>
      )}
    </div>
  );
}
