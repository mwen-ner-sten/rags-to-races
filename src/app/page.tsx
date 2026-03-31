"use client";

import { useState, useEffect, useRef } from "react";
import ThemeShell from "@/components/ThemeShell";
import ScavengePanel from "@/components/Junkyard/ScavengePanel";
import GaragePanel from "@/components/Garage/GaragePanel";
import RacePanel from "@/components/RaceTrack/RacePanel";
import ShopPanel from "@/components/Shop/ShopPanel";
import AdminPanel from "@/components/Admin/AdminPanel";
import WorkshopPanel from "@/components/Workshop/WorkshopPanel";
import CommunityPanel from "@/components/Community/CommunityPanel";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import ToastContainer from "@/components/effects/Toast";
import { useGameStore } from "@/state/store";
import { computeTick, TICK_MS } from "@/engine/tick";

type TabId = "junkyard" | "garage" | "race" | "community" | "workshop" | "shop" | "settings" | "dev";
const FEATURE_REQUIREMENTS: Record<TabId, string> = {
  junkyard: "Finish the intro story.",
  garage: "Scavenge at least one part.",
  race: "Build your first vehicle in the Garage.",
  community: "Reach 5 Rep.",
  workshop: "Build your first vehicle in the Garage.",
  shop: "Finish the intro story.",
  settings: "Finish the intro story.",
  dev: "Developer tools are hidden in normal progression.",
};
const FEATURE_LABELS: Record<TabId, string> = {
  junkyard: "Junkyard",
  garage: "Garage",
  race: "Race",
  community: "Community",
  workshop: "Workshop",
  shop: "Shop",
  settings: "Settings",
  dev: "Dev",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const introCompleted = useGameStore((s) => s.introCompleted);
  const unlockedFeatureIds = useGameStore((s) => s.unlockedFeatureIds);
  const completeIntro = useGameStore((s) => s.completeIntro);
  const storeRef = useRef(useGameStore.getState());
  const previousUnlockedRef = useRef<string[]>(unlockedFeatureIds);

  // Keep storeRef in sync without triggering re-renders
  useEffect(() => {
    return useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  // Game tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      const state = storeRef.current;
      const result = computeTick(state);
      if (
        result.partsFound.length > 0 ||
        result.scrapsEarned !== 0 ||
        result.repEarned !== 0 ||
        result.vehicleWearAmount !== 0 ||
        result.vehicleRepairAmount !== 0
      ) {
        applyTickResult(result.partsFound, result.scrapsEarned, result.repEarned, result.vehicleWearAmount, result.vehicleRepairAmount);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [applyTickResult]);

  const handleSetActiveTab = (tab: TabId): void => {
    if (unlockedFeatureIds.includes(tab) || tab === "dev") {
      setActiveTab(tab);
      setLockMessage(null);
      return;
    }
    setLockMessage(`${tab.toUpperCase()} is locked — ${FEATURE_REQUIREMENTS[tab]}`);
  };

  useEffect(() => {
    const previous = previousUnlockedRef.current;
    const newlyUnlocked = unlockedFeatureIds.filter((id) => !previous.includes(id));
    previousUnlockedRef.current = unlockedFeatureIds;
    if (newlyUnlocked.length === 0) return;
    const newest = newlyUnlocked[newlyUnlocked.length - 1] as TabId;
    if (newest in FEATURE_LABELS) {
      setLockMessage(`${FEATURE_LABELS[newest]} is now unlocked!`);
    }
  }, [unlockedFeatureIds]);
  useEffect(() => {
    if (!introCompleted) completeIntro();
  }, [introCompleted, completeIntro]);

  return (
    <>
      <ToastContainer />
      <ThemeShell activeTab={activeTab} setActiveTab={handleSetActiveTab}>
        {lockMessage && (
          <div className="mb-4 rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {lockMessage}
          </div>
        )}
        {activeTab === "junkyard" && <ScavengePanel />}
        {activeTab === "garage"   && <GaragePanel />}
        {activeTab === "race"     && <RacePanel />}
        {activeTab === "community" && <CommunityPanel />}
        {activeTab === "workshop" && <WorkshopPanel />}
        {activeTab === "shop"     && <ShopPanel />}
        {activeTab === "settings" && <SettingsPanel />}
        {activeTab === "dev"      && <AdminPanel />}
      </ThemeShell>
    </>
  );
}
