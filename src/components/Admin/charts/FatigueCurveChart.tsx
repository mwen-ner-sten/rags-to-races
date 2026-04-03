"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset, type Threshold } from "../MiniChart";

function calcFatigue(races: number, offset: number): number {
  const effective = Math.max(0, races - offset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}

const MAX_RACES = 300;
const STEP = 2;

export default function FatigueCurveChart() {
  const [ironWill, setIronWill] = useState(0);

  const datasets = useMemo<Dataset[]>(() => {
    const base: Dataset = {
      label: "Base (Iron Will 0)",
      color: "#ef4444",
      points: [],
    };
    const withIW: Dataset = {
      label: `Iron Will ${ironWill} (offset ${ironWill * 5})`,
      color: "#3b82f6",
      points: [],
      dashed: ironWill > 0,
    };

    for (let r = 0; r <= MAX_RACES; r += STEP) {
      base.points.push({ x: r, y: calcFatigue(r, 0) });
      if (ironWill > 0) {
        withIW.points.push({ x: r, y: calcFatigue(r, ironWill * 5) });
      }
    }

    return ironWill > 0 ? [base, withIW] : [base];
  }, [ironWill]);

  const thresholds = useMemo<Threshold[]>(() => [
    { value: 40, axis: "y", color: "#eab308", label: "Second Wind (40)" },
    { value: 60, axis: "y", color: "#f97316", label: "Deep Run (60)" },
    { value: 80, axis: "y", color: "#ef4444", label: "Legendary (80)" },
  ], []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <label style={{ color: "var(--text-muted)" }} className="text-xs font-semibold">
          Iron Will Level: {ironWill} (offset: {ironWill * 5} races)
        </label>
        <input
          type="range" min={0} max={10} value={ironWill}
          onChange={(e) => setIronWill(Number(e.target.value))}
          className="w-48"
        />
      </div>
      <MiniChart
        datasets={datasets}
        xLabel="Races"
        yLabel="Fatigue"
        thresholds={thresholds}
        height={340}
      />
      <div style={{ color: "var(--text-muted)" }} className="text-xs leading-relaxed">
        Fatigue = min(99, floor(25 * log2(1 + effectiveRaces / 25))).
        Horizontal lines mark momentum tier thresholds. Iron Will delays the curve by 5 races per level.
      </div>
    </div>
  );
}
