"use client";

import { useState, useEffect, useRef } from "react";
import ThemeShell from "@/components/ThemeShell";
import ScavengePanel from "@/components/Junkyard/ScavengePanel";
import GaragePanel from "@/components/Garage/GaragePanel";
import RacePanel from "@/components/RaceTrack/RacePanel";
import ShopPanel from "@/components/Shop/ShopPanel";
import AdminPanel from "@/components/Admin/AdminPanel";
import WorkshopPanel from "@/components/Workshop/WorkshopPanel";
import ToastContainer from "@/components/effects/Toast";
import { useGameStore } from "@/state/store";
import { computeTick, TICK_MS } from "@/engine/tick";

type TabId = "junkyard" | "garage" | "race" | "workshop" | "shop" | "dev";

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

  return (
    <>
      <ToastContainer />
      <ThemeShell activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === "junkyard" && <ScavengePanel />}
        {activeTab === "garage"   && <GaragePanel />}
        {activeTab === "race"     && <RacePanel />}
        {activeTab === "workshop" && <WorkshopPanel />}
        {activeTab === "shop"     && <ShopPanel />}
        {activeTab === "dev"      && <AdminPanel />}
      </ThemeShell>
    </>
  );
}
