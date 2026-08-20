import type { CircuitDefinition } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { BASE_WEAR_PER_RACE, DNF_WEAR_BONUS, RELIABILITY_WEAR_THRESHOLD } from "@/data/vehicles";
import { PART_DEFINITIONS, type PartCategory } from "@/data/parts";
import { makePartId } from "./scavenge";
import { chance, randInt, random, weightedPick } from "@/utils/random";
import type { ScavengedPart } from "./scavenge";
import type { BuiltVehicle } from "./build";
import { DEFAULT_RACE_PLAN, evaluateRacePlan, type RacePlan, type RacePlanEvaluation } from "@/data/raceStrategy";
import { RIVAL_DEFINITIONS } from "@/data/rivals";
import { buildEngineeringReport, type EngineeringReport } from "./engineeringDiagnostics";
import { calculateBuildCircuitEvaluation, type BuildCircuitEvaluation } from "./buildIdentity";
import { applyRaceControlEffect, buildRaceControlBriefing, type RaceControlCallId, type RaceControlEffect } from "./raceControl";

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
  /** Immutable diagnosis of the build as it entered this race. */
  engineeringReport?: EngineeringReport;
  /** Optional manual-only intervention applied to this race. */
  raceControlCall?: {
    id: RaceControlCallId;
    label: string;
    context: string;
    effect: RaceControlEffect;
  };
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
  return arr[Math.floor(random() * arr.length)];
}

