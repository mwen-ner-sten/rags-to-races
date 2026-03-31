"use client";

import { useState, useEffect, useRef } from "react";
import ThemeShell from "@/components/ThemeShell";
import ScavengePanel from "@/components/Junkyard/ScavengePanel";
import GaragePanel from "@/components/Garage/GaragePanel";
import RacePanel from "@/components/RaceTrack/RacePanel";
import ShopPanel from "@/components/Shop/ShopPanel";
import AdminPanel from "@/components/Admin/AdminPanel";
import WorkshopPanel from "@/components/Workshop/WorkshopPanel";
import LockerPanel from "@/components/Locker/LockerPanel";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import ToastContainer from "@/components/effects/Toast";
import { useGameStore } from "@/state/store";
import { computeTick, computeTickSpeedMs, getRaceTicksNeeded } from "@/engine/tick";
import type { ScavengedPart } from "@/engine/scavenge";

type TabId = "junkyard" | "garage" | "race" | "locker" | "workshop" | "shop" | "settings" | "dev";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const storeRef = useRef(useGameStore.getState());

  // Keep storeRef in sync without triggering re-renders
  useEffect(() => {
    return useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  // Refs for tick loop (no React re-renders for these)
  const lastTickTimeRef = useRef<number>(Date.now());
  const tickBarRef = useRef<HTMLDivElement>(null);

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
        let totalParts: ScavengedPart[] = [];
        let totalScraps = 0;
        let totalRep = 0;
        let totalWear = 0;
        let totalRepair = 0;
        let raceProgress = state.raceTickProgress;
        const raceTicksNeeded = getRaceTicksNeeded(state);

        for (let i = 0; i < offlineTicks; i++) {
          // Simulate tick using static base state (simplified accumulation)
          const r = computeTick({ ...state, raceTickProgress: raceProgress });
          totalParts = totalParts.concat(r.partsFound);
          totalScraps += r.scrapsEarned;
          totalRep += r.repEarned;
          totalWear += r.vehicleWearAmount;
          totalRepair += r.vehicleRepairAmount;
          raceProgress = r.newRaceTickProgress;
        }

        if (totalParts.length > 0 || totalScraps !== 0 || totalRep !== 0 || totalWear !== 0) {
          applyTickResult(
            totalParts,
            totalScraps,
            totalRep,
            totalWear > 0 ? totalWear : undefined,
            totalRepair > 0 ? totalRepair : undefined,
            raceProgress,
          );
          // Surface a brief offline summary via the unlock-events toast system
          const timeAway = Math.round(elapsed / 60_000);
          useGameStore.setState((s) => ({
            unlockEvents: [
              ...s.unlockEvents,
              `Welcome back! ${timeAway} min away — ${offlineTicks} ticks processed.`,
            ],
          }));
        }
      }
    }
    lastTickTimeRef.current = Date.now();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Main game loop: poll every 100 ms so the tick bar stays smooth and tick
  // speed can change dynamically without recreating the interval.
  useEffect(() => {
    const interval = setInterval(() => {
      const state = storeRef.current;
      const tickMs = computeTickSpeedMs(state);
      const elapsed = Date.now() - lastTickTimeRef.current;

      // Update tick progress bar directly via DOM (no React re-render)
      const progress = Math.min(1, elapsed / tickMs);
      if (tickBarRef.current) {
        tickBarRef.current.style.width = `${progress * 100}%`;
      }

      // Fire a game tick once enough time has elapsed
      if (elapsed >= tickMs) {
        lastTickTimeRef.current = Date.now();
        const result = computeTick(state);
        if (
          result.partsFound.length > 0 ||
          result.scrapsEarned !== 0 ||
          result.repEarned !== 0 ||
          result.vehicleWearAmount !== 0 ||
          result.vehicleRepairAmount !== 0 ||
          result.newRaceTickProgress !== state.raceTickProgress
        ) {
          applyTickResult(
            result.partsFound,
            result.scrapsEarned,
            result.repEarned,
            result.vehicleWearAmount || undefined,
            result.vehicleRepairAmount || undefined,
            result.newRaceTickProgress,
          );
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [applyTickResult]);

  return (
    <>
      <ToastContainer />
      <ThemeShell activeTab={activeTab} setActiveTab={setActiveTab}>
        {/* Tick progress bar — thin strip at the top of the content area */}
        <div className="h-0.5 w-full bg-zinc-800">
          <div
            ref={tickBarRef}
            className="h-full bg-blue-500"
            style={{ width: "0%", transition: "none" }}
          />
        </div>
        {activeTab === "junkyard" && <ScavengePanel />}
        {activeTab === "garage"   && <GaragePanel />}
        {activeTab === "race"     && <RacePanel />}
        {activeTab === "locker"    && <LockerPanel />}
        {activeTab === "workshop" && <WorkshopPanel />}
        {activeTab === "shop"     && <ShopPanel />}
        {activeTab === "settings" && <SettingsPanel />}
        {activeTab === "dev"      && <AdminPanel />}
      </ThemeShell>
    </>
  );
}
