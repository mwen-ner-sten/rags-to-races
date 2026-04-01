import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue } from "@/state/store";
import { scavenge } from "./scavenge";
import { getGearBonuses } from "./gear";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { simulateRace, calculateWear } from "./race";
import { rollGearDrops } from "./gearDrop";
import type { LootGearItem, InstalledMod } from "@/data/lootGear";
import { TALENT_NODES } from "@/data/talentNodes";

export const TICK_MS = 1000; // game ticks every second

export interface TickResult {
  partsFound: ReturnType<typeof scavenge>;
  scrapsEarned: number;
  repEarned: number;
  raceOutcome: ReturnType<typeof simulateRace> | null;
  vehicleWearAmount: number;
  vehicleRepairAmount: number;
  lootGearDrops: LootGearItem[];
  modDrops: InstalledMod[];
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

  // Auto-scavenge (with workshop upgrade bonuses + gear bonuses)
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

  // Auto-race (with wear and auto-repair)
  if (state.autoRaceUnlocked && state.activeVehicleId && state.selectedCircuitId) {
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
        result.raceOutcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier, fatigue, gearBonuses.race_performance_pct, gearBonuses.race_dnf_reduction);

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
        result.scrapsEarned += scraps - circuit.entryFee;
        result.repEarned += result.raceOutcome.repEarned;

        // Calculate wear (workshop + gear reduction)
        const wearReduction = _getUpgradeEffectValue(state, "reinforced_chassis");
        result.vehicleWearAmount = calculateWear(vehicle, result.raceOutcome.result, wearReduction, fatigue, gearBonuses.race_wear_reduction_pct);

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
  }

  return result;
}
