import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue, calculateFatigue } from "@/state/store";
import { scavenge } from "./scavenge";
import type { ScavengedPart } from "./scavenge";
import { getGearBonuses } from "./gear";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { simulateRace, calculateWear } from "./race";
import { rollGearDrops } from "./gearDrop";
import type { LootGearItem, InstalledMod } from "@/data/lootGear";
import { TALENT_NODES } from "@/data/talentNodes";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { getLegacyEffectValue } from "./prestige";

/** Base tick duration — 15 seconds. */
export const TICK_MS_DEFAULT = 15_000;
/** Minimum tick duration — 0.1 seconds. */
export const TICK_MS_MIN = 100;
/** Default number of ticks required to fire one auto-race. */
export const RACE_TICKS_DEFAULT = 3;
/** Minimum number of ticks required to fire one auto-race. */
export const RACE_TICKS_MIN = 1;

export interface TickResult {
  partsFound: ReturnType<typeof scavenge>;
  scrapsEarned: number;
  repEarned: number;
  raceOutcome: ReturnType<typeof simulateRace> | null;
  vehicleWearAmount: number;
  vehicleRepairAmount: number;
  lootGearDrops: LootGearItem[];
  modDrops: InstalledMod[];
  /** Updated race tick progress (0 = just fired, or incremented counter). */
  newRaceTickProgress: number;
}

/**
 * Returns the current tick interval in ms, factoring in workshop upgrades and gear.
 * Clamped to [TICK_MS_MIN, TICK_MS_DEFAULT].
 */
export function computeTickSpeedMs(state: GameState): number {
  const upgradeReductionMs =
    _getUpgradeEffectValue(state, "tick_accelerator") +
    _getUpgradeEffectValue(state, "overclocked_tick");
  const gearBonuses = getGearBonuses(state.equippedGear);
  const gearReductionMs = (gearBonuses.tick_speed_reduction_ms ?? 0);
  return Math.max(TICK_MS_MIN, TICK_MS_DEFAULT - upgradeReductionMs - gearReductionMs);
}

/**
 * Returns how many ticks must pass before one auto-race fires.
 * Clamped to [RACE_TICKS_MIN, RACE_TICKS_DEFAULT].
 */
export function getRaceTicksNeeded(state: GameState): number {
  const reduction = _getUpgradeEffectValue(state, "pit_crew");
  return Math.max(RACE_TICKS_MIN, RACE_TICKS_DEFAULT - reduction);
}

