import type { CircuitDefinition } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { calculateStats, compositePerformance, type BuiltVehicle, type VehicleStats } from "./build";

/**
 * ONE definition of "how good is this car".
 *
 * Every consumer — the HUD composite, race simulation, wear, gear drops and
 * the engineering debrief — derives stats fresh from the installed parts and
 * the vehicle's current condition, then (optionally) fits them to a circuit.
 * `BuiltVehicle.stats` is only a display cache; it is never the source of
 * truth for anything that changes an outcome.
 */

/**
 * How well a build fits a circuit: speed and handling are weighted by the
 * circuit's power vs. grip/aero demands, reliability by its reliability demand.
 */
export function getCircuitPerformance(
  stats: Pick<VehicleStats, "speed" | "handling" | "reliability">,
  circuit: Pick<CircuitDefinition, "profile">,
): number {
  const { power, grip, aero, reliability } = circuit.profile.demands;
  const reliabilityWeight = 0.15 + reliability * 0.01;
  const paceWeight = 1 - reliabilityWeight;
  const total = Math.max(1, power + grip + aero);
  const speedWeight = paceWeight * (power / total);
  const handlingWeight = paceWeight * ((grip + aero) / total);
  return stats.speed * speedWeight + stats.handling * handlingWeight + stats.reliability * reliabilityWeight;
}

/**
 * Fresh stats from parts + condition. Vehicles whose definition is unknown
 * (simulation fixtures) keep their snapshot, because there is nothing to
 * derive from.
 */
export function deriveVehicleStats(vehicle: BuiltVehicle, handlingBonusPct: number = 0): VehicleStats {
  const definition = getVehicleById(vehicle.definitionId);
  if (!definition) return vehicle.stats;
  return calculateStats(definition, vehicle.parts, vehicle.condition ?? 100, handlingBonusPct);
}

/** The same vehicle with its stats cache refreshed from parts + condition. */
export function withDerivedStats(vehicle: BuiltVehicle, handlingBonusPct: number = 0): BuiltVehicle {
  return { ...vehicle, stats: deriveVehicleStats(vehicle, handlingBonusPct) };
}

/**
 * The vehicle's performance number. With a circuit it is the circuit-fitted
 * value the race uses; without one it is the neutral composite shown in the
 * garage and HUD.
 */
export function vehiclePerformance(
  vehicle: BuiltVehicle,
  circuit?: Pick<CircuitDefinition, "profile">,
  handlingBonusPct: number = 0,
): number {
  const stats = deriveVehicleStats(vehicle, handlingBonusPct);
  return circuit ? getCircuitPerformance(stats, circuit) : compositePerformance(stats);
}