function finalizeOutcome(
  outcome: RaceOutcome,
  vehicle: BuiltVehicle,
  circuit: CircuitDefinition,
): RaceOutcome {
  return {
    ...outcome,
    engineeringReport: buildEngineeringReport(vehicle, circuit, outcome),
  };
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
  skillPerformanceMult: number = 0,
  skillDnfReduction: number = 0,
  momentumWinBonus: number = 0,
  forceDNF: boolean = false,
  planEvaluation?: RacePlanEvaluation,
  dnfChanceMultiplier: number = 1,
): { winChance: number; dnfChance: number; oddsLabel: string } {
  const fatigueMult = 1 - fatigue * 0.005; // at 50 fatigue: -25% performance
  const effectivePerformance = performance * prestigeBonus * fatigueMult * (1 + gearPerformanceBonus) * (1 + skillPerformanceMult) * (planEvaluation?.performanceMultiplier ?? 1);
  const winChance = forceDNF ? 0 : Math.min(0.95, Math.max(0.05, effectivePerformance / (difficulty * 2) + momentumWinBonus));
  const dnfChance = forceDNF
    ? 1
    : Math.max(
        0,
        Math.min(
          0.95,
          (0.3 - reliability / 200 - gearDnfReduction - skillDnfReduction + (planEvaluation?.dnfDelta ?? 0)) *
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

  return { winChance, dnfChance, oddsLabel };
}

export interface CalculateVehicleOddsOptions {
  vehicle: BuiltVehicle;
  circuit: CircuitDefinition;
  prestigeBonus?: number;
  fatigue?: number;
  gearPerformanceBonus?: number;
  gearDnfReduction?: number;
  skillPerformanceMult?: number;
  skillDnfReduction?: number;
  momentumWinBonus?: number;
  forceDNF?: boolean;
  racePlan?: RacePlan;
  dnfChanceMultiplier?: number;
  raceControlCallId?: RaceControlCallId;
}

export interface VehicleOdds {
  winChance: number;
  dnfChance: number;
  oddsLabel: string;
  planEvaluation: RacePlanEvaluation;
  buildEvaluation: BuildCircuitEvaluation;
}

export function calculateVehicleOdds({
  vehicle,
  circuit,
  prestigeBonus = 1,
  fatigue = 0,
  gearPerformanceBonus = 0,
  gearDnfReduction = 0,
  skillPerformanceMult = 0,
  skillDnfReduction = 0,
  momentumWinBonus = 0,
  forceDNF = false,
  racePlan = DEFAULT_RACE_PLAN,
  dnfChanceMultiplier = 1,
  raceControlCallId,
}: CalculateVehicleOddsOptions): VehicleOdds {
  const definition = getVehicleById(vehicle.definitionId);
  const buildEvaluation = definition
    ? calculateBuildCircuitEvaluation(definition, vehicle, circuit.profile)
    : calculateBuildCircuitEvaluation({
        id: "unknown",
        name: "Unknown",
        tier: 0,
        description: "",
        slots: [],
        baseStats: { speed: 1, handling: 1, reliability: 1, weight: 0 },
        unlockRequirement: { type: "start" },
        buildCost: 0,
        sellValue: 0,
      }, vehicle, circuit.profile);
  const standingEvaluation = evaluateRacePlan(circuit.profile, racePlan);
  const planEvaluation = raceControlCallId
    ? applyRaceControlEffect(standingEvaluation, raceControlCallId)
    : standingEvaluation;
  const odds = calculateOdds(
    vehicle.stats.performance * buildEvaluation.performanceMultiplier,
    vehicle.stats.reliability,
    circuit.difficulty,
    prestigeBonus,
    fatigue,
    gearPerformanceBonus,
    gearDnfReduction,
    skillPerformanceMult,
    skillDnfReduction,
    momentumWinBonus,
    forceDNF,
    planEvaluation,
    dnfChanceMultiplier,
  );
  return { ...odds, planEvaluation, buildEvaluation };
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
  skillPerformanceMult: number = 0,
  skillDnfReduction: number = 0,
  forceDNF: boolean = false,
  racePlan: RacePlan = DEFAULT_RACE_PLAN,
  dnfChanceMultiplier: number = 1,
  raceControlCallId?: RaceControlCallId,
): RaceOutcome {
  const totalRacers = 8;
  const odds = calculateVehicleOdds({
    vehicle,
    circuit,
    prestigeBonus,
    fatigue,
    gearPerformanceBonus,
    gearDnfReduction,
    skillPerformanceMult,
    skillDnfReduction,
    momentumWinBonus,
    forceDNF,
    racePlan,
    dnfChanceMultiplier,
    raceControlCallId,
  });
  const { planEvaluation } = odds;
  const briefing = raceControlCallId ? buildRaceControlBriefing(circuit.profile) : undefined;
  const selectedCall = briefing?.calls.find((call) => call.id === raceControlCallId);
  const raceControlCall = selectedCall && briefing ? {
    id: selectedCall.id,
    label: selectedCall.label,
    context: briefing.context,
    effect: selectedCall.effect,
  } : undefined;
  const raceControlLog = raceControlCall
    ? `Race Control: ${raceControlCall.label} — pace ${Math.round((raceControlCall.effect.performanceMultiplier - 1) * 100)}%, DNF ${raceControlCall.effect.dnfDelta >= 0 ? "+" : ""}${(raceControlCall.effect.dnfDelta * 100).toFixed(1)} pts, wear ${Math.round((raceControlCall.effect.wearMultiplier - 1) * 100)}%.`
    : undefined;
  const eligibleRivals = RIVAL_DEFINITIONS.filter((rival) => circuit.tier >= rival.minCircuitTier && circuit.tier <= rival.maxCircuitTier);
  const rival = eligibleRivals.length > 0 && chance(0.35) ? eligibleRivals[randInt(0, eligibleRivals.length - 1)] : undefined;

  // Consolation Rep on DNF — matches what a last-place loss would earn
  // (repReward * 0.1 worst-position * 0.5 loss-mult = repReward * 0.05).
  // Keeps the economy consistent: DNF is never more rewarding than finishing last.
  const dnfRep = circuit.repReward * 0.05;

  // Explicit forced-result path retained for deterministic simulations and tooling.
  if (forceDNF) {
    return finalizeOutcome({
      result: "dnf",
      position: totalRacers,
      totalRacers,
      scrapsEarned: 0,
      repEarned: dnfRep,
      log: [pickFlavor("dnf"), `+${parseFloat(dnfRep.toFixed(1))} Rep (consolation)`, raceControlLog].filter((line): line is string => Boolean(line)),
      planEvaluation,
      raceControlCall,
      rivalId: rival?.id,
      vehicleId: vehicle.id,
      circuitId: circuit.id,
    }, vehicle, circuit);
  }

  const dnfChance = odds.dnfChance;
  if (random() < dnfChance) {
    return finalizeOutcome({
      result: "dnf",
      position: totalRacers,
      totalRacers,
      scrapsEarned: 0,
      repEarned: dnfRep,
      log: [pickFlavor("dnf"), `+${parseFloat(dnfRep.toFixed(1))} Rep (consolation)`, raceControlLog].filter((line): line is string => Boolean(line)),
      planEvaluation,
      raceControlCall,
      rivalId: rival?.id,
      vehicleId: vehicle.id,
      circuitId: circuit.id,
    }, vehicle, circuit);
  }

  const won = random() < odds.winChance;
  const position = won ? 1 : Math.floor(random() * (totalRacers - 2)) + 2;

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
    raceControlLog ?? "",
  ].filter(Boolean);

  return finalizeOutcome({
    result, position, totalRacers, scrapsEarned, repEarned, log,
    salvageDrop: salvageDrop ?? undefined,
    forgeTokenDrop: forgeTokenDrop || undefined,
    planEvaluation,
    raceControlCall,
    rivalId: rival?.id,
    vehicleId: vehicle.id,
    circuitId: circuit.id,
  }, vehicle, circuit);
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

  // Higher reliability = slower degradation
  if (vehicle.stats.reliability > RELIABILITY_WEAR_THRESHOLD) {
    const reliabilityBonus = (vehicle.stats.reliability - RELIABILITY_WEAR_THRESHOLD) / 200;
    wear *= Math.max(0.3, 1 - reliabilityBonus);
  }

  // Workshop upgrade + gear + skill reduction
  wear *= Math.max(0, 1 - wearReductionPct - gearWearReduction - skillWearReduction);

  // Fatigue increases wear (tired mechanic = sloppier work)
  wear *= (1 + fatigue * 0.008);
  wear *= planWearMultiplier;

  return Math.round(Math.max(1, wear));
}
