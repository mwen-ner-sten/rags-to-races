"use client";

import { useState, useMemo, useEffect } from "react";
import MiniChart, { type Dataset } from "../MiniChart";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { BASE_WEAR_PER_RACE, REPAIR_COST_BASE, REPAIR_COST_PER_POINT_PER_TIER } from "@/data/vehicles";
import { ControlPanel, Slider, Insight } from "./ChartControls";
import { calcFatigue, type GameSnapshot } from "./balanceUtils";

const MAX_RACES = 300;
const STEP = 2;

export default function RunEconomyChart({ snapshot }: { snapshot?: GameSnapshot }) {
  const [circuitIdx, setCircuitIdx] = useState(2);
  const [vehiclePerf, setVehiclePerf] = useState(40);
  const [vehicleTier, setVehicleTier] = useState(4);
  const [reliability, setReliability] = useState(60);
  const [scrapMultLevel, setScrapMultLevel] = useState(0);
  const [ironWill, setIronWill] = useState(0);

  useEffect(() => {
    if (!snapshot) return;
    setCircuitIdx(snapshot.circuitIdx);
    setVehiclePerf(snapshot.vehiclePerf);
    setVehicleTier(snapshot.vehicleTier);
    setReliability(snapshot.reliability);
    setScrapMultLevel(snapshot.scrapMultLevel);
    setIronWill(snapshot.ironWill);
  }, [snapshot]);

  const circuit = CIRCUIT_DEFINITIONS[circuitIdx];
  const scrapMult = 1 + scrapMultLevel * 0.2;

  const { datasets, crossoverRace } = useMemo(() => {
    const income: Dataset = { label: "Expected Income", color: "#22c55e", points: [], fill: true };
    const repairCost: Dataset = { label: "Repair Cost / Race", color: "#ef4444", points: [], fill: true };
    const net: Dataset = { label: "Net Income", color: "#3b82f6", points: [] };

    let crossoverRace = -1;

    for (let r = 0; r <= MAX_RACES; r += STEP) {
      const fatigue = calcFatigue(r, ironWill * 5);
      const fatigueMult = 1 - fatigue * 0.005;

      const effectivePerf = vehiclePerf * fatigueMult;
      const winChance = Math.min(0.95, Math.max(0.05, effectivePerf / (circuit.difficulty * 2)));
      const dnfChance = Math.max(0, 0.3 - reliability / 200);
      const lossChance = 1 - winChance - dnfChance;

      const winIncome = circuit.rewardBase * scrapMult;
      // Avg loss position multiplier: positions 2-8, mean of (6+5+4+3+2+1+0)/(7*8) = 0.375
      const lossIncome = circuit.rewardBase * 0.3 * 0.375 * scrapMult;
      const expectedIncome = winChance * winIncome + Math.max(0, lossChance) * lossIncome - circuit.entryFee;

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

  return (
    <div className="flex flex-col gap-5">
      <ControlPanel>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: "var(--text-muted)" }} className="text-xs font-medium">Circuit</span>
            <span
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              className="text-xs font-mono font-semibold rounded px-1.5 py-0.5"
            >
              T{circuit.tier}
            </span>
          </div>
          <select
            value={circuitIdx}
            onChange={(e) => setCircuitIdx(Number(e.target.value))}
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-white)" }}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none chart-slider"
          >
            {CIRCUIT_DEFINITIONS.map((c, i) => (
              <option key={c.id} value={i}>
                T{c.tier} {c.name} (${c.rewardBase} reward)
              </option>
            ))}
          </select>
        </div>
        <Slider label="Vehicle Performance" value={vehiclePerf} min={5} max={200} onChange={setVehiclePerf} />
        <Slider label="Vehicle Tier" value={vehicleTier} min={0} max={9} badge={`T${vehicleTier}`} onChange={setVehicleTier} />
        <Slider label="Reliability" value={reliability} min={10} max={100} onChange={setReliability} />
        <Slider label="Scrap Magnate" value={scrapMultLevel} min={0} max={10} badge={`+${scrapMultLevel * 20}%`} onChange={setScrapMultLevel} />
        <Slider label="Iron Will" value={ironWill} min={0} max={10} onChange={setIronWill} />
      </ControlPanel>

      <MiniChart datasets={datasets} xLabel="Races" yLabel="Scrap / Race" shadeNegative height={400} />

      {crossoverRace > 0 ? (
        <Insight variant="danger">
          Net income goes negative at ~<strong>{crossoverRace} races</strong>. This is the natural prestige wall:
          repair costs outpace race winnings due to fatigue-driven performance loss and cost inflation.
        </Insight>
      ) : (
        <Insight variant="success">
          Net income stays positive through {MAX_RACES} races with these settings.
          Fatigue may not be creating enough prestige pressure for this configuration.
        </Insight>
      )}
    </div>
  );
}
