"use client";

import { useState } from "react";
import FatigueCurveChart from "./charts/FatigueCurveChart";
import PerformanceDecayChart from "./charts/PerformanceDecayChart";
import LpSimulator from "./charts/LpSimulator";
import RunEconomyChart from "./charts/RunEconomyChart";
import UpgradeCostChart from "./charts/UpgradeCostChart";
import PrestigeRoiTable from "./charts/PrestigeRoiTable";

const TABS = [
  { id: "fatigue", label: "Fatigue Curve", desc: "When does fatigue bite?" },
  { id: "decay", label: "Perf Decay", desc: "How fast does everything degrade?" },
  { id: "lp", label: "LP Simulator", desc: "How much LP will I earn?" },
  { id: "economy", label: "Run Economy", desc: "When do I go broke?" },
  { id: "upgrades", label: "Upgrade Costs", desc: "How fast do costs scale?" },
  { id: "roi", label: "Prestige ROI", desc: "Should I prestige now?" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BalanceDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("fatigue");
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen" style={{ background: "var(--panel-bg)" }}>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ color: "var(--text-heading)" }} className="text-xl font-bold tracking-tight">
              Balance Visualizer
            </h1>
            <p style={{ color: "var(--text-muted)" }} className="text-sm mt-0.5">
              Interactive analysis of prestige mechanics, fatigue curves, and game economy
            </p>
          </div>
          <a
            href="/"
            style={{ borderColor: "var(--btn-border)", color: "var(--text-secondary)" }}
            className="rounded-lg border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80 whitespace-nowrap"
          >
            Back to Game
          </a>
        </div>

        {/* Tab bar */}
        <div
          style={{ background: "color-mix(in srgb, var(--panel-bg) 50%, transparent)", borderColor: "var(--panel-border)" }}
          className="rounded-xl border p-1.5 flex gap-1 flex-wrap"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-lg px-4 py-2 text-xs font-semibold transition-all flex-1 min-w-[100px]"
              style={
                activeTab === tab.id
                  ? { background: "var(--accent)", color: "var(--btn-primary-text)", boxShadow: `0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent)` }
                  : { color: "var(--text-muted)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div
          style={{ borderColor: "var(--panel-border)" }}
          className="rounded-xl border overflow-hidden"
        >
          {/* Panel header */}
          <div
            style={{ borderColor: "var(--divider)" }}
            className="border-b px-6 py-4 flex items-baseline justify-between"
          >
            <div>
              <h2 style={{ color: "var(--text-heading)" }} className="text-sm font-bold">
                {currentTab.label}
              </h2>
              <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">{currentTab.desc}</p>
            </div>
            <span
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              className="text-xs font-mono rounded-md px-2 py-0.5"
            >
              DEV
            </span>
          </div>

          {/* Panel body */}
          <div className="p-6">
            {activeTab === "fatigue" && <FatigueCurveChart />}
            {activeTab === "decay" && <PerformanceDecayChart />}
            {activeTab === "lp" && <LpSimulator />}
            {activeTab === "economy" && <RunEconomyChart />}
            {activeTab === "upgrades" && <UpgradeCostChart />}
            {activeTab === "roi" && <PrestigeRoiTable />}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: "var(--text-muted)" }} className="text-xs text-center opacity-50">
          Charts use actual game formulas. Adjust sliders to explore parameter space.
        </p>
      </div>
    </div>
  );
}
