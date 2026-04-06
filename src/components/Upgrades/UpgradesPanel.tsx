"use client";

import { useState } from "react";
import WorkshopPanel from "@/components/Workshop/WorkshopPanel";
import LegacyShop from "@/components/Shop/LegacyShop";
import PrestigeSubTab from "./PrestigeSubTab";

type UpgradeSubTab = "workshop" | "legacy" | "prestige";

const TABS: { id: UpgradeSubTab; label: string }[] = [
  { id: "workshop", label: "Workshop" },
  { id: "legacy",   label: "Legacy" },
  { id: "prestige", label: "Prestige" },
];

export default function UpgradesPanel() {
  const [activeTab, setActiveTab] = useState<UpgradeSubTab>("workshop");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-tutorial={tab.id === "prestige" ? "prestige-subtab-btn" : undefined}
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

      {activeTab === "workshop" && <WorkshopPanel />}
      {activeTab === "legacy"   && <LegacyShop />}
      {activeTab === "prestige" && <PrestigeSubTab />}
    </div>
  );
}
