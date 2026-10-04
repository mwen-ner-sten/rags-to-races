import { specialtyPerformance } from "./campaign";
import { CIRCUIT_DEFINITIONS, type CircuitDefinition } from "@/data/circuits";
/**
 * ONE bonus algebra.
 *
 * Every multiplier source in the game is collected into a named channel
 * (race Scrap Bucks, race Rep, part sale value, race performance) as a
 * `BonusStack`: a map from *source class* to the class's total bonus.
 *
 *   Rule: bonuses ADD within a source class and MULTIPLY across classes.
 *
 *   payout = base × Π_class (1 + Σ_sources-in-class bonus)
 *
 * Source classes:
 *   workshop   – workshop upgrades (Consolation Sponsor, …)
 *   equipment  – gear, loot gear, station equipment, talents (getGearBonuses)
 *   skills     – racer skills (getSkillBonuses)
 *   momentum   – active momentum tiers
 *   legacy     – Legacy upgrades bought with LP (prestigeBonus)
 *   milestone  – prestige-count milestones
 *   permanent  – achievements, Garage Philosophy, crew (getPermanentRuntimeBonuses),
 *                plus the Garage Philosophy win-streak Scrap Bucks bonus
 *   team/owner/track – Team, Owner and Track era upgrades
 *   plan       – the race plan's situational multiplier
 *
 * Why this shape: two +20% bonuses from the *same* system are one +40%
 * decision, while a +20% from gear and a +20% from momentum are two separate
 * investments and should compound. Composing every payout through
 * `composeBonus` guarantees manual races, automated races, offline catch-up
 * and part sales all agree, and that no source is applied twice.
 *
 * Penalties that are not "bonuses" (fatigue, vehicle condition, DNF risk) stay
 * in their own formulas; a class value below -1 clamps the factor to 0 so a
 * payout can never go negative.
 */

import type { GameState } from "@/state/store";
import { getUpgradeEffectValue } from "./workshopEffects";
import { getGearBonuses } from "./gear";
import { getSkillBonuses } from "./skills";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import type { RaceResult } from "./race";

export type BonusClass =
  | "workshop"
  | "equipment"
  | "skills"
  | "momentum"
  | "legacy"
  | "milestone"
  | "permanent"
  | "team"
  | "owner"
  | "track"
  | "plan";

export type BonusStack = Partial<Record<BonusClass, number>>;

export interface Bonuses {
  /** Race prize money (wins and losses alike). */
  raceScrap: BonusStack;
  /** Extra classes applied on top of `raceScrap` for non-win payouts. */
  consolationScrap: BonusStack;
  /** Race Rep. */
  raceRep: BonusStack;
  /** Part, add-on and vehicle sale value. */
  sellValue: BonusStack;
  /** Race performance (applied before the win curve; fatigue and plan are separate). */
  racePerformance: BonusStack;
  /** Garage Philosophy: extra Scrap Bucks per win in the current streak, capped. */
  winStreakScrap: { perWin: number; cap: number };
}

/** Add a bonus to a class (bonuses within a class are additive). Returns a new stack. */
export function addToClass(stack: BonusStack, bonusClass: BonusClass, value: number): BonusStack {
  if (value === 0) return stack;
  return { ...stack, [bonusClass]: (stack[bonusClass] ?? 0) + value };
}

/** Multiply across classes: Π (1 + classTotal), each factor floored at 0. */
export function composeBonus(...stacks: BonusStack[]): number {
  let multiplier = 1;
  for (const stack of stacks) {
    for (const value of Object.values(stack)) {
      multiplier *= Math.max(0, 1 + (value ?? 0));
    }
  }
  return multiplier;
}

