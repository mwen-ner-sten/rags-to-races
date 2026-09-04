import type { CircuitDefinition } from "@/data/circuits";
import { BASE_WEAR_PER_RACE, DNF_WEAR_BONUS, RELIABILITY_WEAR_THRESHOLD } from "@/data/vehicles";
import { PART_DEFINITIONS, type PartCategory } from "@/data/parts";
import { makePartId } from "./scavenge";
import { chance, randInt, random, weightedPick } from "@/utils/random";
import type { ScavengedPart } from "./scavenge";
import type { BuiltVehicle } from "./build";
import { deriveVehicleStats, getCircuitPerformance } from "./performance";
import { DEFAULT_RACE_PLAN, evaluateRacePlan, type RacePlan, type RacePlanEvaluation } from "@/data/raceStrategy";
import { RIVAL_DEFINITIONS } from "@/data/rivals";

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
  planEvaluation?: RacePlanEvaluation;
  rivalId?: string;
  /** True only when this result granted the rival's one-time reward. */
  rivalRewardClaimed?: boolean;
  /** Garage vehicle that produced this result, used for stable diagnostics. */
  vehicleId?: string;
  circuitId: string;
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

/**
 * Where a losing car lands. A car at parity drifts around P4–P5; a strong car
 * that loses is usually P2; a weak car finishes near the back. Loss payouts
 * therefore carry information about the build.
 */
export function losingPosition(ratio: number, totalRacers: number = 8): number {
  const skill = ratio * (0.85 + random() * 0.3);
  const t = Math.min(1, Math.max(0, (skill - 0.3) / 1.4));
  const slots = totalRacers - 2; // P2 … P(totalRacers-1); last place is reserved for DNFs
  return 2 + Math.min(slots - 1, Math.floor((1 - t) * slots));
}

