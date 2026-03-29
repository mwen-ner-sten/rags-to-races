import { getPartById, CONDITION_MULTIPLIERS, CONDITION_REPAIR_COST, CONDITIONS, type PartCondition } from "@/data/parts";
import type { VehicleDefinition } from "@/data/vehicles";
import { CONDITION_PENALTY_THRESHOLD, REPAIR_COST_BASE, REPAIR_COST_PER_POINT_PER_TIER } from "@/data/vehicles";
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
  builtAt: number;
  condition: number;    // 0-100, starts at 100
  totalRaces: number;   // lifetime race counter
}

export function calculateStats(
  vehicleDef: VehicleDefinition,
  parts: BuiltVehicle["parts"],
  vehicleCondition: number = 100,
  handlingBonusPct: number = 0,
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

  // Condition penalty: below threshold, stats degrade linearly (1.0 → 0.3 at condition 0)
  let conditionMultiplier = 1.0;
  if (vehicleCondition < CONDITION_PENALTY_THRESHOLD) {
    conditionMultiplier = 0.3 + (vehicleCondition / CONDITION_PENALTY_THRESHOLD) * 0.7;
  }

  const weightPenalty = Math.max(0, (totalWeight - vehicleDef.baseStats.weight) / 50);
  const speed = Math.max(1, (vehicleDef.baseStats.speed + bonusPower - weightPenalty) * conditionMultiplier);
  const rawHandling = (vehicleDef.baseStats.handling + bonusPower * 0.2) * conditionMultiplier;
  const handling = Math.max(1, rawHandling * (1 + handlingBonusPct));
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
    condition: 100,
    totalRaces: 0,
  };
}

// ── Repair ───────────────────────────────────────────────────────────────────

export function calculateRepairCost(
  vehicleDef: VehicleDefinition,
  currentCondition: number,
  targetCondition: number,
  repairCostReduction: number,
): number {
  const points = targetCondition - currentCondition;
  if (points <= 0) return 0;
  const costPerPoint = REPAIR_COST_BASE + vehicleDef.tier * REPAIR_COST_PER_POINT_PER_TIER;
  const baseCost = points * costPerPoint;
  return Math.max(1, Math.floor(baseCost * Math.max(0, 1 - repairCostReduction)));
}

// ── Part refurbishment ───────────────────────────────────────────────────────

export function calculateRefurbishCost(
  part: ScavengedPart,
  costReduction: number,
): { cost: number; newCondition: PartCondition } | null {
  const currentIdx = CONDITIONS.indexOf(part.condition as PartCondition);
  if (currentIdx <= 0 || currentIdx >= CONDITIONS.length - 1) return null;

  const newCondition = CONDITIONS[currentIdx + 1];
  const partDef = getPartById(part.definitionId);
  if (!partDef) return null;

  const baseCost = CONDITION_REPAIR_COST[newCondition] + Math.floor(partDef.scrapValue * 0.5);
  const finalCost = Math.max(1, Math.floor(baseCost * Math.max(0, 1 - costReduction)));

  return { cost: finalCost, newCondition };
}

// ── Part condition degradation (for swapping) ────────────────────────────────

export function degradeCondition(condition: PartCondition): PartCondition {
  const idx = CONDITIONS.indexOf(condition);
  return CONDITIONS[Math.max(0, idx - 1)];
}
