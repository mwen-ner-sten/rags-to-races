import type { CircuitDefinition } from "@/data/circuits";
import { BASE_WEAR_PER_RACE, DNF_WEAR_BONUS, RELIABILITY_WEAR_THRESHOLD } from "@/data/vehicles";
import { PART_DEFINITIONS, type PartCategory } from "@/data/parts";
import { makePartId } from "./scavenge";
import { chance, randInt, weightedPick } from "@/utils/random";
import type { ScavengedPart } from "./scavenge";
import type { BuiltVehicle } from "./build";

export type RaceResult = "win" | "loss" | "dnf";

export interface RaceOutcome {
  result: RaceResult;
  position: number;       // 1–8
  totalRacers: number;
  scrapsEarned: number;
  repEarned: number;
  log: string[];
  /** Part salvaged from race wreckage (only on wins, ~15% chance) */
  salvageDrop?: ScavengedPart;
  /** Forge Token dropped (rare, high-tier circuits only) */
  forgeTokenDrop?: boolean;
}

const RACE_FLAVOR: Record<RaceResult, string[]> = {
  win: [
    "You take the checkered flag!",
    "First place — they're speechless.",
    "Built from garbage. Finished first. Beautiful.",
    "Your scrap heap crosses the line ahead of everyone.",
  ],
  loss: [
    "You finish, but not first.",
    "A respectable showing. For a junkyard car.",
    "You're gaining on them... next time.",
    "Close. Really close. Still lost.",
  ],
  dnf: [
    "The engine throws a rod on lap 2.",
    "A wheel pops off going into turn 3. Classic.",
    "You DNF, but that engine sounded incredible for a second.",
    "Did not finish. The scrap pile giveth and taketh away.",
  ],
};

