"use client";

import { useState } from "react";
import { useGameStore } from "@/state/store";
import LegacyShop from "@/components/Shop/LegacyShop";
import PrestigeSubTab from "./PrestigeSubTab";
import TeamSubTab from "./TeamSubTab";
import OwnerSubTab from "./OwnerSubTab";
import TrackSubTab from "./TrackSubTab";
import AchievementsSubTab from "./AchievementsSubTab";
import { isFeatureAvailable } from "@/config/features";

type UpgradeSubTab = "legacy" | "prestige" | "trophies" | "team" | "owner" | "track";

export default function UpgradesPanel() {
  const [activeTab, setActiveTab] = useState<UpgradeSubTab>("legacy");
  const unlockedFeatures = useGameStore((s) => s.unlockedFeatures);
  const teamEraCount = useGameStore((s) => s.teamEraCount);
  const ownerEraCount = useGameStore((s) => s.ownerEraCount);
  const trackEraCount = useGameStore((s) => s.trackEraCount);

  const TABS: { id: UpgradeSubTab; label: string; show: boolean }[] = [
    { id: "legacy",    label: "Legacy", show: true },
    { id: "prestige",  label: "Scrap Reset", show: true },
    { id: "trophies",  label: "Trophies", show: true },
    { id: "team",      label: "Team", show: isFeatureAvailable("crew_system") && (teamEraCount > 0 || unlockedFeatures.includes("crew_system")) },
    { id: "owner",     label: "Owner", show: isFeatureAvailable("advanced_circuits") && ownerEraCount > 0 },
    { id: "track",     label: "Track", show: isFeatureAvailable("track_customization") && trackEraCount > 0 },
  ];

  const visibleTabs = TABS.filter((t) => t.show);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            data-tutorial={tab.id === "prestige" ? "prestige-subtab-btn" : undefined}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "bg-cyan-400 text-black"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "legacy"   && <LegacyShop />}
      {activeTab === "prestige"  && <PrestigeSubTab />}
      {activeTab === "trophies"  && <AchievementsSubTab />}
      {activeTab === "team"      && <TeamSubTab />}
      {activeTab === "owner"    && <OwnerSubTab />}
      {activeTab === "track"    && <TrackSubTab />}
    </div>
  );
}
