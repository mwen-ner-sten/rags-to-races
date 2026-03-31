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
import ToastContainer from "@/components/effects/Toast";
import { useGameStore } from "@/state/store";
import { computeTick, TICK_MS } from "@/engine/tick";

type TabId = "junkyard" | "garage" | "race" | "community" | "workshop" | "shop" | "settings" | "dev";

const INTRO_STORY = [
  "Two nights ago, your last ride coughed its final bolt outside a flickering corner mart. The tow truck wanted more cash than you had to your name.",
  "At sunrise, you found a busted push mower behind the junkyard fence and a crate of half-dead parts. If you can make it move, you can make it race.",
  "Word is every legend in this city started with a pile of scrap and a bad idea. Build loud, race dirty, and turn rags into trophies.",
];

function IntroGate() {
  const completeIntro = useGameStore((s) => s.completeIntro);
  const [storyStep, setStoryStep] = useState(0);

  const nextStep = () => {
    if (storyStep < INTRO_STORY.length - 1) {
      setStoryStep((s) => s + 1);
      return;
    }
    completeIntro();
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-orange-700/40 bg-zinc-900/90 shadow-2xl p-6 sm:p-8">
        <p className="text-xs tracking-[0.22em] uppercase text-orange-400 mb-4">Chapter Zero · Built from Garbage</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-orange-200 mb-6">Rags to Races</h1>
        <p className="text-base sm:text-lg leading-relaxed text-zinc-200 min-h-36">{INTRO_STORY[storyStep]}</p>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStoryStep((s) => Math.max(0, s - 1))}
            disabled={storyStep === 0}
            className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <div className="text-xs text-zinc-500">{storyStep + 1} / {INTRO_STORY.length}</div>
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-medium"
          >
            {storyStep === INTRO_STORY.length - 1 ? "Start the Hustle" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const introCompleted = useGameStore((s) => s.introCompleted);
  const inventoryCount = useGameStore((s) => s.inventory.length);
  const garageCount = useGameStore((s) => s.garage.length);
  const repPoints = useGameStore((s) => s.repPoints);
  const scrapBucks = useGameStore((s) => s.scrapBucks);

  const storeRef = useRef(useGameStore.getState());

  const tabUnlocks = useMemo(() => {
    const unlocked: Partial<Record<TabId, boolean>> = {
      junkyard: true,
      settings: true,
      dev: true,
      garage: inventoryCount > 0 || garageCount > 0,
      race: garageCount > 0,
      community: repPoints >= 5,
      workshop: repPoints >= 8,
      shop: repPoints >= 3 || scrapBucks >= 30,
    };
    return unlocked as Record<TabId, boolean>;
  }, [garageCount, inventoryCount, repPoints, scrapBucks]);

  const trySetTab = (tabId: TabId) => {
    if (tabUnlocks[tabId]) {
      setActiveTab(tabId);
      return;
    }
    setLockMessage(`\"${tabId}\" is still locked. Keep scavenging to unlock more features.`);
  };

  useEffect(() => {
    if (!lockMessage) return;
    const timeout = setTimeout(() => setLockMessage(null), 2500);
    return () => clearTimeout(timeout);
  }, [lockMessage]);

  useEffect(() => {
    if (!tabUnlocks[activeTab]) setActiveTab("junkyard");
  }, [activeTab, tabUnlocks]);

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

  if (!introCompleted) {
    return <IntroGate />;
  }

  return (
    <>
      <ToastContainer />
      <ThemeShell activeTab={activeTab} setActiveTab={trySetTab}>
        {lockMessage && (
          <div className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
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
