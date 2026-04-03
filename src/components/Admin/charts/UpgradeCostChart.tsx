"use client";

import { useMemo } from "react";
import MiniChart, { type Dataset } from "../MiniChart";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { Insight } from "./ChartControls";

const FEATURED_IDS = [
  "keen_eye", "pit_crew", "speed_dial", "reinforced_chassis",
  "budget_repairs", "deep_pockets", "enhancement_mastery",
];

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f97316", "#a855f7", "#eab308", "#ec4899"];

export default function UpgradeCostChart() {
  const upgradeRows = useMemo(() => {
    return UPGRADE_DEFINITIONS.map((def) => {
      let total = 0;
      for (let l = 1; l <= def.maxLevel; l++) {
        total += Math.ceil(def.baseCost * Math.pow(def.costScaling, l - 1));
      }
      return { def, total, isFeatured: FEATURED_IDS.includes(def.id) };
    });
  }, []);

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
        label: `${def.name} (${def.costScaling}x)`,
        color: COLORS[idx % COLORS.length],
        points,
      };
    }).filter((d) => d.points.length > 0);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <MiniChart
        datasets={datasets}
        xLabel="Upgrade Level"
        yLabel="Cumulative Cost (Scrap)"
        logScaleY
        height={400}
      />

      <Insight>
        Log-scale Y axis. Upgrades with 3.0x scaling (Pit Crew, Deep Pockets) create hard cost ceilings.
        Flatter curves like Budget Repairs (2.0x) remain accessible longer. The spread between 2.0x and 3.0x
        scaling is enormous at higher levels.
      </Insight>

      {/* Table */}
      <details>
        <summary
          style={{ color: "var(--accent)" }}
          className="text-xs cursor-pointer font-semibold hover:opacity-80 transition-opacity"
        >
          View all workshop upgrade costs
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--divider)" }}>
          <table className="text-xs w-full">
            <thead>
              <tr style={{ color: "var(--text-muted)", borderColor: "var(--divider)" }} className="border-b">
                <th className="text-left py-2.5 px-3 font-medium">Upgrade</th>
                <th className="text-left py-2.5 px-3 font-medium">Category</th>
                <th className="text-right py-2.5 px-3 font-medium">Base</th>
                <th className="text-right py-2.5 px-3 font-medium">Scale</th>
                <th className="text-right py-2.5 px-3 font-medium">Max Lvl</th>
                <th className="text-right py-2.5 px-3 font-medium">Total Cost</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-secondary)" }}>
              {upgradeRows.map(({ def, total, isFeatured }) => (
                  <tr
                    key={def.id}
                    style={{ borderColor: "var(--divider)", background: isFeatured ? "color-mix(in srgb, var(--accent) 4%, transparent)" : undefined }}
                    className="border-t"
                  >
                    <td className="py-2 px-3 font-semibold" style={isFeatured ? { color: "var(--text-white)" } : undefined}>
                      {def.name}
                    </td>
                    <td className="py-2 px-3 capitalize" style={{ color: "var(--text-muted)" }}>{def.category.replace("_", " ")}</td>
                    <td className="text-right py-2 px-3 font-mono">{def.baseCost}</td>
                    <td className="text-right py-2 px-3 font-mono">
                      <span style={{ color: def.costScaling >= 3 ? "var(--danger)" : def.costScaling >= 2.5 ? "var(--warning)" : undefined }}>
                        {def.costScaling}x
                      </span>
                    </td>
                    <td className="text-right py-2 px-3 font-mono">{def.maxLevel}</td>
                    <td className="text-right py-2 px-3 font-mono font-semibold">{total.toLocaleString()}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