function pickFlavor(result: RaceResult): string {
  const arr = RACE_FLAVOR[result];
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Win-curve shape. At a performance ratio of 1.0 (a decently built,
 * tier-appropriate car) the win chance is ~45%; over-building keeps paying
 * but with diminishing returns, and no car is ever a lock.
 */
export const WIN_CHANCE_FLOOR = 0.05;
export const WIN_CHANCE_CAP = 0.85;
const WIN_CURVE_BASE = 0.05;
const WIN_CURVE_RANGE = 0.80;
const WIN_CURVE_STEEPNESS = 3;
/** DNF base risk decays smoothly with reliability; it never quite reaches zero. */
const DNF_BASE_RISK = 0.32;
const DNF_RELIABILITY_SCALE = 45;

/** The circuit-fit formula lives in performance.ts; re-exported for existing callers. */
export { getCircuitPerformance } from "./performance";

/** Win chance from the ratio of circuit-fitted performance to circuit difficulty. */
export function winChanceFromRatio(ratio: number): number {
  const shaped = Math.pow(Math.max(0, ratio), WIN_CURVE_STEEPNESS);
  return WIN_CURVE_BASE + WIN_CURVE_RANGE * (shaped / (1 + shaped));
}

/**
 * Calculate pre-race odds for display. `performance` is the circuit-fitted
 * value; `performanceBonus` is the composed bonus multiplier minus one (see
 * bonuses.ts) and `ratio` is the effective performance over difficulty that
 * drives both the win curve and the finishing position.
 */
export function calculateOdds(
  performance: number,
  reliability: number,
  difficulty: number,
  fatigue: number = 0,
  performanceBonus: number = 0,
  gearDnfReduction: number = 0,
  skillPerformanceMult: number = 0,
  skillDnfReduction: number = 0,
  momentumWinBonus: number = 0,
  forceDNF: boolean = false,
  planEvaluation?: RacePlanEvaluation,
  dnfChanceMultiplier: number = 1,
): { winChance: number; dnfChance: number; oddsLabel: string; ratio: number } {
  const fatigueMult = 1 - fatigue * 0.005; // at 50 fatigue: -25% performance
  const effectivePerformance = performance * fatigueMult * (1 + performanceBonus) * (1 + skillPerformanceMult) * (planEvaluation?.performanceMultiplier ?? 1);
  const ratio = effectivePerformance / Math.max(1, difficulty);
  const winChance = forceDNF
    ? 0
    : Math.min(WIN_CHANCE_CAP, Math.max(WIN_CHANCE_FLOOR, winChanceFromRatio(ratio) + momentumWinBonus));
  const baseDnf = DNF_BASE_RISK * Math.exp(-Math.max(0, reliability) / DNF_RELIABILITY_SCALE);
  const dnfChance = forceDNF
    ? 1
    : Math.max(
        0,
        Math.min(
          0.95,
          (baseDnf - gearDnfReduction - skillDnfReduction + (planEvaluation?.dnfDelta ?? 0)) *
            Math.max(0, dnfChanceMultiplier),
        ),
      );

  // Convert to odds format (e.g., 2:1, 5:1)
  let oddsLabel: string;
  if (winChance >= 0.7) oddsLabel = "Heavy Favorite";
  else if (winChance >= 0.5) oddsLabel = "Favored";
  else if (winChance >= 0.35) oddsLabel = "Even";
  else if (winChance >= 0.2) oddsLabel = "Underdog";
  else oddsLabel = "Long Shot";

  return { winChance, dnfChance, oddsLabel, ratio };
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

  // Wreckage from a bigger race is worth picking through: the ceiling rises
  // with circuit tier (up to "good"), and Scavenger's Eye raises it further.
  const ceiling = Math.min(3, maxConditionIndex + Math.floor(circuit.tier / 2));
  const conditions: ScavengedPart["condition"][] = (["rusted", "worn", "decent", "good"] as const).slice(0, ceiling + 1);
  const condition = conditions[randInt(0, conditions.length - 1)];

  return {
    id: makePartId(),
    definitionId: def.id,
    condition,
    foundAt: `race_salvage_${circuit.id}`,
    type: "part",
  };
}

/**
 * Simulate a race. Stats are derived from the vehicle's parts and condition
 * (see performance.ts); the persisted `vehicle.stats` cache is never consulted.
 */
export function simulateRace(
  vehicle: BuiltVehicle,
  circuit: CircuitDefinition,
  fatigue: number = 0,
  performanceBonus: number = 0,
  gearDnfReduction: number = 0,
  salvageDropChance: number = 0.15,
  salvageMaxCondition: number = 1,
  momentumWinBonus: number = 0,
  forgeTokenChanceBonus: number = 0,
  skillPerformanceMult: number = 0,
  skillDnfReduction: number = 0,
  forceDNF: boolean = false,
  racePlan: RacePlan = DEFAULT_RACE_PLAN,
  dnfChanceMultiplier: number = 1,
  handlingBonusPct: number = 0,
): RaceOutcome {
  const totalRacers = 8;
  const stats = deriveVehicleStats(vehicle, handlingBonusPct);
  const performance = getCircuitPerformance(stats, circuit);
  const planEvaluation = evaluateRacePlan(circuit.profile, racePlan);
  const eligibleRivals = RIVAL_DEFINITIONS.filter((rival) => circuit.tier >= rival.minCircuitTier && circuit.tier <= rival.maxCircuitTier);
  const rival = eligibleRivals.length > 0 && chance(0.35) ? eligibleRivals[randInt(0, eligibleRivals.length - 1)] : undefined;

  // Consolation Rep on DNF — matches what a last-place loss would earn
  // (repReward * 0.1 worst-position * 0.5 loss-mult = repReward * 0.05).
  // Keeps the economy consistent: DNF is never more rewarding than finishing last.
  const dnfRep = circuit.repReward * 0.05;

  // Explicit forced-result path retained for deterministic simulations and tooling.
  if (forceDNF) {
    return {
      result: "dnf",
      position: totalRacers,
      totalRacers,
      scrapsEarned: 0,
      repEarned: dnfRep,
      log: [pickFlavor("dnf"), `+${parseFloat(dnfRep.toFixed(1))} Rep (consolation)`],
      planEvaluation,
      rivalId: rival?.id,
      vehicleId: vehicle.id,
      circuitId: circuit.id,
    };
  }

  const odds = calculateOdds(
    performance,
    stats.reliability,
    circuit.difficulty,
    fatigue,
    performanceBonus,
    gearDnfReduction,
    skillPerformanceMult,
    skillDnfReduction,
    momentumWinBonus,
    forceDNF,
    planEvaluation,
    dnfChanceMultiplier,
  );
  const dnfChance = odds.dnfChance;
  if (random() < dnfChance) {
    return {
      result: "dnf",
      position: totalRacers,
      totalRacers,
      scrapsEarned: 0,
      repEarned: dnfRep,
      log: [pickFlavor("dnf"), `+${parseFloat(dnfRep.toFixed(1))} Rep (consolation)`],
      planEvaluation,
      rivalId: rival?.id,
      vehicleId: vehicle.id,
      circuitId: circuit.id,
    };
  }

  const won = random() < odds.winChance;
  // Finishing position follows the same effective performance as the win roll.
  const position = won ? 1 : losingPosition(odds.ratio, totalRacers);

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

  // Forge Token: very rare drop from high-tier circuit wins (tier 3+); gear bonus additive
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
    planEvaluation,
    rivalId: rival?.id,
    vehicleId: vehicle.id,
    circuitId: circuit.id,
  };
}

