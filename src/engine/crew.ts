import type { CrewMember } from "@/data/crew";

export interface CrewBonuses {
  scavengeLuckBonus: number;
  scavengeYieldBonus: number;
  racePerformanceBonus: number;
  raceDnfReduction: number;
  buildCostReduction: number;
  repairCostReduction: number;
  sellValueBonus: number;
  dealerDiscountBonus: number;
}

/** XP required for a crew member to reach level n (1-indexed) */
export function crewXpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.floor(50 * Math.pow(2, n - 2));
}

/** Calculate level from total XP */
export function crewLevelFromXp(
  totalXp: number,
  maxLevel: number = 10,
): { level: number; xpIntoLevel: number; xpForNext: number } {
  let remaining = totalXp;
  for (let lvl = 2; lvl <= maxLevel; lvl++) {
    const cost = crewXpForLevel(lvl);
    if (remaining < cost)
      return { level: lvl - 1, xpIntoLevel: remaining, xpForNext: cost };
    remaining -= cost;
  }
  return { level: maxLevel, xpIntoLevel: 0, xpForNext: 0 };
}

/** Aggregate bonuses from all crew members */
export function getCrewBonuses(crew: CrewMember[]): CrewBonuses {
  const bonuses: CrewBonuses = {
    scavengeLuckBonus: 0,
    scavengeYieldBonus: 0,
    racePerformanceBonus: 0,
    raceDnfReduction: 0,
    buildCostReduction: 0,
    repairCostReduction: 0,
    sellValueBonus: 0,
    dealerDiscountBonus: 0,
  };
  for (const member of crew) {
    const level = member.level;
    switch (member.role) {
      case "scout":
        bonuses.scavengeLuckBonus += level * 0.01;
        bonuses.scavengeYieldBonus += level * 0.02;
        break;
      case "mechanic":
        bonuses.buildCostReduction += level * 0.01;
        bonuses.repairCostReduction += level * 0.015;
        break;
      case "driver":
        bonuses.racePerformanceBonus += level * 0.01;
        bonuses.raceDnfReduction += level * 0.005;
        break;
      case "trader":
        bonuses.sellValueBonus += level * 0.02;
        bonuses.dealerDiscountBonus += level * 0.01;
        break;
    }
    // Specialization bonuses (if specialized and level >= 5)
    if (member.specialization && level >= 5) {
      switch (member.specialization) {
        case "treasure_hunter":
          bonuses.scavengeLuckBonus += 0.05;
          break;
        case "bulk_hauler":
          bonuses.scavengeYieldBonus += 0.1;
          break;
        case "tuner":
          bonuses.buildCostReduction += 0.05;
          break;
        case "salvage_expert":
          bonuses.repairCostReduction += 0.05;
          break;
        case "speed_demon":
          bonuses.racePerformanceBonus += 0.05;
          break;
        case "safety_first":
          bonuses.raceDnfReduction += 0.03;
          break;
        case "fence":
          bonuses.sellValueBonus += 0.1;
          break;
        case "negotiator":
          bonuses.dealerDiscountBonus += 0.05;
          break;
      }
    }
  }
  return bonuses;
}

/** Grant XP to a crew member based on matching player actions. Returns updated member. */
export function grantCrewXp(
  member: CrewMember,
  amount: number,
  crewXpMultiplier: number = 1,
): CrewMember {
  const newXp = member.xp + Math.floor(amount * crewXpMultiplier);
  const { level } = crewLevelFromXp(newXp);
  return { ...member, xp: newXp, level: Math.min(level, 10) };
}
