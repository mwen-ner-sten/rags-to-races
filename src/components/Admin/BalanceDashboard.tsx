"use client";

import { useState } from "react";
import FatigueCurveChart from "./charts/FatigueCurveChart";
import PerformanceDecayChart from "./charts/PerformanceDecayChart";
import LpSimulator from "./charts/LpSimulator";
import RunEconomyChart from "./charts/RunEconomyChart";
import UpgradeCostChart from "./charts/UpgradeCostChart";
import PrestigeRoiTable from "./charts/PrestigeRoiTable";

const TABS = [
  { id: "fatigue", label: "Fatigue Curve" },
  { id: "decay", label: "Performance Decay" },
  { id: "lp", label: "LP Simulator" },
  { id: "economy", label: "Run Economy" },
  { id: "upgrades", label: "Upgrade Costs" },
  { id: "roi", label: "Prestige ROI" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BalanceDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("fatigue");

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: "var(--text-heading)" }} className="text-lg font-bold">
            Balance Visualizer
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-xs">
            Interactive charts for tuning prestige mechanics, fatigue curves, and game economy.
          </p>
        </div>
        <a
          href="/"
          style={{ color: "var(--accent)" }}
          className="text-xs underline hover:opacity-80"
        >
          Back to Game
        </a>
      </div>

      {/* Warning */}
      <div
        style={{ background: "rgba(196,180,58,.08)", borderColor: "rgba(196,180,58,.3)", color: "var(--warning)" }}
        className="rounded-lg border px-4 py-2 text-xs"
      >
        Dev-only balance analysis. These charts use the actual game formulas to project outcomes.
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={
              activeTab === tab.id
                ? { background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)" }
                : { borderColor: "var(--btn-border)", color: "var(--text-primary)", border: "1px solid" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
        className="rounded-lg border p-4"
      >
        {activeTab === "fatigue" && <FatigueCurveChart />}
        {activeTab === "decay" && <PerformanceDecayChart />}
        {activeTab === "lp" && <LpSimulator />}
        {activeTab === "economy" && <RunEconomyChart />}
        {activeTab === "upgrades" && <UpgradeCostChart />}
        {activeTab === "roi" && <PrestigeRoiTable />}
      </div>
    </div>
  );
}
