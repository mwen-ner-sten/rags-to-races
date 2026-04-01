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
import { computeTick, computeTickSpeedMs } from "@/engine/tick";
import type { ScavengedPart } from "@/engine/scavenge";
import type { LootGearItem, InstalledMod } from "@/data/lootGear";

type TabId = "junkyard" | "garage" | "race" | "locker" | "workshop" | "shop" | "settings" | "dev";

const SHOW_DEV_TAB = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

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
        let totalParts: ScavengedPart[] = [];
        let totalScraps = 0;
        let totalRep = 0;
        let totalWear = 0;
        let totalRepair = 0;
        let raceProgress = state.raceTickProgress;
        let totalLootGear: LootGearItem[] = [];
        let totalMods: InstalledMod[] = [];

        for (let i = 0; i < offlineTicks; i++) {
          const r = computeTick({ ...state, raceTickProgress: raceProgress });
          totalParts = totalParts.concat(r.partsFound);
          totalScraps += r.scrapsEarned;
          totalRep += r.repEarned;
          totalWear += r.vehicleWearAmount;
          totalRepair += r.vehicleRepairAmount;
          raceProgress = r.newRaceTickProgress;
          totalLootGear = totalLootGear.concat(r.lootGearDrops);
          totalMods = totalMods.concat(r.modDrops);
        }

        if (totalParts.length > 0 || totalScraps !== 0 || totalRep !== 0 || totalWear !== 0 || totalLootGear.length > 0 || totalMods.length > 0) {
          applyTickResult(
            totalParts,
            totalScraps,
            totalRep,
            totalWear > 0 ? totalWear : undefined,
            totalRepair > 0 ? totalRepair : undefined,
            raceProgress,
            totalLootGear.length > 0 ? totalLootGear : undefined,
            totalMods.length > 0 ? totalMods : undefined,
          );
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
      <ThemeShell activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === "junkyard" && <ScavengePanel />}
        {activeTab === "garage"   && <GaragePanel />}
        {activeTab === "race"     && <RacePanel />}
        {activeTab === "locker"    && <LockerPanel />}
        {activeTab === "workshop" && <WorkshopPanel />}
        {activeTab === "shop"     && <ShopPanel />}
        {activeTab === "settings" && <SettingsPanel />}
        {SHOW_DEV_TAB && activeTab === "dev" && <AdminPanel />}
      </ThemeShell>
    </>
  );
}
