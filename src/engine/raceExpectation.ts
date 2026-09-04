/**
 * Expected value of one automated race, using the exact odds, payout and
 * bonus algebra `computeTick` feeds into `simulateRace`.
 */
import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue } from "@/state/store";
import { getCircuitById } from "@/data/circuits";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { evaluateRacePlan } from "@/data/raceStrategy";
import { applyRacePayout, collectBonuses, racePerformanceMultiplier } from "./bonuses";
import { getGearBonuses } from "./gear";
import { getSkillBonuses } from "./skills";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import { deriveVehicleStats, getCircuitPerformance } from "./performance";
import { calculateOdds } from "./race";
import { getHandlingBonusPct } from "./tick";

export interface RaceExpectation {
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

/** Finishing position for a loss at the mean of `losingPosition`'s skill noise. */
function expectedLosingPosition(ratio: number): number {
  const t = Math.min(1, Math.max(0, (ratio - 0.3) / 1.4));
  const slots = TOTAL_RACERS - 2;
  return 2 + Math.min(slots - 1, Math.floor((1 - t) * slots));
}

export function expectedRace(state: GameState): RaceExpectation | null {
  const vehicle = state.garage.find((candidate) => candidate.id === state.activeVehicleId);
  const circuit = getCircuitById(state.selectedCircuitId);
  if (!vehicle || !circuit) return null;

  const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
  const permanent = getPermanentRuntimeBonuses(state);
  const skills = getSkillBonuses(state.racerSkills, circuit.tier);
  const bonuses = collectBonuses(state, circuit.tier);
  const handlingBonusPct = getHandlingBonusPct(state, gear.race_handling_pct);
  const stats = deriveVehicleStats(vehicle, handlingBonusPct);
  const performance = getCircuitPerformance(stats, circuit);
  const planEvaluation = evaluateRacePlan(circuit.profile, state.currentRacePlan);
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

  const enhancedSalvage = _getUpgradeEffectValue(state, "scavengers_eye") > 0;
  const forgeTokenChance = circuit.tier >= 3
    ? 0.02 + gear.forge_token_chance_bonus + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "forge_token_rate")
    : 0;

  return {
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
