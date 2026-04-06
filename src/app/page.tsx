"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ThemeShell from "@/components/ThemeShell";
import ScavengePanel from "@/components/Junkyard/ScavengePanel";
import GaragePanel from "@/components/Garage/GaragePanel";
import RacePanel from "@/components/RaceTrack/RacePanel";
import AdminPanel from "@/components/Admin/AdminPanel";
import LockerPanel from "@/components/Locker/LockerPanel";
import UpgradesPanel from "@/components/Upgrades/UpgradesPanel";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import HelpPanel from "@/components/Help/HelpPanel";
import HelpActivityTab from "@/components/Help/HelpActivityTab";
import ToastContainer from "@/components/effects/Toast";
import TutorialOverlay, { getAllowedTabs } from "@/components/effects/TutorialOverlay";
import OfflineProgressModal from "@/components/effects/OfflineProgressModal";
import { useGameStore } from "@/state/store";
import { computeTick, computeTickSpeedMs, simulateOfflineTicks } from "@/engine/tick";
import type { OfflineResult } from "@/engine/tick";

type TabId = "junkyard" | "garage" | "race" | "gear" | "upgrades" | "help" | "log" | "settings" | "dev";

const SHOW_DEV_TAB = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const [offlineResult, setOfflineResult] = useState<{ result: OfflineResult; timeAway: number } | null>(null);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const storeRef = useRef(useGameStore.getState());

  // Guard tab switching during tutorial
  const guardedSetActiveTab = useCallback((tab: TabId) => {
    const allowed = getAllowedTabs(tutorialStep);
    if (allowed && !allowed.has(tab)) return;
    setActiveTab(tab);
  }, [tutorialStep]);

  // Keep storeRef in sync without triggering re-renders
  useEffect(() => {
    return useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  const lastTickTimeRef = useRef<number>(Date.now());

  // Offline catch-up: runs once on mount after the store has hydrated
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.lastActiveTimestamp > 0) {
      const elapsed = Date.now() - state.lastActiveTimestamp;
      const tickMs = computeTickSpeedMs(state);
      // Cap at 8 hours of offline ticks
      const maxOfflineTicks = Math.floor((8 * 60 * 60 * 1000) / tickMs);
      const offlineTicks = Math.min(Math.floor(elapsed / tickMs), maxOfflineTicks);

      if (offlineTicks > 0) {
        const r = simulateOfflineTicks(state, offlineTicks);

        if (r.partsFound.length > 0 || r.scrapsEarned !== 0 || r.repEarned !== 0 || r.vehicleWearTotal !== 0 || r.lootGearDrops.length > 0 || r.modDrops.length > 0) {
          applyTickResult(
            r.partsFound,
            r.scrapsEarned,
            r.repEarned,
            r.vehicleWearTotal > 0 ? r.vehicleWearTotal : undefined,
            r.vehicleRepairTotal > 0 ? r.vehicleRepairTotal : undefined,
            r.raceTickProgress,
            r.lootGearDrops.length > 0 ? r.lootGearDrops : undefined,
            r.modDrops.length > 0 ? r.modDrops : undefined,
            r.racesCompleted,
          );
          const timeAway = Math.round(elapsed / 60_000);
          setOfflineResult({ result: r, timeAway });
        }
      }
    }
    lastTickTimeRef.current = Date.now();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Main game loop: 100ms poll, fires actual tick when elapsed >= tick interval
  useEffect(() => {
    const interval = setInterval(() => {
      const state = storeRef.current;
      const tickMs = computeTickSpeedMs(state);
      const elapsed = Date.now() - lastTickTimeRef.current;

      if (elapsed >= tickMs) {
        lastTickTimeRef.current = Date.now();
        const result = computeTick(state);
        if (
          result.partsFound.length > 0 ||
          result.scrapsEarned !== 0 ||
          result.repEarned !== 0 ||
          result.vehicleWearAmount !== 0 ||
          result.vehicleRepairAmount !== 0 ||
          result.newRaceTickProgress !== state.raceTickProgress ||
          result.lootGearDrops.length > 0 ||
          result.modDrops.length > 0
        ) {
          applyTickResult(
            result.partsFound,
            result.scrapsEarned,
            result.repEarned,
            result.vehicleWearAmount || undefined,
            result.vehicleRepairAmount || undefined,
            result.newRaceTickProgress,
            result.lootGearDrops.length > 0 ? result.lootGearDrops : undefined,
            result.modDrops.length > 0 ? result.modDrops : undefined,
          );
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [applyTickResult]);

  return (
    <>
      <ToastContainer />
      <TutorialOverlay activeTab={activeTab} />
      {offlineResult && (
        <OfflineProgressModal
          timeAwayMinutes={offlineResult.timeAway}
          result={offlineResult.result}
          onDismiss={() => setOfflineResult(null)}
        />
      )}
      <ThemeShell activeTab={activeTab} setActiveTab={guardedSetActiveTab}>
        {activeTab === "junkyard" && <ScavengePanel />}
        {activeTab === "garage"   && <GaragePanel />}
        {activeTab === "race"     && <RacePanel setActiveTab={guardedSetActiveTab} />}
        {activeTab === "gear"     && <LockerPanel />}
        {activeTab === "upgrades" && <UpgradesPanel />}
        {activeTab === "help"     && <HelpPanel />}
        {activeTab === "log"      && <HelpActivityTab />}
        {activeTab === "settings" && <SettingsPanel />}
        {SHOW_DEV_TAB && activeTab === "dev" && <AdminPanel />}
      </ThemeShell>
    </>
  );
}