/** Collect every multiplier source in the current state into named channels. */
export function collectBonuses(state: GameState, circuitTier: number = 0, raceCircuit?: CircuitDefinition): Bonuses {
  const gear = getGearBonuses(
    state.equippedLootGear,
    state.lootGearInventory,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const permanent = getPermanentRuntimeBonuses(state);
  const milestone = getPrestigeMilestoneBonuses(state.prestigeCount);
  const skills = getSkillBonuses(state.racerSkills, circuitTier);
  const momentum = state.activeMomentumTiers ?? [];
  const momentumScrap = getMomentumEffectValue(momentum, "scrap_multiplier");
  const momentumRep = getMomentumEffectValue(momentum, "rep_multiplier");
  const legacyScrap = (state.prestigeBonus?.scrapMultiplier ?? 1) - 1;
  const legacyRep = (state.prestigeBonus?.repMultiplier ?? 1) - 1;

  let raceScrap: BonusStack = {};
  raceScrap = addToClass(raceScrap, "equipment", gear.race_scrap_bonus_pct);
  raceScrap = addToClass(raceScrap, "momentum", momentumScrap);
  raceScrap = addToClass(raceScrap, "legacy", legacyScrap);
  raceScrap = addToClass(raceScrap, "milestone", milestone.raceScrapMult);
  raceScrap = addToClass(raceScrap, "permanent", permanent.allScrapIncomeMult + permanent.raceScrapMult);

  let consolationScrap: BonusStack = {};
  consolationScrap = addToClass(consolationScrap, "workshop", getUpgradeEffectValue(state, "consolation_sponsor"));

  let raceRep: BonusStack = {};
  raceRep = addToClass(raceRep, "momentum", momentumRep);
  raceRep = addToClass(raceRep, "legacy", legacyRep);
  raceRep = addToClass(raceRep, "milestone", milestone.raceRepMult);
  raceRep = addToClass(raceRep, "permanent", permanent.allRepIncomeMult + permanent.raceRepMult);

  let sellValue: BonusStack = {};
  sellValue = addToClass(sellValue, "equipment", gear.sell_value_bonus_pct);
  sellValue = addToClass(sellValue, "momentum", momentumScrap);
  sellValue = addToClass(sellValue, "permanent", permanent.sellValueMult + permanent.allScrapIncomeMult);

  let racePerformance: BonusStack = {};
  const circuit = raceCircuit ?? CIRCUIT_DEFINITIONS.find((c) => c.tier === circuitTier);
  if (circuit) racePerformance = addToClass(racePerformance, "owner", specialtyPerformance(state.campaign?.specialty, circuit));
  racePerformance = addToClass(racePerformance, "equipment", gear.race_performance_pct);
  racePerformance = addToClass(racePerformance, "team", getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "base_race_performance"));
  racePerformance = addToClass(racePerformance, "permanent", permanent.racePerformanceBonus);
  racePerformance = addToClass(racePerformance, "skills", skills.drivingPerformanceMult);

  return {
    raceScrap,
    consolationScrap,
    raceRep,
    sellValue,
    racePerformance,
    winStreakScrap: { perWin: permanent.winStreakScrapBonus, cap: permanent.winStreakScrapCap },
  };
}

/** Additive sell-value bonus (multiplier − 1) for `getPartSaleValue` and friends. */
export function sellValueBonus(bonuses: Bonuses): number {
  return composeBonus(bonuses.sellValue) - 1;
}

/** Race performance multiplier from every bonus class (fatigue and plan excluded). */
export function racePerformanceMultiplier(bonuses: Bonuses): number {
  return composeBonus(bonuses.racePerformance);
}

export interface RacePayoutInput {
  result: RaceResult;
  scrapsEarned: number;
  repEarned: number;
}

export interface RacePayout {
  scraps: number;
  rep: number;
}

/**
 * Gross race payout after every bonus. `projectedStreak` is the win streak
 * including this race (0 after a loss or DNF).
 */
export function applyRacePayout(bonuses: Bonuses, outcome: RacePayoutInput, projectedStreak: number): RacePayout {
  const streakBonus = Math.min(bonuses.winStreakScrap.cap, Math.max(0, projectedStreak) * bonuses.winStreakScrap.perWin);
  const scrapStack = addToClass(bonuses.raceScrap, "permanent", streakBonus);
  const scrapMultiplier = outcome.result === "win"
    ? composeBonus(scrapStack)
    : composeBonus(scrapStack, bonuses.consolationScrap);
  return {
    scraps: Math.max(0, Math.floor(outcome.scrapsEarned * scrapMultiplier)),
    rep: outcome.repEarned * composeBonus(bonuses.raceRep),
  };
}
