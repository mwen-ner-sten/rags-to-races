"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset, type Threshold } from "../MiniChart";
import { ControlPanel, Slider, Insight, Formula } from "./ChartControls";
import { calcFatigue } from "./balanceUtils";

const MAX_RACES = 300;
const STEP = 2;

export default function FatigueCurveChart() {
  const [ironWill, setIronWill] = useState(0);

  const datasets = useMemo<Dataset[]>(() => {
    const base: Dataset = {
      label: "Base Fatigue",
      color: "#ef4444",
      points: [],
      fill: true,
    };
    const withIW: Dataset = {
      label: `Iron Will ${ironWill} (${ironWill * 5} race offset)`,
      color: "#3b82f6",
      points: [],
      fill: true,
    };

    for (let r = 0; r <= MAX_RACES; r += STEP) {
      base.points.push({ x: r, y: calcFatigue(r, 0) });
      if (ironWill > 0) {
        withIW.points.push({ x: r, y: calcFatigue(r, ironWill * 5) });
      }
    }

    return ironWill > 0 ? [base, withIW] : [base];
  }, [ironWill]);

  const thresholds = useMemo<Threshold[]>(
    () => [
      { value: 40, axis: "y", color: "#eab308", label: "Second Wind (40)" },
      { value: 60, axis: "y", color: "#f97316", label: "Deep Run (60)" },
      { value: 80, axis: "y", color: "#ef4444", label: "Legendary (80)" },
    ],
    [],
  );

  // Key milestones
  const milestones = useMemo(() => {
    const offset = ironWill * 5;
    const find = (target: number) => {
      for (let r = 0; r <= 500; r++) {
        if (calcFatigue(r, offset) >= target) return r;
      }
      return null;
    };
    return {
      secondWind: find(40),
      deepRun: find(60),
      legendary: find(80),
    };
  }, [ironWill]);

  return (
    <div className="flex flex-col gap-5">
      <ControlPanel>
        <Slider
          label="Iron Will Level"
          value={ironWill}
          min={0}
          max={10}
          badge={`${ironWill} (${ironWill * 5} offset)`}
          onChange={setIronWill}
        />
        <div className="flex flex-col gap-1 col-span-2 lg:col-span-2">
          <span style={{ color: "var(--text-muted)" }} className="text-xs font-medium">
            Milestone Races
          </span>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Second Wind", val: milestones.secondWind, color: "#eab308" },
              { label: "Deep Run", val: milestones.deepRun, color: "#f97316" },
              { label: "Legendary", val: milestones.legendary, color: "#ef4444" },
            ].map((m) => (
              <span
                key={m.label}
                className="text-xs font-mono rounded-md px-2 py-1"
                style={{ background: `color-mix(in srgb, ${m.color} 12%, transparent)`, color: m.color }}
              >
                {m.label}: {m.val ?? "500+"} races
              </span>
            ))}
          </div>
        </div>
      </ControlPanel>

      <MiniChart datasets={datasets} xLabel="Races" yLabel="Fatigue Level" thresholds={thresholds} height={380} />

      <div className="flex flex-col gap-2">
        <Formula>fatigue = min(99, floor(25 * log2(1 + effectiveRaces / 25)))</Formula>
        <Insight>
          Fatigue ramps steeply in the first 50 races (0 to ~32), then flattens.
          Iron Will delays the curve by 5 races per level, pushing momentum tier thresholds further out.
        </Insight>
      </div>
    </div>
  );
}
