import { getPartById, CONDITION_MULTIPLIERS, type PartCondition } from "@/data/parts";
import type { VehicleDefinition } from "@/data/vehicles";
import type { ScavengedPart } from "./scavenge";

export interface VehicleStats {
  speed: number;
  handling: number;
  reliability: number;
  weight: number;
  /** Composite performance score used in race sim */
  performance: number;
}

export interface BuiltVehicle {
  id: string;
  definitionId: string;
  parts: {
    engine: ScavengedPart;
    wheel: ScavengedPart;
    frame: ScavengedPart;
    fuel: ScavengedPart;
  };
  stats: VehicleStats;
  builtAt: number; // timestamp
}

export function calculateStats(
  vehicleDef: VehicleDefinition,
  parts: BuiltVehicle["parts"],
): VehicleStats {
  const slots = [parts.engine, parts.wheel, parts.frame, parts.fuel] as ScavengedPart[];

  let bonusPower = 0;
  let bonusReliability = 0;
  let totalWeight = vehicleDef.baseStats.weight;

  for (const part of slots) {
    const def = getPartById(part.definitionId);
    if (!def) continue;
    const mult = CONDITION_MULTIPLIERS[part.condition as PartCondition];
    bonusPower += (def.basePower + def.baseReliability * 0.3) * mult;
    bonusReliability += def.baseReliability * mult;
    totalWeight += def.baseWeight;
  }

  const weightPenalty = Math.max(0, (totalWeight - vehicleDef.baseStats.weight) / 50);
  const speed = Math.max(1, vehicleDef.baseStats.speed + bonusPower - weightPenalty);
  const handling = Math.max(1, vehicleDef.baseStats.handling + bonusPower * 0.2);
  const reliability = Math.max(1, vehicleDef.baseStats.reliability + bonusReliability);
  const weight = totalWeight;

  const performance = speed * 0.5 + handling * 0.3 + reliability * 0.2;

  return { speed, handling, reliability, weight, performance };
}

export function buildVehicle(
  vehicleDef: VehicleDefinition,
  parts: BuiltVehicle["parts"],
  idCounter: number,
): BuiltVehicle {
  return {
    id: `vehicle_${Date.now()}_${idCounter}`,
    definitionId: vehicleDef.id,
    parts,
    stats: calculateStats(vehicleDef, parts),
    builtAt: Date.now(),
  };
}
