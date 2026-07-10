import type { RacePlan } from "./raceStrategy";

export type FleetProgramStatus = "running" | "complete";
export interface FleetAssignment {
  id: string;
  vehicleId: string;
  crewId: string | null;
  circuitId: string;
  plan: RacePlan;
  status: FleetProgramStatus;
  remainingTicks: number;
  accumulatedWear: number;
  rewards: { scrap: number; materials: number };
}
