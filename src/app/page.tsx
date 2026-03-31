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
type FeatureTabId = Exclude<TabId, "settings" | "dev">;

const FEATURE_UNLOCK_MESSAGES: Record<FeatureTabId, string> = {
  junkyard: "Complete the intro to start scavenging.",
  garage: "Complete the intro to start building your first machine.",
  race: "Build your first ride in the Garage to unlock racing.",
  community: "Build your first ride to unlock local racers and social boosts.",
  workshop: "Build your first ride to unlock workshop upgrades.",
  shop: "Build your first ride to unlock the shop.",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const introCompleted = useGameStore((s) => s.introCompleted);
  const unlockedFeatures = useGameStore((s) => s.unlockedFeatures);
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

  const isFeatureTab = (tab: TabId): tab is FeatureTabId => tab !== "settings" && tab !== "dev";
  const isLockedTab = isFeatureTab(activeTab) && !unlockedFeatures[activeTab];

  return (
    <>
      <ToastContainer />
      {!introCompleted ? (
        <IntroPanel onContinue={completeIntro} />
      ) : (
        <ThemeShell activeTab={activeTab} setActiveTab={setActiveTab}>
          {isLockedTab ? (
            <LockedFeaturePanel message={FEATURE_UNLOCK_MESSAGES[activeTab]} />
          ) : (
            <>
              {activeTab === "junkyard" && <ScavengePanel />}
              {activeTab === "garage" && <GaragePanel />}
              {activeTab === "race" && <RacePanel />}
              {activeTab === "community" && <CommunityPanel />}
              {activeTab === "workshop" && <WorkshopPanel />}
              {activeTab === "shop" && <ShopPanel />}
              {activeTab === "settings" && <SettingsPanel />}
              {activeTab === "dev" && <AdminPanel />}
            </>
          )}
        </ThemeShell>
      )}
    </>
  );
}

function IntroPanel({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <section className="rounded-2xl border p-6 md:p-8" style={{ background: "var(--panel-bg, #181008)", borderColor: "var(--panel-border, #3a2510)" }}>
        <p className="text-xs uppercase tracking-[.2em]" style={{ color: "var(--text-muted, #7a6040)" }}>
          CHAPTER 1: WAKING THE BLOCK
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl" style={{ color: "var(--text-heading, #c4872a)" }}>
          Rags to Races
        </h1>
        <div className="mt-4 space-y-4 leading-relaxed" style={{ color: "var(--text-primary, #d4b896)" }}>
          <p>
            At sunrise, the city sounds like loose bolts in a coffee can. Your garage door sticks halfway, your wallet is empty, and your only teammate is a dented toolbox named Lucky.
          </p>
          <p>
            Everyone says you can&apos;t build a winner from curbside junk. Perfect. You&apos;ve got a crowbar, stubborn hands, and a dream loud enough to rattle hubcaps.
          </p>
          <p>
            Today&apos;s mission: scavenge parts, slap together your first racer, and prove the neighborhood wrong one squealing turn at a time.
          </p>
        </div>
        <button
          onClick={onContinue}
          className="mt-6 rounded-md px-4 py-2 font-semibold transition hover:brightness-110"
          style={{ background: "var(--btn-primary-bg, #c83e0c)", color: "var(--btn-primary-text, #fff)" }}
        >
          Start Wrenching
        </button>
      </section>
    </main>
  );
}

function LockedFeaturePanel({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border p-6 text-center" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
      <h2 className="text-2xl font-semibold" style={{ color: "var(--text-heading)" }}>Feature Locked</h2>
      <p className="mt-3" style={{ color: "var(--text-primary)" }}>{message}</p>
    </section>
  );
}
