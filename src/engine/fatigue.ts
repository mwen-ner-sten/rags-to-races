/**
 * Fatigue rhythm (Phase 2, lever 1).
 *
 * Fatigue is a stateful resource in 0–99. Every race adds a fixed amount
 * scaled by the circuit tier; wall-clock time removes it at a steady rate,
 * applied per tick from the tick's real length so live play and offline
 * catch-up agree exactly. Nothing here reads lifetimeRaces.
 *
 * Modifier mapping (old lifetime-race curve → rhythm model):
 *
 * | Modifier                                  | Old meaning                         | New meaning                                  |
 * |-------------------------------------------|-------------------------------------|----------------------------------------------|
 * | station gear `fatigue_rate_reduction`     | multiplies the curve value          | multiplies fatigue gained per race           |
 * | owner `fatigue_rate_reduction`            | multiplies the curve value          | multiplies fatigue gained per race           |
 * | momentum "Second Wind" `fatigue_reduction`| multiplies the curve value          | multiplies fatigue gained per race           |
 * | permanent (achievement + playstyle)       | multiplies the curve value          | multiplies fatigue gained per race           |
 * | racer skill endurance offset (0–20)       | subtracted races before the curve   | +2.5% recovery rate per point (up to +50%)   |
 * | legacy "Iron Will" `leg_fatigue_offset`   | subtracted 5 races/level            | +10% recovery rate per level (up to +100%)   |
 * | team "Second Wind" `fatigue_cap_reduction`| lowered the 99 cap                  | unchanged: lowers the cap                    |
 * | Fatigue Drink                             | one-off -10                         | unchanged: one-off -10                       |
 *
 * Gain reductions stack additively and clamp at 0; recovery bonuses stack
 * additively on top of the base rate.
 */
import type { GameState } from "@/state/store";
import { FATIGUE, fatiguePerRace } from "@/config/progression";
import { getGearBonuses } from "./gear";
import { getSkillBonuses } from "./skills";
import { getLegacyEffectValue } from "./prestige";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import { getGameEffectValue } from "@/data/gameEffects";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { getMomentumEffectValue } from "@/data/momentumBonuses";

const MS_PER_HOUR = 3_600_000;
/** Endurance skill offset (0–20) → recovery bonus (0–0.5). */
const ENDURANCE_RECOVERY_PER_POINT = 0.025;
/** Iron Will authored value (5 per level) → recovery bonus (0.1 per level). */
const IRON_WILL_RECOVERY_PER_VALUE = 0.02;

/** Round to a millifatigue so per-tick recovery cannot drift into float noise. */
export function roundFatigue(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

/** Highest fatigue the driver can reach (team Second Wind lowers it). */
export function getFatigueCap(state: GameState): number {
  const reduction = getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels ?? {}, "fatigue_cap_reduction");
  return Math.max(0, FATIGUE.MAX - reduction);
}

/** Multiplier applied to the fatigue one race adds (0 when fully reduced). */
export function getFatigueGainMultiplier(state: GameState): number {
  const gear = getGearBonuses(
    state.equippedLootGear,
    state.lootGearInventory,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const reduction = gear.fatigue_rate_reduction
    + getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels ?? {}, "fatigue_rate_reduction")
    + getMomentumEffectValue(state.activeMomentumTiers ?? [], "fatigue_reduction")
    + getPermanentRuntimeBonuses(state).fatigueReduction;
  return Math.max(0.2, 1 - reduction);
}

/** Fatigue one race at `circuitTier` adds after every rate modifier. */
export function getFatigueGainPerRace(state: GameState, circuitTier: number): number {
  return fatiguePerRace(circuitTier) * getFatigueGainMultiplier(state);
}

/** Fatigue recovered per wall-clock hour after skill and legacy bonuses. */
export function getFatigueRecoveryPerHour(state: GameState, circuitTier: number = 1): number {
  const endurance = getSkillBonuses(state.racerSkills, circuitTier).enduranceFatigueOffset;
  const ironWill = getLegacyEffectValue(state.legacyUpgradeLevels ?? {}, "leg_fatigue_offset");
  const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory);
  const bonus = endurance * ENDURANCE_RECOVERY_PER_POINT + ironWill * IRON_WILL_RECOVERY_PER_VALUE + gear.fatigue_recovery_pct;
  return FATIGUE.RECOVERY_PER_HOUR * (1 + bonus);
}

/** Fatigue after `dtMs` of rest at `recoveryPerHour`. */
export function recoverFatigue(fatigue: number, dtMs: number, recoveryPerHour: number): number {
  if (!(dtMs > 0) || !(recoveryPerHour > 0)) return roundFatigue(Math.max(0, fatigue));
  return roundFatigue(Math.max(0, fatigue - recoveryPerHour * (dtMs / MS_PER_HOUR)));
}

/** Fatigue after one race at `circuitTier`, clamped to the cap. */
export function fatigueAfterRace(state: GameState, fatigue: number, circuitTier: number): number {
  return roundFatigue(Math.min(getFatigueCap(state), Math.max(0, fatigue) + getFatigueGainPerRace(state, circuitTier)));
}

/**
 * Fatigue after one tick of `tickMs`: rest for the whole tick, then add the
 * races that fired. Live ticks and offline replay both call this.
 */
export function fatigueAfterTick(
  state: GameState,
  fatigue: number,
  tickMs: number,
  racesCompleted: number,
  circuitTier: number,
): number {
  let next = recoverFatigue(fatigue, tickMs, getFatigueRecoveryPerHour(state, circuitTier));
  for (let race = 0; race < racesCompleted; race++) next = fatigueAfterRace(state, next, circuitTier);
  return next;
}

/** Whether auto-race should rest instead of entering at this fatigue. */
export function isTooTiredToAutoRace(state: GameState): boolean {
  const ceiling = state.autoRaceMaxFatigue ?? FATIGUE.AUTO_RACE_MAX_DEFAULT;
  return (state.fatigue ?? 0) > ceiling;
}
