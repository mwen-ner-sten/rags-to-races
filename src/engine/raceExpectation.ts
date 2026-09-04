/**
 * Expected value of one automated race, using the exact odds, payout and
 * bonus algebra `computeTick` feeds into `simulateRace`, and the event chooser
 * that auto-race and the Race panel share.
 */
import type { GameState } from "@/state/store";
import { getUpgradeEffectValue } from "./workshopEffects";
import { getCircuitById, type CircuitDefinition, type EventId } from "@/data/circuits";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { DEFAULT_RACE_PLAN, evaluateRacePlan } from "@/data/raceStrategy";
import { applyRacePayout, collectBonuses, racePerformanceMultiplier } from "./bonuses";
import { getGearBonuses } from "./gear";
import { getSkillBonuses } from "./skills";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import { deriveVehicleStats, getCircuitPerformance } from "./performance";
import { calculateOdds } from "./race";
import { getOpenEventIds, isEventOpen, resolveEventCircuit, type EventCircuit } from "./eventLadder";

export interface RaceExpectation {
  circuitId: string;
  eventId: EventId;
  circuitTier: number;
  entryFee: number;
  /** Expected prize money after every bonus, before the entry fee. */
  scrapPerRace: number;
  /** Expected Rep after every bonus. */
  repPerRace: number;
  /** Expected salvage parts per race. */
  salvagePerRace: number;
  /** Expected Forge Tokens per race. */
  forgeTokensPerRace: number;
  winChance: number;
  dnfChance: number;
}

const TOTAL_RACERS = 8;

/** Auto-race only volunteers for events it can contest: win chance at or above this. */
export const AUTO_EVENT_MIN_WIN_CHANCE = 0.35;

/** Finishing position for a loss at the mean of `losingPosition`'s skill noise. */
function expectedLosingPosition(ratio: number): number {
  const t = Math.min(1, Math.max(0, (ratio - 0.3) / 1.4));
  const slots = TOTAL_RACERS - 2;
  return 2 + Math.min(slots - 1, Math.floor((1 - t) * slots));
}

/** Expected outcome of the active vehicle entering one specific event. */
export function expectedRaceOn(state: GameState, circuit: EventCircuit): RaceExpectation | null {
  const vehicle = state.garage.find((candidate) => candidate.id === state.activeVehicleId);
  if (!vehicle) return null;

  const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
  const permanent = getPermanentRuntimeBonuses(state);
  const skills = getSkillBonuses(state.racerSkills, circuit.tier);
  const bonuses = collectBonuses(state, circuit.tier);
  // The same handling bonus every derived stat block uses: Tuned Suspension plus equipment.
  const handlingBonusPct = getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct;
  const stats = deriveVehicleStats(vehicle, handlingBonusPct);
  const performance = getCircuitPerformance(stats, circuit);
  const planEvaluation = evaluateRacePlan(circuit.profile, state.currentRacePlan ?? DEFAULT_RACE_PLAN);
  const odds = calculateOdds(
    performance,
    stats.reliability,
    circuit.difficulty,
    state.fatigue ?? 0,
    racePerformanceMultiplier(bonuses) - 1,
    gear.race_dnf_reduction + permanent.raceDnfFlatReduction,
    0,
    skills.drivingDnfReduction,
    getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus"),
    false,
    planEvaluation,
    permanent.raceDnfChanceMultiplier,
  );

  const pDnf = odds.dnfChance;
  const pWin = (1 - pDnf) * odds.winChance;
  const pLoss = (1 - pDnf) * (1 - odds.winChance);
  const lossPosition = expectedLosingPosition(odds.ratio);
  const positionMultiplier = Math.max(0.1, (TOTAL_RACERS - lossPosition) / TOTAL_RACERS);

  const win = applyRacePayout(bonuses, { result: "win", scrapsEarned: circuit.rewardBase, repEarned: circuit.repReward }, state.winStreak + 1);
  const loss = applyRacePayout(bonuses, {
    result: "loss",
    scrapsEarned: Math.floor(circuit.rewardBase * positionMultiplier * 0.3),
    repEarned: circuit.repReward * positionMultiplier * 0.5,
  }, 0);
  const dnf = applyRacePayout(bonuses, { result: "dnf", scrapsEarned: 0, repEarned: circuit.repReward * 0.05 }, 0);

  const enhancedSalvage = getUpgradeEffectValue(state, "scavengers_eye") > 0;
  const forgeTokenChance = circuit.tier >= 3
    ? 0.02 + gear.forge_token_chance_bonus + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "forge_token_rate")
    : 0;

  return {
    circuitId: circuit.venueId,
    eventId: circuit.eventId,
    circuitTier: circuit.tier,
    entryFee: circuit.entryFee,
    scrapPerRace: pWin * win.scraps + pLoss * loss.scraps + pDnf * dnf.scraps,
    repPerRace: pWin * win.rep + pLoss * loss.rep + pDnf * dnf.rep,
    salvagePerRace: pWin * (enhancedSalvage ? 0.30 : 0.15),
    forgeTokensPerRace: pWin * Math.max(0, forgeTokenChance),
    winChance: odds.winChance,
    dnfChance: pDnf,
  };
}

/**
 * The event auto-race volunteers for at a venue: the open event with the
 * highest expected net payout among those the active vehicle can contest
 * (win chance at or above AUTO_EVENT_MIN_WIN_CHANCE). When nothing is
 * contestable it falls back to the open event with the best win chance, and
 * to the Sprint when there is no vehicle to judge with.
 */
export function chooseAutoEvent(state: GameState, venue: CircuitDefinition): EventCircuit {
  const open = getOpenEventIds(state.eventWins?.[venue.id]).map((eventId) => resolveEventCircuit(venue, eventId));
  const judged = open.flatMap((event) => {
    const expectation = expectedRaceOn(state, event);
    return expectation ? [{ event, expectation }] : [];
  });
  if (judged.length === 0) return open[0];
  const contestable = judged.filter(({ expectation }) => expectation.winChance >= AUTO_EVENT_MIN_WIN_CHANCE);
  if (contestable.length > 0) {
    return contestable.reduce((best, candidate) => {
      const bestNet = best.expectation.scrapPerRace - best.expectation.entryFee;
      const candidateNet = candidate.expectation.scrapPerRace - candidate.expectation.entryFee;
      return candidateNet > bestNet ? candidate : best;
    }).event;
  }
  return judged.reduce((best, candidate) => (candidate.expectation.winChance > best.expectation.winChance ? candidate : best)).event;
}

/**
 * The event a race at `circuitId` enters right now: the player's pinned
 * event when it is open, otherwise the auto choice. Manual entry, auto-race,
 * the rail's rates and the Race panel all read this.
 */
export function getActiveEventCircuit(state: GameState, circuitId: string = state.selectedCircuitId): EventCircuit | null {
  const venue = getCircuitById(circuitId);
  if (!venue) return null;
  const pinned = state.pinnedEventIds?.[venue.id];
  if (pinned && isEventOpen(pinned, state.eventWins?.[venue.id])) return resolveEventCircuit(venue, pinned);
  return chooseAutoEvent(state, venue);
}

/** Expected outcome of the active vehicle at the selected venue's active event. */
export function expectedRace(state: GameState): RaceExpectation | null {
  const circuit = getActiveEventCircuit(state);
  return circuit ? expectedRaceOn(state, circuit) : null;
}
