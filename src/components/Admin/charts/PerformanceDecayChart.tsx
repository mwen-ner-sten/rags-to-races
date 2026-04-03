"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset, type Threshold } from "../MiniChart";

function calcFatigue(races: number, offset: number): number {
  const effective = Math.max(0, races - offset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}

const MAX_RACES = 300;
const STEP = 2;

export default function PerformanceDecayChart() {
  const [secondWind, setSecondWind] = useState(false);
  const [ironWill, setIronWill] = useState(0);

  const datasets = useMemo<Dataset[]>(() => {
    const perf: Dataset = { label: "Performance", color: "#3b82f6", points: [] };
    const repair: Dataset = { label: "Repair Cost", color: "#ef4444", points: [] };
    const wear: Dataset = { label: "Wear Rate", color: "#f97316", points: [] };
    const scav: Dataset = { label: "Scavenge Penalty", color: "#a855f7", points: [] };

    for (let r = 0; r <= MAX_RACES; r += STEP) {
      let fatigue = calcFatigue(r, ironWill * 5);
      // Second Wind reduces fatigue penalties by 15% when active (fatigue >= 40)
      const sw = secondWind && fatigue >= 40 ? 0.85 : 1;

      perf.points.push({ x: r, y: 1 - fatigue * 0.005 * sw });
      repair.points.push({ x: r, y: 1 + fatigue * 0.01 * sw });
      wear.points.push({ x: r, y: 1 + fatigue * 0.008 * sw });
      scav.points.push({ x: r, y: fatigue * 0.005 * sw });
    }

    return [perf, repair, wear, scav];
  }, [secondWind, ironWill]);

  const thresholds = useMemo<Threshold[]>(() => [
    { value: 1, axis: "y", color: "var(--text-muted)", label: "Baseline" },
  ], []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-6 flex-wrap">
        <label style={{ color: "var(--text-muted)" }} className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={secondWind} onChange={(e) => setSecondWind(e.target.checked)} />
          Second Wind (-15% penalties at fatigue 40+)
        </label>
        <label style={{ color: "var(--text-muted)" }} className="text-xs font-semibold">
          Iron Will: {ironWill}
          <input type="range" min={0} max={10} value={ironWill} onChange={(e) => setIronWill(Number(e.target.value))} className="w-32 ml-2" />
        </label>
      </div>
      <MiniChart
        datasets={datasets}
        xLabel="Races"
        yLabel="Multiplier"
        thresholds={thresholds}
        height={340}
      />
      <div style={{ color: "var(--text-muted)" }} className="text-xs leading-relaxed">
        Performance drops below 1.0 (bad), while repair cost and wear rise above 1.0 (also bad).
        At fatigue 50: performance is 0.75x, repairs cost 1.5x, wear is 1.4x, scavenge penalty is 0.25.
      </div>
    </div>
  );
}
