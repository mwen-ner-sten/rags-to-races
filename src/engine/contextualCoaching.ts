import { REP_PROGRESSION, SCRAP_RESET_REQUIREMENTS, scrapResetRequirementText } from "@/config/progression";
import { getVehicleById } from "@/data/vehicles";
import type { BuiltVehicle } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";

export type ContextualCoachId = "toolkit" | "automation" | "scrap-reset";
export type ContextualCoachTab = "junkyard" | "garage" | "gear" | "upgrades";

export interface ContextualCoachProgress {
  tutorialStep: number;
  tutorialCompleted: boolean;
  raceHistoryCount: number;
  dismissedCoachIds: readonly ContextualCoachId[];
  reputation: number;
  workshopLevels: Readonly<Record<string, number>>;
  hasComparablePart: boolean;
  autoScavengeUnlocked: boolean;
  prestigeCount: number;
  vehiclesBuilt: number;
  lifetimeScrapBucks: number;
}

export interface ContextualCoach {
  id: ContextualCoachId;
  heading: string;
  body: string;
  actionName: string;
  targetTab: ContextualCoachTab;
  targetSection?: "facilities" | "prestige";
}

const TOOLKIT_UNLOCK_COACH: ContextualCoach = {
  id: "toolkit",
  heading: "Next step: compare your parts",
  body: "The Toolkit is close. Unlock it in Workshop Facilities, then compare loose parts with the ones installed on a Garage vehicle before swapping.",
  actionName: "Open Workshop Facilities",
  targetTab: "gear",
  targetSection: "facilities",
};

const TOOLKIT_COMPARE_COACH: ContextualCoach = {
  id: "toolkit",
  heading: "Next step: compare your parts",
  body: "Your Toolkit can swap a loose part into a built vehicle. Compare the candidate with the installed part first; condition and fit can matter more than a single headline stat.",
  actionName: "Compare installed parts",
  targetTab: "garage",
};

const AUTOMATION_COACH: ContextualCoach = {
  id: "automation",
  heading: "Next step: master automation",
  body: "Auto-Scavenge now handles familiar salvage work. Choose the location and selling policy; automation follows those existing decisions without replacing them.",
  actionName: "Review Auto-Scavenge",
  targetTab: "junkyard",
};

const SCRAP_RESET_COACH: ContextualCoach = {
  id: "scrap-reset",
  heading: "Next step: prepare your first Scrap Reset",
  body: `You are closing in on your first strategic restart. The existing gate is ${scrapResetRequirementText()}.`,
  actionName: "Review Scrap Reset progress",
  targetTab: "upgrades",
  targetSection: "prestige",
};

export function hasComparableInstalledPart(
  inventory: readonly ScavengedPart[],
  garage: readonly BuiltVehicle[],
): boolean {
  return inventory.some((candidate) =>
    candidate.type === "part" && garage.some((vehicle) =>
      getVehicleById(vehicle.definitionId)?.slots.some((slot) =>
        Boolean(vehicle.parts[slot.slot]) && slot.acceptableParts.includes(candidate.definitionId),
      ),
    ),
  );
}

export function selectContextualCoach(progress: ContextualCoachProgress): ContextualCoach | null {
  if (!progress.tutorialCompleted || progress.tutorialStep >= 0 || progress.raceHistoryCount === 0) return null;

  const dismissed = new Set(progress.dismissedCoachIds);
  const scrapResetRequirementsMet = [
    progress.vehiclesBuilt >= SCRAP_RESET_REQUIREMENTS.vehiclesBuilt,
    progress.reputation >= SCRAP_RESET_REQUIREMENTS.reputation,
    progress.lifetimeScrapBucks >= SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
  ].filter(Boolean).length;
  if (
    progress.prestigeCount === 0
    && !dismissed.has("scrap-reset")
    && scrapResetRequirementsMet >= 2
  ) {
    return SCRAP_RESET_COACH;
  }

  const toolkitUnlocked = (progress.workshopLevels.toolkit ?? 0) >= 1;
  if (
    progress.prestigeCount === 0
    && !dismissed.has("toolkit")
    && progress.reputation >= REP_PROGRESSION.workshop.refurbishment_bench
    && (!toolkitUnlocked || progress.hasComparablePart)
  ) {
    return toolkitUnlocked ? TOOLKIT_COMPARE_COACH : TOOLKIT_UNLOCK_COACH;
  }

  if (!dismissed.has("automation") && progress.autoScavengeUnlocked) {
    return AUTOMATION_COACH;
  }

  return null;
}
