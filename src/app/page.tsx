"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import ThemeShell from "@/components/ThemeShell";
import ScavengePanel from "@/components/Junkyard/ScavengePanel";
import GaragePanel from "@/components/Garage/GaragePanel";
import RacePanel from "@/components/RaceTrack/RacePanel";
import ShopPanel from "@/components/Shop/ShopPanel";
import AdminPanel from "@/components/Admin/AdminPanel";
import WorkshopPanel from "@/components/Workshop/WorkshopPanel";
import CommunityPanel from "@/components/Community/CommunityPanel";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import IntroPanel from "@/components/Intro/IntroPanel";
import ToastContainer from "@/components/effects/Toast";
import { useGameStore } from "@/state/store";
import { computeTick, TICK_MS } from "@/engine/tick";

type TabId = "junkyard" | "garage" | "race" | "community" | "workshop" | "shop" | "settings" | "dev";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const completeIntro = useGameStore((s) => s.completeIntro);
  const introCompleted = useGameStore((s) => s.introCompleted);
  const garageCount = useGameStore((s) => s.garage.length);
  const repPoints = useGameStore((s) => s.repPoints);
  const storeRef = useRef(useGameStore.getState());

  const unlockedTabs = useMemo<Record<TabId, boolean>>(() => ({
    junkyard: introCompleted,
    garage: introCompleted,
    race: introCompleted && garageCount > 0,
    community: introCompleted && repPoints >= 8,
    workshop: introCompleted && repPoints >= 15,
    shop: introCompleted && repPoints >= 25,
    settings: true,
    dev: true,
  }), [introCompleted, garageCount, repPoints]);

  const lockMessages: Partial<Record<TabId, string>> = {
    race: "Build your first ride in Garage to unlock Race.",
    community: "Reach 8 Rep to unlock the Community.",
    workshop: "Reach 15 Rep to unlock the Workshop.",
    shop: "Reach 25 Rep to unlock the Shop.",
    junkyard: "Complete the intro to start scavenging.",
    garage: "Complete the intro to open your Garage.",
  };

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

  useEffect(() => {
    if (!unlockedTabs[activeTab]) {
      setActiveTab(introCompleted ? "junkyard" : "settings");
    }
  }, [activeTab, introCompleted, unlockedTabs]);

  const showIntro = !introCompleted;
  const activeTabUnlocked = unlockedTabs[activeTab];

  return (
    <>
      <ToastContainer />
      <ThemeShell activeTab={activeTab} setActiveTab={setActiveTab}>
        {showIntro ? (
          <IntroPanel onBegin={completeIntro} />
        ) : !activeTabUnlocked ? (
          <div className="mx-auto max-w-2xl rounded-lg border border-zinc-700 bg-zinc-900/80 p-6 text-zinc-200">
            <h2 className="text-xl font-semibold text-orange-400">Feature Locked</h2>
            <p className="mt-2 text-sm text-zinc-300">{lockMessages[activeTab] ?? "Keep racing and growing your rep to unlock this area."}</p>
          </div>
        ) : (
          <>
            {activeTab === "junkyard" && <ScavengePanel />}
            {activeTab === "garage"   && <GaragePanel />}
            {activeTab === "race"     && <RacePanel />}
            {activeTab === "community" && <CommunityPanel />}
            {activeTab === "workshop" && <WorkshopPanel />}
            {activeTab === "shop"     && <ShopPanel />}
            {activeTab === "settings" && <SettingsPanel />}
            {activeTab === "dev"      && <AdminPanel />}
          </>
        )}
      </ThemeShell>
    </>
  );
}
