/**
 * Rep is spent to open content. These helpers are the one place the price of
 * a location, circuit, vehicle blueprint or Rep-gated workshop line is read,
 * so the store, the engine rates and the UI never disagree about a cost.
 */
import { CIRCUIT_DEFINITIONS, getCircuitById } from "@/data/circuits";
import { getLocationById, LOCATION_DEFINITIONS } from "@/data/locations";
import { getVehicleById } from "@/data/vehicles";
import { getUpgradeById } from "@/data/upgrades";

export interface RepSpender {
  repPoints: number;
}

/** Whether the spendable Rep balance covers `cost`. */
export function canAffordRep(state: RepSpender, cost: number): boolean {
  return Number.isFinite(cost) && cost >= 0 && (state.repPoints ?? 0) >= cost;
}

/** Rep price of a location; undefined for unknown ids. */
export function getLocationRepCost(locationId: string): number | undefined {
  return getLocationById(locationId)?.unlockCost;
}

/** Rep price of a circuit; undefined for unknown ids. */
export function getCircuitRepCost(circuitId: string): number | undefined {
  return getCircuitById(circuitId)?.unlockRepCost;
}

/**
 * Rep price of a vehicle blueprint. Only reputation-priced blueprints cost
 * Rep; start vehicles are free and race-progress blueprints are earned.
 */
export function getVehicleRepCost(vehicleId: string): number | undefined {
  const requirement = getVehicleById(vehicleId)?.unlockRequirement;
  if (!requirement) return undefined;
  return requirement.type === "reputation" ? requirement.amount : 0;
}

/** Rep price to open a workshop line (charged with its first level only). */
export function getWorkshopLineRepCost(upgradeId: string): number | undefined {
  const definition = getUpgradeById(upgradeId);
  if (!definition) return undefined;
  return definition.unlockRequirement?.repPoints ?? 0;
}

/** Circuits the player could open right now: affordable, feature-gated, not yet owned. */
export function getAffordableCircuitIds(
  state: RepSpender & { unlockedCircuitIds: readonly string[]; unlockedFeatures: readonly string[] },
): string[] {
  return CIRCUIT_DEFINITIONS
    .filter((circuit) => !state.unlockedCircuitIds.includes(circuit.id))
    .filter((circuit) => !circuit.requiredFeature || state.unlockedFeatures.includes(circuit.requiredFeature))
    .filter((circuit) => canAffordRep(state, circuit.unlockRepCost))
    .map((circuit) => circuit.id);
}

/** Locations the player could open right now. */
export function getAffordableLocationIds(
  state: RepSpender & { unlockedLocationIds: readonly string[] },
): string[] {
  return LOCATION_DEFINITIONS
    .filter((location) => !state.unlockedLocationIds.includes(location.id))
    .filter((location) => canAffordRep(state, location.unlockCost))
    .map((location) => location.id);
}
