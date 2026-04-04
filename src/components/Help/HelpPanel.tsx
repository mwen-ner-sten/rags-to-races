"use client";

import { useState } from "react";
import HelpBasicsTab from "./HelpBasicsTab";
import HelpSystemsTab from "./HelpSystemsTab";
import HelpStrategyTab from "./HelpStrategyTab";
import HelpProgressionTab from "./HelpProgressionTab";
import HelpReferenceTab from "./HelpReferenceTab";
import BalanceDashboard from "@/components/Admin/BalanceDashboard";
import HelpActivityTab from "./HelpActivityTab";

type HelpTab = "basics" | "systems" | "strategy" | "progression" | "reference" | "simulators" | "activity";

const TABS: { id: HelpTab; label: string }[] = [
  { id: "basics",      label: "Basics" },
  { id: "systems",     label: "Systems" },
  { id: "strategy",    label: "Strategy" },
  { id: "progression", label: "Progression" },
  { id: "reference",   label: "Reference" },
  { id: "simulators",  label: "Simulators" },
  { id: "activity",    label: "Activity" },
];

export default function HelpPanel() {
  const [activeTab, setActiveTab] = useState<HelpTab>("basics");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "bg-orange-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "basics"      && <HelpBasicsTab />}
      {activeTab === "systems"     && <HelpSystemsTab />}
      {activeTab === "strategy"    && <HelpStrategyTab />}
      {activeTab === "progression" && <HelpProgressionTab />}
      {activeTab === "reference"   && <HelpReferenceTab />}
      {activeTab === "simulators"  && <BalanceDashboard />}
      {activeTab === "activity"    && <HelpActivityTab />}
    </div>
  );
}
