"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ThemeShell from "@/components/ThemeShell";
import ScavengePanel from "@/components/Junkyard/ScavengePanel";
import GaragePanel from "@/components/Garage/GaragePanel";
import RacePanel from "@/components/RaceTrack/RacePanel";
import AdminPanel from "@/components/Admin/AdminPanel";
import SalvageWorkshopPanel, { type WorkshopTab } from "@/components/Workshop/SalvageWorkshopPanel";
import UpgradesPanel from "@/components/Upgrades/UpgradesPanel";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import HelpPanel from "@/components/Help/HelpPanel";
import HelpActivityTab from "@/components/Help/HelpActivityTab";
import ToastContainer from "@/components/effects/Toast";
import TutorialOverlay, { getAdaptiveAllowedTabs } from "@/components/effects/TutorialOverlay";
import OfflineProgressModal from "@/components/effects/OfflineProgressModal";
import { useGameStore, type GameState } from "@/state/store";
import { computeOfflineTickSpeedMs, computeTick, computeTickSpeedMs, simulateOfflineTicks } from "@/engine/tick";
import type { OfflineResult } from "@/engine/tick";
import type { RaceOutcome } from "@/engine/race";
import { MAX_OFFLINE_DURATION_MS } from "@/config/gameplayLimits";
import { isFeatureAvailable } from "@/config/features";

type TabId = "junkyard" | "garage" | "race" | "gear" | "upgrades" | "help" | "log" | "settings" | "dev";

const SHOW_DEV_TAB = isFeatureAvailable("admin_tools");