/** Pure function: compute one tick of idle progress */
export function computeTick(state: GameState): TickResult {
  const result: TickResult = {
    partsFound: [],
    scrapsEarned: 0,
    repEarned: 0,
    raceOutcome: null,
    vehicleWearAmount: 0,
    vehicleRepairAmount: 0,
    lootGearDrops: [],
    modDrops: [],
    newRaceTickProgress: state.raceTickProgress,
  };

  const gearBonuses = getGearBonuses(
    state.equippedGear,
    state.equippedLootGear,
    state.lootGearInventory,
    state.unlockedTalentNodes,
    TALENT_NODES,
  );

  // ── Shared gear lab workshop values ──────────────────────────────────────
  const gearDropRateScavengeBonus = _getUpgradeEffectValue(state, "gear_scavenger");
  const gearDropRateRaceBonus     = _getUpgradeEffectValue(state, "trophy_hunter");
  const rarityBonus               = Math.floor(_getUpgradeEffectValue(state, "rarity_sense"));
  const doubleDropChance          = _getUpgradeEffectValue(state, "double_drop");
  const modDropRateBonus          = _getUpgradeEffectValue(state, "mod_hunter");

  // Auto-scavenge (with workshop upgrade bonuses + gear bonuses) — fires every tick
  if (state.autoScavengeUnlocked && state.selectedLocationId) {
    const location = getLocationById(state.selectedLocationId);
    if (location) {
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue ?? 0;
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue, gearBonuses.scavenge_luck_bonus, gearBonuses.scavenge_yield_pct);
      // Add extra parts from Deep Pockets
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue, gearBonuses.scavenge_luck_bonus, gearBonuses.scavenge_yield_pct);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      result.partsFound = parts;

      // Gear drop roll from auto-scavenge
      const { gearDrops, modDrop } = rollGearDrops({
        source: "scavenge",
        sourceTier: location.tier,
        sourceId: location.id,
        winStreak: state.winStreak,
        gearDropRateScavengeBonus,
        gearDropRateRaceBonus,
        rarityBonus,
        doubleDropChance,
        modDropRateBonus,
      });
      result.lootGearDrops.push(...gearDrops);
      if (modDrop) result.modDrops.push(modDrop);
    }
  }

  // Auto-race — fires every N ticks (multi-tick)
  if (state.autoRaceUnlocked && state.activeVehicleId && state.selectedCircuitId) {
    const raceTicksNeeded = getRaceTicksNeeded(state);
    const newRaceProgress = state.raceTickProgress + 1;

    if (newRaceProgress >= raceTicksNeeded) {
      // Time to race — reset progress
      result.newRaceTickProgress = 0;

      const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
      const circuit = getCircuitById(state.selectedCircuitId);

      if (vehicle && circuit) {
        const vehicleCondition = vehicle.condition ?? 100;

        // Auto-repair if upgrade exists and vehicle needs it
        const autoRepairRate = _getUpgradeEffectValue(state, "auto_repair");
        if (autoRepairRate > 0 && vehicleCondition < 100) {
          result.vehicleRepairAmount = Math.min(Math.floor(autoRepairRate), 100 - vehicleCondition);
        }

        // Only race if vehicle is functional and can afford entry
        if (vehicleCondition > 0 && state.scrapBucks >= circuit.entryFee) {
          const fatigue = state.fatigue ?? 0;
          const momentumWinBonus = getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus");
          result.raceOutcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier, fatigue, gearBonuses.race_performance_pct, gearBonuses.race_dnf_reduction, 0.15, 1, momentumWinBonus, gearBonuses.forge_token_chance_bonus);

          // Apply consolation sponsor bonus
          const consolationBonus = _getUpgradeEffectValue(state, "consolation_sponsor");
          let scraps = result.raceOutcome.scrapsEarned;
          if (result.raceOutcome.result !== "win" && consolationBonus > 0) {
            scraps = Math.floor(scraps * (1 + consolationBonus));
          }
          // Gear race scrap bonus
          if (gearBonuses.race_scrap_bonus_pct > 0) {
            scraps = Math.floor(scraps * (1 + gearBonuses.race_scrap_bonus_pct));
          }
          // Apply momentum scrap/rep multipliers
          const momentumScrapMult = getMomentumEffectValue(state.activeMomentumTiers, "scrap_multiplier");
          const momentumRepMult = getMomentumEffectValue(state.activeMomentumTiers, "rep_multiplier");
          result.scrapsEarned += Math.floor(scraps * (1 + momentumScrapMult)) - circuit.entryFee;
          result.repEarned += result.raceOutcome.repEarned * state.prestigeBonus.repMultiplier * (1 + momentumRepMult);

          // Calculate wear (workshop + gear + legacy reduction)
          const wearReduction = _getUpgradeEffectValue(state, "reinforced_chassis");
          const legacyWearReduction = getLegacyEffectValue(state.legacyUpgradeLevels, "leg_wear_reduction");
          result.vehicleWearAmount = calculateWear(vehicle, result.raceOutcome.result, wearReduction + legacyWearReduction, fatigue, gearBonuses.race_wear_reduction_pct);

          // Gear drop roll from auto-race
          const vehiclePerf = vehicle.stats
            ? vehicle.stats.speed / (circuit.difficulty || 1)
            : 1;
          const { gearDrops, modDrop } = rollGearDrops({
            source: "race",
            sourceTier: circuit.tier,
            sourceId: circuit.id,
            raceResult: result.raceOutcome.result,
            winStreak: state.winStreak,
            vehiclePerformance: vehiclePerf,
            gearDropRateScavengeBonus,
            gearDropRateRaceBonus,
            rarityBonus,
            doubleDropChance,
            modDropRateBonus,
          });
          result.lootGearDrops.push(...gearDrops);
          if (modDrop) result.modDrops.push(modDrop);
        }
      }
    } else {
      // Accumulate tick progress toward next race
      result.newRaceTickProgress = newRaceProgress;
    }
  }

  return result;
}