/**
 * Keep recent outcomes bounded without forgetting that a circuit was won.
 * Fleet Programs use retained circuit wins as their completion certificate.
 */
export function compactRaceHistory(
  outcomes: RaceOutcome[],
  maxEntries: number = 20,
): RaceOutcome[] {
  if (outcomes.length <= maxEntries) return outcomes;
  const requiredWinIndexes = new Set<number>();
  const representedCircuits = new Set<string>();
  for (let index = 0; index < outcomes.length; index++) {
    const outcome = outcomes[index];
    if (outcome.result !== "win" || representedCircuits.has(outcome.circuitId)) continue;
    representedCircuits.add(outcome.circuitId);
    requiredWinIndexes.add(index);
    if (requiredWinIndexes.size >= maxEntries) break;
  }
  const selectedIndexes = new Set(requiredWinIndexes);
  for (let index = 0; index < outcomes.length && selectedIndexes.size < maxEntries; index++) {
    selectedIndexes.add(index);
  }
  return outcomes.filter((_, index) => selectedIndexes.has(index));
}

/** Calculate condition points lost from a race. */
export function calculateWear(
  vehicle: BuiltVehicle,
  result: RaceResult,
  wearReductionPct: number,
  fatigue: number = 0,
  gearWearReduction: number = 0,
  skillWearReduction: number = 0,
  planWearMultiplier: number = 1,
): number {
  let wear = BASE_WEAR_PER_RACE;
  if (result === "dnf") wear += DNF_WEAR_BONUS;

  // Higher reliability = slower degradation (derived from parts + condition, never the cache)
  const reliability = deriveVehicleStats(vehicle).reliability;
  if (reliability > RELIABILITY_WEAR_THRESHOLD) {
    const reliabilityBonus = (reliability - RELIABILITY_WEAR_THRESHOLD) / 200;
    wear *= Math.max(0.3, 1 - reliabilityBonus);
  }

  // Workshop upgrade + gear + skill reduction
  wear *= Math.max(0, 1 - wearReductionPct - gearWearReduction - skillWearReduction);

  // Fatigue increases wear (tired mechanic = sloppier work)
  wear *= (1 + fatigue * 0.008);
  wear *= planWearMultiplier;

  return Math.round(Math.max(1, wear));
}
