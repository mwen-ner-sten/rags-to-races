import { TALENT_NODES } from "@/data/talentNodes";
import { getUpgradeById } from "@/data/upgrades";
import { getVehicleById } from "@/data/vehicles";
import { getPermanentRuntimeBonuses } from "@/engine/permanentBonuses";
import { getGearBonuses } from "@/engine/gear";
import type { GameState } from "@/state/store";
import { calculateStats, type BuiltVehicle } from "./build";

type VehicleStatState = Pick<
  GameState,
  | "garage"
  | "workshopLevels"
  | "equippedGear"
  | "equippedLootGear"
  | "lootGearInventory"
  | "unlockedTalentNodes"
  | "equippedStationEquipment"
  | "stationEquipmentInventory"
  | "unlockedPlaystyleNodes"
  | "earnedAchievements"
  | "crewRoster"
>;

export function getEffectiveVehicleHandlingBonus(state: VehicleStatState): number {
  const gear = getGearBonuses(
    state.equippedGear,
    state.equippedLootGear,
    state.lootGearInventory,
    state.unlockedTalentNodes,
    TALENT_NODES,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const tunedSuspension = getUpgradeById("tuned_suspension");
  const level = state.workshopLevels.tuned_suspension ?? 0;
  const workshopEffectBonus = getPermanentRuntimeBonuses(state).workshopEffectBonus;
  const tunedSuspensionBonus = tunedSuspension
    ? tunedSuspension.effect.valuePerLevel * level * (1 + workshopEffectBonus)
    : 0;
  return tunedSuspensionBonus + gear.race_handling_pct;
}

export function recalculateGarageStats(state: VehicleStatState): BuiltVehicle[] {
  const handlingBonus = getEffectiveVehicleHandlingBonus(state);
  return state.garage.map((vehicle) => {
    const definition = getVehicleById(vehicle.definitionId);
    return definition
      ? { ...vehicle, stats: calculateStats(definition, vehicle.parts, vehicle.condition ?? 100, handlingBonus) }
      : vehicle;
  });
}