function pickFlavor(result: RaceResult): string {
  const arr = RACE_FLAVOR[result];
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Calculate pre-race odds for display. */
export function calculateOdds(
  performance: number,
  reliability: number,
  difficulty: number,
  prestigeBonus: number = 1,
  fatigue: number = 0,
  gearPerformanceBonus: number = 0,
  gearDnfReduction: number = 0,
): { winChance: number; dnfChance: number; oddsLabel: string } {
  const fatigueMult = 1 - fatigue * 0.005; // at 50 fatigue: -25% performance
  const effectivePerformance = performance * prestigeBonus * fatigueMult * (1 + gearPerformanceBonus);
  const winChance = Math.min(0.95, Math.max(0.05, effectivePerformance / (difficulty * 2)));
  const dnfChance = Math.max(0, 0.3 - reliability / 200 - gearDnfReduction);

  // Convert to odds format (e.g., 2:1, 5:1)
  let oddsLabel: string;
  if (winChance >= 0.7) oddsLabel = "Heavy Favorite";
  else if (winChance >= 0.5) oddsLabel = "Favored";
  else if (winChance >= 0.35) oddsLabel = "Even";
  else if (winChance >= 0.2) oddsLabel = "Underdog";
  else oddsLabel = "Long Shot";

  return { winChance, dnfChance, oddsLabel };
}

/**
 * Roll for a circuit salvage drop after a race win.
 * @param circuit - the circuit raced on
 * @param dropChance - base probability (0–1), boosted by Scavenger's Eye upgrade
 * @param maxConditionIndex - max condition the salvage can be (0=rusted, 2=decent)
 */
export function rollSalvageDrop(
  circuit: CircuitDefinition,
  dropChance: number = 0.15,
  maxConditionIndex: number = 1,
): ScavengedPart | null {
  if (!chance(dropChance)) return null;

  // Pick a random part category with equal weight
  const categories: PartCategory[] = ["engine", "wheel", "frame", "fuel", "electronics", "drivetrain", "exhaust", "suspension", "aero"];
  const weights = Object.fromEntries(categories.map((c) => [c, 1])) as Record<PartCategory, number>;
  const category = weightedPick(weights);

  // Filter eligible parts by circuit tier
  const eligible = PART_DEFINITIONS.filter(
    (p) => p.category === category && p.minTier <= circuit.tier,
  );
  if (eligible.length === 0) return null;

  const def = eligible[randInt(0, eligible.length - 1)];

  // Salvage is always rusted or worn (it's from wreckage)
  const conditions: ScavengedPart["condition"][] = maxConditionIndex >= 2
    ? ["rusted", "worn", "decent"]
    : ["rusted", "worn"];
  const condition = conditions[randInt(0, conditions.length - 1)];

  return {
    id: makePartId(),
    definitionId: def.id,
    condition,
    foundAt: `race_salvage_${circuit.id}`,
    type: "part",
  };
}

/** Simulate a race. Returns outcome. */
export function simulateRace(
  vehicle: BuiltVehicle,
  circuit: CircuitDefinition,
  prestigeBonus: number = 1,
  fatigue: number = 0,
  gearPerformanceBonus: number = 0,
  gearDnfReduction: number = 0,
  salvageDropChance: number = 0.15,
  salvageMaxCondition: number = 1,
  momentumWinBonus: number = 0,
  forgeTokenChanceBonus: number = 0,
): RaceOutcome {
  const totalRacers = 8;
  const { performance } = vehicle.stats;

  // DNF chance based on reliability (gear reduces DNF chance)
  const reliabilityScore = vehicle.stats.reliability;
  const dnfChance = Math.max(0, 0.3 - reliabilityScore / 200 - gearDnfReduction);
  if (Math.random() < dnfChance) {
    return {
      result: "dnf",
      position: totalRacers,
      totalRacers,
      scrapsEarned: 0,
      repEarned: 0,
      log: [pickFlavor("dnf")],
    };
  }

  // Win chance: performance vs difficulty (fatigue reduces effective performance, gear boosts)
  const fatigueMult = 1 - fatigue * 0.005;
  const effectivePerformance = performance * prestigeBonus * fatigueMult * (1 + gearPerformanceBonus);
  const difficultyThreshold = circuit.difficulty * 2;
  const winChance = Math.min(0.95, Math.max(0.05, effectivePerformance / difficultyThreshold + momentumWinBonus));

  const won = Math.random() < winChance;
  const position = won ? 1 : Math.floor(Math.random() * (totalRacers - 2)) + 2;

  const result: RaceResult = won ? "win" : "loss";

  // Rewards scale with position
  const positionMultiplier = won ? 1 : Math.max(0.1, (totalRacers - position) / totalRacers);
  const scrapsEarned = won
    ? circuit.rewardBase
    : Math.floor(circuit.rewardBase * positionMultiplier * 0.3);
  const repEarned = won ? circuit.repReward : circuit.repReward * positionMultiplier * 0.5;

  // Circuit salvage drop — only on wins
  const salvageDrop = won
    ? rollSalvageDrop(circuit, salvageDropChance, salvageMaxCondition)
    : null;

  // Forge Token: very rare drop from high-tier circuit wins (tier 3+); talent bonus additive
  const forgeTokenDrop = won && circuit.tier >= 3 && chance(0.02 + forgeTokenChanceBonus);

  const log = [
    `Circuit: ${circuit.name}`,
    `Finished: P${position}/${totalRacers}`,
    pickFlavor(result),
    won ? `+${scrapsEarned} Scrap Bucks` : scrapsEarned > 0 ? `+${scrapsEarned} Scrap Bucks (consolation)` : "No prize money.",
    repEarned > 0 ? `+${parseFloat(repEarned.toFixed(1))} Rep` : "",
    salvageDrop ? `Salvaged a part from the wreckage!` : "",
    forgeTokenDrop ? `Found a Forge Token in the debris!` : "",
  ].filter(Boolean);

  return {
    result, position, totalRacers, scrapsEarned, repEarned, log,
    salvageDrop: salvageDrop ?? undefined,
    forgeTokenDrop: forgeTokenDrop || undefined,
  };
}

/** Calculate condition points lost from a race. */
export function calculateWear(
  vehicle: BuiltVehicle,
  result: RaceResult,
  wearReductionPct: number,
  fatigue: number = 0,
  gearWearReduction: number = 0,
): number {
  let wear = BASE_WEAR_PER_RACE;
  if (result === "dnf") wear += DNF_WEAR_BONUS;

  // Higher reliability = slower degradation
  if (vehicle.stats.reliability > RELIABILITY_WEAR_THRESHOLD) {
    const reliabilityBonus = (vehicle.stats.reliability - RELIABILITY_WEAR_THRESHOLD) / 200;
    wear *= Math.max(0.3, 1 - reliabilityBonus);
  }

  // Workshop upgrade + gear reduction
  wear *= Math.max(0, 1 - wearReductionPct - gearWearReduction);

  // Fatigue increases wear (tired mechanic = sloppier work)
  wear *= (1 + fatigue * 0.008);

  return Math.round(Math.max(1, wear));
}
