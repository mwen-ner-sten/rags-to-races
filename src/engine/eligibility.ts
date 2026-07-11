import type { BuiltVehicle } from "./build";
import { getCircuitById, type CircuitDefinition } from "@/data/circuits";
import { getLocationById } from "@/data/locations";
import { getVehicleById } from "@/data/vehicles";

export interface RaceEligibilityState {
  activeVehicleId: string | null;
  garage: BuiltVehicle[];
  selectedCircuitId: string;
  unlockedCircuitIds: string[];
  scrapBucks: number;
  isRacing?: boolean;
}

export type RaceIneligibilityReason =
  | "already_racing"
  | "no_vehicle"
  | "circuit_locked"
  | "vehicle_broken"
  | "vehicle_tier_low"
  | "vehicle_tier_high"
  | "entry_fee";

export type VehicleCircuitIneligibilityReason =
  | "no_vehicle"
  | "circuit_locked"
  | "vehicle_broken"
  | "vehicle_tier_low"
  | "vehicle_tier_high";

/**
 * Shared physical eligibility for every system that sends a vehicle onto a
 * circuit. Race-only concerns such as entry fees and unlock state remain in
 * getRaceIneligibilityReason.
 */
export function getVehicleCircuitIneligibilityReason(
  vehicle: BuiltVehicle | undefined,
  circuit: CircuitDefinition | undefined,
): VehicleCircuitIneligibilityReason | null {
  if (!vehicle) return "no_vehicle";
  if (!circuit) return "circuit_locked";
  if ((vehicle.condition ?? 100) <= 0) return "vehicle_broken";
  const definition = getVehicleById(vehicle.definitionId);
  if (!definition || definition.tier < circuit.minVehicleTier) return "vehicle_tier_low";
  if (definition.tier > circuit.maxVehicleTier) return "vehicle_tier_high";
  return null;
}

export function getRaceIneligibilityReason(state: RaceEligibilityState): RaceIneligibilityReason | null {
  if (state.isRacing) return "already_racing";
  const vehicle = state.garage.find((candidate) => candidate.id === state.activeVehicleId);
  if (!vehicle) return "no_vehicle";
  const circuit = getCircuitById(state.selectedCircuitId);
  if (!circuit || !state.unlockedCircuitIds.includes(circuit.id)) return "circuit_locked";
  const physicalReason = getVehicleCircuitIneligibilityReason(vehicle, circuit);
  if (physicalReason) return physicalReason;
  if (state.scrapBucks < circuit.entryFee) return "entry_fee";
  return null;
}

export function canEnterSelectedRace(state: RaceEligibilityState): boolean {
  return getRaceIneligibilityReason(state) === null;
}

export function canScavengeSelectedLocation(state: {
  selectedLocationId: string;
  unlockedLocationIds: string[];
}): boolean {
  return Boolean(
    getLocationById(state.selectedLocationId)
      && state.unlockedLocationIds.includes(state.selectedLocationId),
  );
}
