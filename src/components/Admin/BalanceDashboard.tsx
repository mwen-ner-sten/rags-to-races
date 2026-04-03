"use client";

import { useState, useCallback } from "react";
import FatigueCurveChart from "./charts/FatigueCurveChart";
import PerformanceDecayChart from "./charts/PerformanceDecayChart";
import LpSimulator from "./charts/LpSimulator";
import RunEconomyChart from "./charts/RunEconomyChart";
import UpgradeCostChart from "./charts/UpgradeCostChart";
import PrestigeRoiTable from "./charts/PrestigeRoiTable";
import { buildSnapshot, type GameSnapshot } from "./charts/balanceUtils";

const SECTION = "rounded-lg border p-4 flex flex-col gap-3";

const TABS = [
  { id: "fatigue", label: "Fatigue Curve", desc: "When does fatigue bite?" },
  { id: "decay", label: "Perf Decay", desc: "How fast does everything degrade?" },
  { id: "lp", label: "LP Sim", desc: "How much LP will I earn?" },
  { id: "economy", label: "Run Economy", desc: "When do I go broke?" },
  { id: "upgrades", label: "Costs", desc: "How fast do costs scale?" },
  { id: "roi", label: "ROI", desc: "Should I prestige now?" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BalanceDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("fatigue");
  const [snapshot, setSnapshot] = useState<GameSnapshot | undefined>();
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  const handleLoadState = useCallback(() => {
    setSnapshot(buildSnapshot());
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Chart sub-tabs + load button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
        <button
          onClick={handleLoadState}
          className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--accent-border)", color: "var(--accent)", border: "1px solid" }}
        >
          Load Current State
        </button>
      </div>

      {snapshot && (
        <p style={{ color: "var(--text-muted)" }} className="text-xs -mt-1">
          Loaded from current run. Adjust sliders to explore what-if scenarios.
        </p>
      )}

      {/* Active chart panel */}
      <div
        style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
        className={SECTION}
      >
        <div className="flex items-baseline justify-between mb-1">
          <p style={{ color: "var(--text-heading)" }} className="text-xs font-semibold uppercase tracking-wider">
            {currentTab.label}
          </p>
          <p style={{ color: "var(--text-muted)" }} className="text-xs">
            {currentTab.desc}
          </p>
        </div>

        {activeTab === "fatigue" && <FatigueCurveChart snapshot={snapshot} />}
        {activeTab === "decay" && <PerformanceDecayChart snapshot={snapshot} />}
        {activeTab === "lp" && <LpSimulator snapshot={snapshot} />}
        {activeTab === "economy" && <RunEconomyChart snapshot={snapshot} />}
        {activeTab === "upgrades" && <UpgradeCostChart />}
        {activeTab === "roi" && <PrestigeRoiTable snapshot={snapshot} />}
      </div>
    </div>
  );
}
