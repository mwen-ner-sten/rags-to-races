"use client";

import { useMemo } from "react";
import MiniChart, { type Dataset } from "../MiniChart";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";

// Pick the most interesting upgrades to compare
const FEATURED_IDS = [
  "keen_eye",
  "pit_crew",
  "speed_dial",
  "reinforced_chassis",
  "budget_repairs",
  "deep_pockets",
  "enhancement_mastery",
];

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f97316", "#a855f7", "#eab308", "#ec4899"];

export default function UpgradeCostChart() {
  const datasets = useMemo<Dataset[]>(() => {
    return FEATURED_IDS.map((id, idx) => {
      const def = UPGRADE_DEFINITIONS.find((u) => u.id === id);
      if (!def) return { label: id, color: COLORS[idx], points: [] };

      const points: { x: number; y: number }[] = [];
      let cumulative = 0;
      for (let lvl = 1; lvl <= def.maxLevel; lvl++) {
        cumulative += Math.ceil(def.baseCost * Math.pow(def.costScaling, lvl - 1));
        points.push({ x: lvl, y: cumulative });
      }

      return {
        label: `${def.name} (${def.maxLevel}lvl, ${def.costScaling}x)`,
        color: COLORS[idx % COLORS.length],
        points,
      };
    }).filter((d) => d.points.length > 0);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <MiniChart
        datasets={datasets}
        xLabel="Upgrade Level"
        yLabel="Cumulative Cost (Scrap)"
        logScaleY
        height={360}
      />
      <div style={{ color: "var(--text-muted)" }} className="text-xs leading-relaxed">
        Log-scale Y axis. Each upgrade scales as baseCost * scaling^level.
        Steep curves (Pit Crew 3.0x, Deep Pockets 3.0x) create hard ceilings fast.
        Flatter curves (Budget Repairs 2.0x) are more accessible.
      </div>

      {/* Table of all upgrades for reference */}
      <details>
        <summary style={{ color: "var(--text-muted)" }} className="text-xs cursor-pointer">
          All workshop upgrade costs
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="text-xs w-full" style={{ color: "var(--text-secondary)" }}>
            <thead>
              <tr style={{ color: "var(--text-muted)" }}>
                <th className="text-left py-1 pr-3">Upgrade</th>
                <th className="text-right py-1 pr-3">Base</th>
                <th className="text-right py-1 pr-3">Scale</th>
                <th className="text-right py-1 pr-3">Max</th>
                <th className="text-right py-1">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {UPGRADE_DEFINITIONS.map((def) => {
                let total = 0;
                for (let l = 1; l <= def.maxLevel; l++) {
                  total += Math.ceil(def.baseCost * Math.pow(def.costScaling, l - 1));
                }
                return (
                  <tr key={def.id} style={{ borderColor: "var(--divider)" }} className="border-t">
                    <td className="py-1 pr-3">{def.name}</td>
                    <td className="text-right py-1 pr-3 font-mono">{def.baseCost}</td>
                    <td className="text-right py-1 pr-3 font-mono">{def.costScaling}x</td>
                    <td className="text-right py-1 pr-3 font-mono">{def.maxLevel}</td>
                    <td className="text-right py-1 font-mono">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
