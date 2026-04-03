"use client";

import { useState, useMemo } from "react";
import MiniChart, { type Dataset, type Threshold } from "../MiniChart";
import { ControlPanel, Slider, Toggle, Insight } from "./ChartControls";
import { calcFatigue } from "./balanceUtils";

const MAX_RACES = 300;
const STEP = 2;

export default function PerformanceDecayChart() {
  const [secondWind, setSecondWind] = useState(false);
  const [ironWill, setIronWill] = useState(0);

  const datasets = useMemo<Dataset[]>(() => {
    const perf: Dataset = { label: "Performance", color: "#3b82f6", points: [], fill: true };
    const repair: Dataset = { label: "Repair Cost", color: "#ef4444", points: [] };
    const wear: Dataset = { label: "Wear Rate", color: "#f97316", points: [] };
    const scav: Dataset = { label: "Scavenge Penalty", color: "#a855f7", points: [], dashed: true };

    for (let r = 0; r <= MAX_RACES; r += STEP) {
      const fatigue = calcFatigue(r, ironWill * 5);
      const sw = secondWind && fatigue >= 40 ? 0.85 : 1;

      perf.points.push({ x: r, y: 1 - fatigue * 0.005 * sw });
      repair.points.push({ x: r, y: 1 + fatigue * 0.01 * sw });
      wear.points.push({ x: r, y: 1 + fatigue * 0.008 * sw });
      scav.points.push({ x: r, y: fatigue * 0.005 * sw });
    }

    return [perf, repair, wear, scav];
  }, [secondWind, ironWill]);

  const thresholds = useMemo<Threshold[]>(
    () => [{ value: 1, axis: "y", color: "var(--text-muted)", label: "Baseline (1.0)" }],
    [],
  );

  // Snapshot values at key fatigue levels
  const snapshots = useMemo(() => {
    return [30, 50, 70, 90].map((f) => {
      const sw = secondWind && f >= 40 ? 0.85 : 1;
      return {
        fatigue: f,
        perf: (1 - f * 0.005 * sw).toFixed(2),
        repair: (1 + f * 0.01 * sw).toFixed(2),
        wear: (1 + f * 0.008 * sw).toFixed(2),
      };
    });
  }, [secondWind]);

  return (
    <div className="flex flex-col gap-5">
      <ControlPanel>
        <Slider label="Iron Will Level" value={ironWill} min={0} max={10} onChange={setIronWill} />
        <div className="flex items-end pb-1">
          <Toggle label="Second Wind (-15% penalties at fatigue 40+)" checked={secondWind} onChange={setSecondWind} />
        </div>
      </ControlPanel>

      <MiniChart datasets={datasets} xLabel="Races" yLabel="Multiplier" thresholds={thresholds} height={380} />

      {/* Snapshot table */}
      <div className="overflow-x-auto">
        <table className="text-xs w-full" style={{ color: "var(--text-secondary)" }}>
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="text-left py-2 pr-4 font-medium">Fatigue</th>
              <th className="text-right py-2 pr-4 font-medium">Performance</th>
              <th className="text-right py-2 pr-4 font-medium">Repair Cost</th>
              <th className="text-right py-2 font-medium">Wear Rate</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.fatigue} style={{ borderColor: "var(--divider)" }} className="border-t">
                <td className="py-1.5 pr-4 font-mono font-semibold">{s.fatigue}</td>
                <td className="text-right py-1.5 pr-4 font-mono" style={{ color: "#3b82f6" }}>{s.perf}x</td>
                <td className="text-right py-1.5 pr-4 font-mono" style={{ color: "#ef4444" }}>{s.repair}x</td>
                <td className="text-right py-1.5 font-mono" style={{ color: "#f97316" }}>{s.wear}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Insight>
        Performance drops below 1.0 while costs rise above. The lines cross around fatigue 50-60, meaning
        your effective output halves while expenses double. Second Wind softens this by 15% after fatigue 40.
      </Insight>
    </div>
  );
}
