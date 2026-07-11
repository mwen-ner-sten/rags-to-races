import type { CrewMember, CrewRole } from "@/data/crew";

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
  // Keep fractional XP so a +20% training bonus remains +20% even for the
  // one-XP Trader actions. Rounding each action would erase four upgrade
  // levels of the advertised bonus.
  const newXp = member.xp + amount * crewXpMultiplier;
  const { level } = crewLevelFromXp(newXp);
  return { ...member, xp: newXp, level: Math.min(level, 10) };
}

/** Grant XP to every crew member whose role matches the completed action. */
export function grantCrewRoleXp(
  roster: CrewMember[],
  role: CrewRole,
  amount: number,
  crewXpMultiplier: number = 1,
): CrewMember[] {
  if (amount <= 0) return roster;
  return roster.map((member) =>
    member.role === role
      ? grantCrewXp(member, amount, crewXpMultiplier)
      : member,
  );
}

/** Total XP required for a crew member to begin at a given level. */
export function crewTotalXpForLevel(level: number): number {
  const boundedLevel = Math.max(1, Math.min(10, Math.floor(level)));
  let total = 0;
  for (let nextLevel = 2; nextLevel <= boundedLevel; nextLevel++) {
    total += crewXpForLevel(nextLevel);
  }
  return total;
}

export function createCrewAtLevel(
  id: string,
  name: string,
  role: CrewRole,
  level: number,
): CrewMember {
  const boundedLevel = Math.max(1, Math.min(10, Math.floor(level)));
  return {
    id,
    name,
    role,
    level: boundedLevel,
    xp: crewTotalXpForLevel(boundedLevel),
    specialization: null,
  };
}

/** Stable four-role roster used whenever Talent Academy re-recruits a team. */
export function createAcademyRoster(startingLevel: number = 1): CrewMember[] {
  const names = ["Mara", "Rook", "Ace", "Ledger"];
  return (["mechanic", "scout", "driver", "trader"] as CrewRole[]).map(
    (role, index) =>
      createCrewAtLevel(`academy_${role}`, names[index], role, startingLevel),
  );
}

/** Preserve recruited crew and fill only roles that Talent Academy is missing. */
export function ensureAcademyRoster(
  roster: CrewMember[],
  startingLevel: number = 1,
): CrewMember[] {
  const existingRoles = new Set(roster.map((member) => member.role));
  return [
    ...roster,
    ...createAcademyRoster(startingLevel).filter(
      (member) => !existingRoles.has(member.role),
    ),
  ];
}