// ── Offline catch-up simulation ───────────────────────────────────────────

export interface OfflineResult {
  partsFound: ScavengedPart[];
  scrapsEarned: number;
  repEarned: number;
  vehicleWearTotal: number;
  vehicleRepairTotal: number;
  raceTickProgress: number;
  lootGearDrops: LootGearItem[];
  modDrops: InstalledMod[];
  /** Actual number of races that fired during offline simulation. */
  racesCompleted: number;
  ticksProcessed: number;
}

/**
 * Simulate multiple ticks of offline progress with proper state evolution.
 * Unlike the old inline loop, this evolves vehicle condition, scrapBucks,
 * fatigue, winStreak, and lifetimeRaces between ticks so that the simulation
 * matches what would have happened if the player were online.
 */
export function simulateOfflineTicks(
  initialState: GameState,
  maxTicks: number,
): OfflineResult {
  const result: OfflineResult = {
    partsFound: [],
    scrapsEarned: 0,
    repEarned: 0,
    vehicleWearTotal: 0,
    vehicleRepairTotal: 0,
    raceTickProgress: initialState.raceTickProgress,
    lootGearDrops: [],
    modDrops: [],
    racesCompleted: 0,
    ticksProcessed: 0,
  };

  if (maxTicks <= 0) return result;

  // Create a mutable snapshot of state fields that evolve between ticks.
  // We shallow-clone garage so we can mutate vehicle condition in place.
  const snap: GameState = {
    ...initialState,
    garage: initialState.garage.map((v) => ({ ...v })),
  };

  for (let i = 0; i < maxTicks; i++) {
    const tickState: GameState = { ...snap, raceTickProgress: result.raceTickProgress };
    const r = computeTick(tickState);

    // Accumulate totals
    result.partsFound = result.partsFound.concat(r.partsFound);
    result.scrapsEarned += r.scrapsEarned;
    result.repEarned += r.repEarned;
    result.vehicleWearTotal += r.vehicleWearAmount;
    result.vehicleRepairTotal += r.vehicleRepairAmount;
    result.raceTickProgress = r.newRaceTickProgress;
    result.lootGearDrops = result.lootGearDrops.concat(r.lootGearDrops);
    result.modDrops = result.modDrops.concat(r.modDrops);
    result.ticksProcessed++;

    // ── Evolve state for next tick ──

    // Update scrapBucks (scrapsEarned already has entry fee subtracted)
    snap.scrapBucks += r.scrapsEarned;

    // Track if a race happened this tick
    const raced = r.raceOutcome !== null;
    if (raced) {
      result.racesCompleted++;

      // Update win streak
      snap.winStreak = r.raceOutcome!.result === "win" ? snap.winStreak + 1 : 0;

      // Update lifetime races & fatigue
      snap.lifetimeRaces += 1;
      const fatigueOffset = getLegacyEffectValue(snap.legacyUpgradeLevels, "leg_fatigue_offset");
      const gearBonuses = getGearBonuses(snap.equippedGear, snap.equippedLootGear, snap.lootGearInventory, snap.unlockedTalentNodes, TALENT_NODES);
      const rawFatigue = calculateFatigue(snap.lifetimeRaces, fatigueOffset);
      snap.fatigue = Math.floor(rawFatigue * (1 - gearBonuses.fatigue_rate_reduction));
    }

    // Update vehicle condition (wear + repair)
    if (snap.activeVehicleId && (r.vehicleWearAmount > 0 || r.vehicleRepairAmount > 0)) {
      const vehicle = snap.garage.find((v) => v.id === snap.activeVehicleId);
      if (vehicle) {
        let cond = vehicle.condition ?? 100;
        if (r.vehicleWearAmount > 0) cond = Math.max(0, cond - r.vehicleWearAmount);
        if (r.vehicleRepairAmount > 0) cond = Math.min(100, cond + r.vehicleRepairAmount);
        vehicle.condition = cond;
      }
    }
  }

  return result;
}
