import type { CrewMember } from "@/data/crew";
import type { MaterialType } from "@/data/materials";
import { getPlaystyleBonuses } from "@/data/playstyleUpgrades";
import { getAchievementBonuses } from "@/engine/achievements";
import { getCrewBonuses } from "@/engine/crew";

/**
 * The persistent player state needed to derive bonuses that survive a Scrap
 * Reset. Arrays are optional so presentation code can safely calculate a cost
 * from a partial state while a save is being hydrated.
 */
export interface PermanentBonusState {
  earnedAchievements?: string[];
  unlockedPlaystyleNodes?: string[];
  crewRoster?: CrewMember[];
}

/**
 * One normalized view of Achievement, Garage Philosophy, and Crew bonuses.
 * Source-specific bonuses stay separate from global bonuses so a payout is
 * never multiplied twice when several systems contribute to it.
 */
export interface PermanentRuntimeBonuses {
  allScrapIncomeMult: number;
  allRepIncomeMult: number;
  raceScrapMult: number;
  raceRepMult: number;
  racePerformanceBonus: number;
  raceDnfFlatReduction: number;
  raceDnfChanceMultiplier: number;
  fatigueReduction: number;
  winStreakScrapBonus: number;
  winStreakScrapCap: number;
  scavengeLuckBonus: number;
  scavengeYieldMult: number;
  scavengeQualityBonus: number;
  sellValueMult: number;
  dealerDiscount: number;
  materialYieldMult: number;
  decomposeYieldMult: number;
  buildCostReduction: number;
  repairCostReduction: number;
  workshopCostReduction: number;
  workshopEffectBonus: number;
  enhancementCostReduction: number;
  craftCostReduction: number;
  momentumThresholdReduction: number;
  startingScrap: number;
  lpMultiplier: number;
  startWorkshopCount: number;
}

export function getPermanentRuntimeBonuses(
  state: PermanentBonusState,
): PermanentRuntimeBonuses {
  const achievements = getAchievementBonuses(state.earnedAchievements ?? []);
  const playstyle = getPlaystyleBonuses(state.unlockedPlaystyleNodes ?? []);
  const crew = getCrewBonuses(state.crewRoster ?? []);
  const scavengeScale = playstyle.allScavengeDoubled ? 2 : 1;

  return {
    // Hidden "all multipliers" achievements affect every produced currency,
    // material, and performance multiplier. Scrap Tycoon is deliberately kept
    // separate so source-specific race/sale bonuses can be added exactly once.
    allScrapIncomeMult: achievements.scrapMult + achievements.allMultiplier,
    allRepIncomeMult: achievements.allMultiplier,
    raceScrapMult: achievements.raceScrapMult + playstyle.raceScrapMult,
    raceRepMult: playstyle.raceRepMult,
    racePerformanceBonus:
      achievements.racePerformanceBonus +
      playstyle.racePerformanceBonus +
      crew.racePerformanceBonus +
      achievements.allMultiplier,
    raceDnfFlatReduction: achievements.dnfReduction + crew.raceDnfReduction,
    raceDnfChanceMultiplier: Math.max(0, 1 - playstyle.dnfReduction),
    fatigueReduction: Math.min(
      0.95,
      achievements.fatigueReduction + playstyle.fatigueReduction,
    ),
    winStreakScrapBonus: playstyle.winStreakScrapBonus,
    winStreakScrapCap: playstyle.winStreakScrapCap,
    scavengeLuckBonus:
      (achievements.scavengeLuckBonus +
        playstyle.scavengeLuckBonus +
        crew.scavengeLuckBonus) *
      scavengeScale,
    scavengeYieldMult:
      (achievements.scavengeYieldMult +
        playstyle.scavengeYieldMult +
        crew.scavengeYieldBonus +
        achievements.allMultiplier) *
      scavengeScale,
    scavengeQualityBonus:
      (achievements.partQualityBonus + playstyle.scavengeQualityBonus) *
      scavengeScale,
    sellValueMult:
      achievements.sellValueMult + playstyle.sellValueMult + crew.sellValueBonus,
    dealerDiscount: Math.min(0.9, crew.dealerDiscountBonus),
    materialYieldMult:
      achievements.materialYieldMult + achievements.allMultiplier,
    decomposeYieldMult:
      playstyle.materialYieldMult + playstyle.decomposeYieldMult,
    buildCostReduction: Math.min(
      0.95,
      achievements.buildCostReduction +
        playstyle.buildCostReduction +
        crew.buildCostReduction,
    ),
    repairCostReduction: Math.min(
      0.95,
      playstyle.repairCostReduction + crew.repairCostReduction,
    ),
    workshopCostReduction: Math.min(0.95, playstyle.workshopCostReduction),
    workshopEffectBonus: playstyle.workshopEffectBonus,
    enhancementCostReduction: Math.min(
      0.95,
      playstyle.enhancementCostReduction,
    ),
    craftCostReduction: Math.min(0.95, playstyle.craftCostReduction),
    momentumThresholdReduction: Math.min(
      0.95,
      playstyle.momentumThresholdReduction,
    ),
    startingScrap: achievements.startingScrap,
    lpMultiplier: achievements.lpMultiplier + achievements.allMultiplier,
    startWorkshopCount: playstyle.startWorkshopCount,
  };
}

/** Apply a fractional cost reduction while keeping positive material costs useful. */
export function reduceMaterialCost(
  cost: Partial<Record<MaterialType, number>>,
  reduction: number,
): Partial<Record<MaterialType, number>> {
  const boundedReduction = Math.max(0, Math.min(0.95, reduction));
  return Object.fromEntries(
    Object.entries(cost).map(([material, amount]) => [
      material,
      Math.max(1, Math.ceil((amount ?? 0) * (1 - boundedReduction))),
    ]),
  ) as Partial<Record<MaterialType, number>>;
}

/** Apply a positive payout multiplier with stable integer rounding. */
export function multiplyReward(base: number, additiveMultiplier: number): number {
  return Math.max(0, Math.floor(base * (1 + Math.max(0, additiveMultiplier))));
}
