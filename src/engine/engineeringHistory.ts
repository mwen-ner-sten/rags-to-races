import { getCircuitById } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import type { BuiltVehicle } from "./build";
import type { RaceOutcome } from "./race";

export type EngineeringHistoryVehicleAvailability = "available" | "sold-or-missing" | "legacy";

export interface EngineeringHistoryEntry {
  result: RaceOutcome["result"];
  position: number;
  totalRacers: number;
  circuitId: string;
  circuitName: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleLabel: string;
  vehicleAvailability: EngineeringHistoryVehicleAvailability;
  report?: RaceOutcome["engineeringReport"];
}

export const DEFAULT_ENGINEERING_HISTORY_LIMIT = 8;

/**
 * Build a read-only notebook view from canonical race outcomes.
 * Stored reports are passed through as-is; this function never diagnoses a live build.
 */
export function selectEngineeringHistory(
  raceHistory: readonly RaceOutcome[],
  garage: readonly BuiltVehicle[],
  limit: number = DEFAULT_ENGINEERING_HISTORY_LIMIT,
): EngineeringHistoryEntry[] {
  const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_ENGINEERING_HISTORY_LIMIT;
  const boundedLimit = Math.min(DEFAULT_ENGINEERING_HISTORY_LIMIT, Math.max(0, requestedLimit));
  return raceHistory.slice(0, boundedLimit).map((outcome) => {
    const circuit = getCircuitById(outcome.circuitId);
    const vehicle = outcome.vehicleId
      ? garage.find((candidate) => candidate.id === outcome.vehicleId)
      : undefined;
    const vehicleDefinition = vehicle ? getVehicleById(vehicle.definitionId) : undefined;

    return {
      result: outcome.result,
      position: outcome.position,
      totalRacers: outcome.totalRacers,
      circuitId: outcome.circuitId,
      circuitName: circuit?.name ?? "Unavailable circuit",
      vehicleId: outcome.vehicleId,
      vehicleName: vehicleDefinition?.name,
      vehicleLabel: vehicleDefinition
        ? `${vehicleDefinition.name} · ${outcome.vehicleId}`
        : outcome.vehicleId
          ? `Vehicle no longer in garage · ${outcome.vehicleId}`
          : "Vehicle not recorded",
      vehicleAvailability: !outcome.vehicleId
        ? "legacy"
        : vehicle
          ? "available"
          : "sold-or-missing",
      report: outcome.engineeringReport,
    };
  });
}
