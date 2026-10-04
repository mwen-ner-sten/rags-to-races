"use client";
import { STEPS } from "@/components/effects/TutorialOverlay";
import { useGameStore } from "@/state/store";
import type { TabId } from "@/components/navigation/tabs";
import { canScrapReset, getScrapResetProgress } from "@/config/progression";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { canPromote, promotionRequirements } from "@/engine/campaign";
import { getRaceIneligibilityReason } from "@/engine/eligibility";
import { getActiveEventCircuit } from "@/engine/raceExpectation";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";

export default function NextObjective({ navigate }: { navigate: (tab: TabId) => void }) {
  const state = useGameStore();
  if (!state.tutorialDismissed && state.tutorialStep >= 0 && state.tutorialStep < STEPS.length) return null;
  let tab: TabId = "race";
  let title = "Climb the event ladder";
  let detail = "Win a Sprint to open its Heat, then win the Heat to open the Feature. Spend Rep on the next venue when your build is ready.";
  const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
  const reason = getRaceIneligibilityReason(state, getActiveEventCircuit(state));
  if (!vehicle) { title = "Build your next racing machine"; detail = "Your garage shows the required parts and build cost. The junkyard keeps finding parts while you are away."; tab = "garage"; }
  else if (vehicle.condition < state.autoRaceMinCondition || reason === "vehicle_broken") { title = "Get the car ready again"; detail = "Repair the vehicle in the garage. Auto-Repair keeps unattended races running; keep money available for repairs and entry fees."; tab = "garage"; }
  else if (reason === "vehicle_tier_low" || reason === "vehicle_tier_high") { title = "Match a vehicle to this class"; detail = "This venue has a vehicle tier restriction. Choose another car or return to a compatible venue."; tab = "garage"; }
  else if (reason === "entry_fee") { title = "Fund the next entry"; detail = "Sell spare parts in the junkyard. Scavenging is free and continues automatically."; tab = "junkyard"; }
  else if (state.fatigue > state.autoRaceMaxFatigue) { title = "Rest the driver, improve the build"; detail = "Auto-race resumes as fatigue recovers. Compare parts, queue a workshop project, or review your kit while the driver rests."; tab = "gear"; }
  else if (canScrapReset(getScrapResetProgress(state))) { title = "Reset or push?"; detail = "Compare your Legacy reward with the next Feature milestone. Gear and knowledge will follow you into the next run."; tab = "upgrades"; }
  if (state.campaign.knowledge.team && (title === "Climb the event ladder" || title === "Reset or push?")) {
    const layer = state.campaign.ownerResetsThisTrackEra >= 4 ? "track" : state.campaign.teamResetsThisOwnerEra >= 3 ? "owner" : "team";
    title = `Grow toward ${layer === "track" ? "a racing series" : "team ownership"}`;
    detail = promotionRequirements(layer, state.campaign).find((g) => !g.met)?.label || "Your next promotion is ready.";
    tab = "upgrades";
  }
  const readyPromotion = (["track", "owner", "team"] as const).find((layer) => canPromote(layer, state.campaign));
  const national = CIRCUIT_DEFINITIONS.find((c) => c.id === "national_circuit")!;
  if (readyPromotion) {
    title = `Your ${readyPromotion} promotion is ready`;
    detail = "Review the exact reward and retention preview, then choose whether to promote or keep racing.";
    tab = "upgrades";
  } else if (vehicle && !(state.eventWins.national_circuit?.feature) && (getVehicleById(vehicle.definitionId)?.tier ?? 0) > national.maxVehicleTier) {
    title = "Keep a car for the National Feature";
    detail = `This car is above its class limit. Build or choose a tier ${national.minVehicleTier}–${national.maxVehicleTier} racer for the National Feature required by Scrap Reset.`;
    tab = "garage";
  }
  return <Panel className="mb-3" kicker="Next objective" title={title} aside={<Button onClick={() => navigate(tab)}>Go to {tab === "gear" ? "workshop" : tab}</Button>}><p className="text-sm">{detail}</p></Panel>;
}