function circuitStreakAfterOutcome(
  state: GameState,
  outcome: RaceOutcome | null,
): Record<string, number> {
  if (!outcome || outcome.result !== "win") return {};

  let priorWins = 0;
  for (const race of state.raceHistory) {
    if (race.result !== "win" || race.circuitId !== outcome.circuitId) break;
    priorWins++;
  }
  return { [outcome.circuitId]: priorWins + 1 };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("junkyard");
  const [workshopTab, setWorkshopTab] = useState<WorkshopTab>("inventory");
  const [offlineResult, setOfflineResult] = useState<{ result: OfflineResult; timeAway: number } | null>(null);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const applyTickResult = useGameStore((s) => s.applyTickResult);
  const advanceFleetAssignments = useGameStore((s) => s.advanceFleetAssignments);
  const storeRef = useRef(useGameStore.getState());

  const garage = useGameStore((s) => s.garage);
  const raceHistory = useGameStore((s) => s.raceHistory);
  const workshopLevels = useGameStore((s) => s.workshopLevels);

  // Guard tab switching during tutorial — adaptive: loosens restrictions when player acts ahead
  const guardedSetActiveTab = useCallback((tab: TabId) => {
    const allowed = getAdaptiveAllowedTabs(tutorialStep, { garage, raceHistory, workshopLevels });
    if (allowed && !allowed.has(tab)) return;
    setActiveTab(tab);
  }, [tutorialStep, garage, raceHistory, workshopLevels]);

  // Keep storeRef in sync without triggering re-renders
  useEffect(() => {
    return useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  // A reset immediately renders the starting surface without an effect-driven
  // state update. The next user navigation keeps the stored tab in sync.
  const displayedTab: TabId = tutorialStep === 0 ? "junkyard" : activeTab;

  const lastTickTimeRef = useRef<number>(0);

  // Offline catch-up: runs once on mount after the store has hydrated
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.lastActiveTimestamp > 0) {
      const elapsed = Date.now() - state.lastActiveTimestamp;
      const tickMs = computeOfflineTickSpeedMs(state);
      // Cap at 8 hours of offline ticks
      const maxOfflineTicks = Math.floor(MAX_OFFLINE_DURATION_MS / tickMs);
      const offlineTicks = Math.min(Math.floor(elapsed / tickMs), maxOfflineTicks);

      if (offlineTicks > 0) {
        advanceFleetAssignments(offlineTicks);
        const r = simulateOfflineTicks(state, offlineTicks);

        const hasOfflineProgress =
          r.scavengesCompleted > 0 ||
          r.racesCompleted > 0 ||
          r.partsScavenged > 0 ||
          r.scrapsEarned !== 0 ||
          r.repEarned !== 0 ||
          r.vehicleWearTotal !== 0 ||
          r.vehicleRepairTotal !== 0 ||
          r.forgeTokensFound + r.challengeForgeTokens > 0 ||
          Object.values(r.challengeMaterials).some((amount) => (amount ?? 0) > 0) ||
          r.completedChallengeIds.length > 0 ||
          r.newAchievementIds.length > 0 ||
          r.lootGearDrops.length > 0 ||
          r.modDropsFound > 0 ||
          r.stationEquipmentAutoSalvaged > 0 ||
          r.reforgeShardsFound > 0;
        applyTickResult(
            r.partsFound,
            r.scrapsEarned,
            r.repEarned,
            r.vehicleWearTotal > 0 ? r.vehicleWearTotal : undefined,
            r.vehicleRepairTotal > 0 ? r.vehicleRepairTotal : undefined,
            r.raceTickProgress,
            r.lootGearDrops.length > 0 ? r.lootGearDrops : undefined,
            r.modDrops.length > 0 ? r.modDrops : undefined,
            {
              partsScavenged: r.partsScavenged,
              partsAutoSold: r.partsAutoSold,
              scavengesCompleted: r.scavengesCompleted,
              racesCompleted: r.racesCompleted,
              winsCompleted: r.winsCompleted,
              finalWinStreak: r.finalWinStreak,
              bestWinStreak: r.bestWinStreak,
              recentRaceOutcomes: r.recentRaceOutcomes,
              winningCircuitIds: r.winningCircuitIds,
              defeatedRivalIds: r.defeatedRivalIds,
              circuitWinStreaks: r.circuitWinStreaks,
              raceSalvageFound: r.raceSalvageFound,
              forgeTokensFound: r.forgeTokensFound,
              entryFeesPaid: r.entryFeesPaid,
              challengesEvaluated: r.challengesEvaluated,
              completedChallengeIds: r.completedChallengeIds,
              challengeForgeTokens: r.challengeForgeTokens,
              challengeMaterials: r.challengeMaterials,
              ticksProcessed: r.ticksProcessed,
              finalFatigue: r.finalFatigue,
              finalVehicleCondition: r.finalVehicleCondition,
              finalRacerSkills: r.finalRacerSkills,
              finalCrewRoster: r.finalCrewRoster,
              finalActiveMomentumTiers: r.finalActiveMomentumTiers,
              newAchievementIds: r.newAchievementIds,
              stationEquipmentAutoSalvaged: r.stationEquipmentAutoSalvaged,
              reforgeShardsFound: r.reforgeShardsFound,
            },
        );
        if (hasOfflineProgress) {
          const timeAway = Math.round(Math.min(elapsed, MAX_OFFLINE_DURATION_MS) / 60_000);
          queueMicrotask(() => setOfflineResult({ result: r, timeAway }));
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
        advanceFleetAssignments(1);
        applyTickResult(
            result.partsFound,
            result.scrapsEarned,
            result.repEarned,
            result.vehicleWearAmount || undefined,
            result.vehicleRepairAmount || undefined,
            result.newRaceTickProgress,
            result.lootGearDrops.length > 0 ? result.lootGearDrops : undefined,
            result.modDrops.length > 0 ? result.modDrops : undefined,
            {
              partsScavenged: result.partsScavenged,
              partsAutoSold: result.partsAutoSold,
              scavengesCompleted: result.scavengesCompleted,
              racesCompleted: result.raceOutcome ? 1 : 0,
              winsCompleted: result.raceOutcome?.result === "win" ? 1 : 0,
              finalWinStreak: result.raceOutcome ? (result.raceOutcome.result === "win" ? state.winStreak + 1 : 0) : state.winStreak,
              bestWinStreak: result.raceOutcome?.result === "win" ? Math.max(state.bestWinStreak, state.winStreak + 1) : state.bestWinStreak,
              recentRaceOutcomes: result.raceOutcome ? [result.raceOutcome] : [],
              winningCircuitIds: result.raceOutcome?.result === "win" ? [result.raceOutcome.circuitId] : [],
              defeatedRivalIds: result.raceOutcome?.result === "win" && result.raceOutcome.rivalId ? [result.raceOutcome.rivalId] : [],
              circuitWinStreaks: circuitStreakAfterOutcome(state, result.raceOutcome),
              raceSalvageFound: result.raceSalvageFound,
              forgeTokensFound: result.forgeTokensFound,
              entryFeesPaid: result.entryFeesPaid,
              challengesEvaluated: false,
              completedChallengeIds: [],
              challengeForgeTokens: 0,
              challengeMaterials: {},
              ticksProcessed: 1,
            },
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [applyTickResult, advanceFleetAssignments]);

  return (
    <>
      <ToastContainer />
      {offlineResult && (
        <OfflineProgressModal
          timeAwayMinutes={offlineResult.timeAway}
          result={offlineResult.result}
          onDismiss={() => setOfflineResult(null)}
        />
      )}
      <ThemeShell activeTab={displayedTab} setActiveTab={guardedSetActiveTab}>
        <TutorialOverlay activeTab={displayedTab} />
        {displayedTab === "junkyard" && <ScavengePanel />}
        {displayedTab === "garage"   && <GaragePanel />}
        {displayedTab === "race"     && <RacePanel setActiveTab={guardedSetActiveTab} />}
        {displayedTab === "gear"     && <SalvageWorkshopPanel tab={workshopTab} setTab={setWorkshopTab} />}
        {displayedTab === "upgrades" && <UpgradesPanel />}
        {displayedTab === "help"     && <HelpPanel />}
        {displayedTab === "log"      && <HelpActivityTab setActiveTab={guardedSetActiveTab} />}
        {displayedTab === "settings" && <SettingsPanel />}
        {SHOW_DEV_TAB && displayedTab === "dev" && (
          <AdminPanel
            onFullSaveReset={() => {
              setWorkshopTab("inventory");
              setActiveTab("junkyard");
            }}
          />
        )}
      </ThemeShell>
    </>
  );
}
