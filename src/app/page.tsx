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

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [lockPulse, setLockPulse] = useState(false);
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const introCompleted = useGameStore((s) => s.introCompleted);
  const unlockedFeatureIds = useGameStore((s) => s.unlockedFeatureIds);
  const completeIntro = useGameStore((s) => s.completeIntro);
  const storeRef = useRef(useGameStore.getState());

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
    setLockPulse(true);
  };

  useEffect(() => {
    if (!lockPulse) return;
    const timeout = setTimeout(() => setLockPulse(false), 450);
    return () => clearTimeout(timeout);
  }, [lockPulse]);

  useEffect(() => {
    if (!lockMessage) return;
    const timeout = setTimeout(() => setLockMessage(null), 2800);
    return () => clearTimeout(timeout);
  }, [lockMessage]);

  if (!introCompleted) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Rags to Races · Intro</p>
          <h1 className="text-4xl font-black tracking-tight text-orange-300">The Night of Sparks</h1>
          <div className="space-y-4 text-zinc-300">
            <p>
              Rain hammers the roof of <em>Marlowe&apos;s Salvage</em> while you crouch over a rusted mower frame,
              one hand on a wrench, the other on a dying flashlight.
            </p>
            <p>
              The city&apos;s annual <strong>Backyard Derby</strong> is three weeks away. You have no sponsor, no team,
              and exactly enough cash for instant noodles. What you do have is stubbornness, a pile of discarded parts,
              and a mechanic&apos;s instinct that refuses to quit.
            </p>
            <p>
              Every race you win turns trash into legend. Every loss leaves you rebuilding in the dark.
              Start small. Scavenge hard. Build something absurdly fast.
            </p>
          </div>
          <button
            onClick={() => {
              completeIntro();
              setActiveTab("junkyard");
            }}
            className="w-fit rounded border border-orange-500/60 bg-orange-500/20 px-5 py-2 font-semibold text-orange-200 transition hover:bg-orange-500/30"
          >
            Fire up the shop
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer />
      {lockPulse && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-black/35 transition-opacity duration-200" />
      )}
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
