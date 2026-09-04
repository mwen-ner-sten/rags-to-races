import { getPartById, CONDITION_MULTIPLIERS, CONDITION_REPAIR_COST, CONDITIONS, type PartCondition } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import { isVariantPartId } from "@/data/partVariants";
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

export interface InstalledPart {
  part: ScavengedPart;
  addons: ScavengedPart[];
}

export interface BuiltVehicle {
  id: string;
  definitionId: string;
  parts: Record<string, InstalledPart>;  // keyed by CoreSlot
  stats: VehicleStats;
  builtAt: number;
  condition: number;    // 0-100, starts at 100
  totalRaces: number;   // lifetime race counter
}

export interface BuildSelectionValidation {
  valid: boolean;
  reason: string | null;
  /** Canonical inventory objects to install, keyed by vehicle slot. */
  parts: Record<string, ScavengedPart>;
}

/**
 * Validate a pending garage build against the inventory as it exists now.
 *
 * Pending selections are persisted UI state, so a selected part can become
 * stale after selling, enhancing, importing, or loading a DEV scenario.  A
 * build must never install the stale object or reuse one inventory item in
 * multiple slots.
 */
export function validateBuildSelection(
  vehicleDef: VehicleDefinition,
  pendingParts: Readonly<Record<string, ScavengedPart | null>>,
  inventory: readonly ScavengedPart[],
): BuildSelectionValidation {
  const inventoryById = new Map(inventory.map((part) => [part.id, part]));
  const usedIds = new Set<string>();
  const parts: Record<string, ScavengedPart> = {};

  for (const slot of vehicleDef.slots) {
    const pending = pendingParts[slot.slot];
    if (!pending) {
      if (slot.required) {
        return { valid: false, reason: "Select a part for each required slot", parts: {} };
      }
      continue;
    }

    const current = inventoryById.get(pending.id);
    if (!current) {
      return {
        valid: false,
        reason: `The selected ${slot.slot} part is no longer in inventory`,
        parts: {},
      };
    }
    if (current.type === "addon" || !slot.acceptableParts.includes(current.definitionId)) {
      return {
        valid: false,
        reason: `The selected ${slot.slot} part is not compatible with this vehicle`,
        parts: {},
      };
    }
    if (usedIds.has(current.id)) {
      return {
        valid: false,
        reason: "Each installed slot needs a different inventory part",
        parts: {},
      };
    }

    usedIds.add(current.id);
    parts[slot.slot] = current;
  }

  return { valid: true, reason: null, parts };
}

/** Speed lost per 100% of weight carried above the chassis' expected load. */
export const WEIGHT_SPEED_FACTOR = 1.0;
/** Handling lost per 100% of excess weight — grip suffers twice as much as pace. */
export const WEIGHT_HANDLING_FACTOR = 2.0;
/** Bounds on the weight adjustment: light builds gain a little, heavy ones lose a lot. */
export const WEIGHT_SPEED_ADJ = { min: -0.15, max: 0.45 } as const;
export const WEIGHT_HANDLING_ADJ = { min: -0.25, max: 0.45 } as const;
/** Reliability retained at 0% condition; the rest scales linearly with condition. */
export const RELIABILITY_CONDITION_FLOOR = 0.4;

/**
 * The weight a chassis is designed to carry: base weight plus the average
 * compatible part in every required slot and in every optional slot that is
 * actually filled. Building heavier than that costs pace and grip; building
 * lighter earns a little of both.
 *
 * Optional slots count only when installed so an optional part is judged
 * against its slot's average rather than being a pure weight penalty; add-on
 * weight stays a real cost because add-ons have no expected load.
 */
export function expectedLoadedWeight(vehicleDef: VehicleDefinition, parts?: BuiltVehicle["parts"]): number {
  let weight = vehicleDef.baseStats.weight;
  for (const slot of vehicleDef.slots) {
    if (!slot.required && !parts?.[slot.slot]) continue;
    // Expected load is set by the hand-written base parts; Light / Sturdy siblings are the tradeoff around it.
    const weights = slot.acceptableParts
      .filter((id) => !isVariantPartId(id))
      .map((id) => getPartById(id)?.baseWeight ?? 0);
    if (weights.length === 0) continue;
    weight += weights.reduce((sum, value) => sum + value, 0) / weights.length;
  }
  return weight;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateStats(
  vehicleDef: VehicleDefinition,
  parts: BuiltVehicle["parts"],
  vehicleCondition: number = 100,
  handlingBonusPct: number = 0,
): VehicleStats {
  let bonusPower = 0;
  let bonusHandling = 0;
  let bonusReliability = 0;
  let totalWeight = vehicleDef.baseStats.weight;

  for (const slotConfig of vehicleDef.slots) {
    const installed = parts[slotConfig.slot];
    if (!installed) continue;

    const def = getPartById(installed.part.definitionId);
    if (!def) continue;
    const mult = CONDITION_MULTIPLIERS[installed.part.condition as PartCondition];
    bonusPower += def.basePower * mult;
    bonusHandling += def.baseHandling * mult;
    bonusReliability += def.baseReliability * mult;
    totalWeight += def.baseWeight;

    // Add-on contributions
    for (const addon of installed.addons) {
      const addonDef = getAddonById(addon.definitionId);
      if (!addonDef) continue;
      const addonMult = CONDITION_MULTIPLIERS[addon.condition as PartCondition];
      bonusPower += (addonDef.statBonuses.power ?? 0) * addonMult;
      bonusReliability += (addonDef.statBonuses.reliability ?? 0) * addonMult;
      bonusHandling += (addonDef.statBonuses.handling ?? 0) * addonMult;
      // Weight is a physical property, not scaled by condition
      totalWeight += addonDef.statBonuses.weight ?? 0;
    }
  }

  // Condition penalty: below threshold, pace and grip degrade linearly (1.0 → 0.3 at condition 0)
  let conditionMultiplier = 1.0;
  if (vehicleCondition < CONDITION_PENALTY_THRESHOLD) {
    conditionMultiplier = 0.3 + (vehicleCondition / CONDITION_PENALTY_THRESHOLD) * 0.7;
  }

  // Weight is a real trade: excess over the expected load costs pace and, doubly, grip.
  const expected = expectedLoadedWeight(vehicleDef, parts);
  const excess = expected > 0 ? (totalWeight - expected) / expected : 0;
  const speedAdj = clamp(excess * WEIGHT_SPEED_FACTOR, WEIGHT_SPEED_ADJ.min, WEIGHT_SPEED_ADJ.max);
  const handlingAdj = clamp(excess * WEIGHT_HANDLING_FACTOR, WEIGHT_HANDLING_ADJ.min, WEIGHT_HANDLING_ADJ.max);

  const speed = Math.max(1, (vehicleDef.baseStats.speed + bonusPower) * (1 - speedAdj) * conditionMultiplier);
  const rawHandling = (vehicleDef.baseStats.handling + bonusHandling) * (1 - handlingAdj) * conditionMultiplier;
  const handling = Math.max(1, rawHandling * (1 + handlingBonusPct));
  // A damaged car breaks down more, not just drives slower.
  const conditionFraction = clamp(vehicleCondition, 0, 100) / 100;
  const reliability = Math.max(
    1,
    (vehicleDef.baseStats.reliability + bonusReliability)
      * (RELIABILITY_CONDITION_FLOOR + (1 - RELIABILITY_CONDITION_FLOOR) * conditionFraction),
  );
  const weight = totalWeight;

  const stats = { speed, handling, reliability, weight };
  return { ...stats, performance: compositePerformance(stats) };
}

/**
 * Neutral composite for display (garage, HUD). Races never use it directly;
 * they fit the same stats to the circuit via `getCircuitPerformance`.
 */
export function compositePerformance(stats: Pick<VehicleStats, "speed" | "handling" | "reliability">): number {
  return stats.speed * 0.5 + stats.handling * 0.3 + stats.reliability * 0.2;
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
  fatigue: number = 0,
): number {
  const points = targetCondition - currentCondition;
  if (points <= 0) return 0;
  const costPerPoint = REPAIR_COST_BASE + vehicleDef.tier * REPAIR_COST_PER_POINT_PER_TIER;
  const baseCost = points * costPerPoint;
  const afterReduction = baseCost * Math.max(0, 1 - repairCostReduction);
  // Fatigue increases repair costs (tired mechanic = more mistakes)
  const fatigueMult = 1 + fatigue * 0.01;
  return Math.max(1, Math.floor(afterReduction * fatigueMult));
}

// ── Part refurbishment ───────────────────────────────────────────────────────

export function calculateRefurbishCost(
  part: ScavengedPart,
  costReduction: number,
): { cost: number; newCondition: PartCondition } | null {
  const currentIdx = CONDITIONS.indexOf(part.condition as PartCondition);
  // Refurbishment bench caps at "good" (index 3). Reaching pristine requires the Enhancement system.
  const REFURB_CAP = 3;
  if (currentIdx <= 0 || currentIdx >= REFURB_CAP) return null;

  const newCondition = CONDITIONS[currentIdx + 1];
  const partDef = getPartById(part.definitionId);
  if (!partDef) {
    // Might be an add-on — use addon scrap value
    const addonDef = getAddonById(part.definitionId);
    if (!addonDef) return null;
    const baseCost = CONDITION_REPAIR_COST[newCondition] + Math.floor(addonDef.scrapValue * 0.5);
    const finalCost = Math.max(1, Math.floor(baseCost * Math.max(0, 1 - costReduction)));
    return { cost: finalCost, newCondition };
  }

  const baseCost = CONDITION_REPAIR_COST[newCondition] + Math.floor(partDef.scrapValue * 0.5);
  const finalCost = Math.max(1, Math.floor(baseCost * Math.max(0, 1 - costReduction)));

  return { cost: finalCost, newCondition };
}

// ── Part condition degradation (for swapping) ────────────────────────────────

export function degradeCondition(condition: PartCondition): PartCondition {
  const idx = CONDITIONS.indexOf(condition);
  return CONDITIONS[Math.max(0, idx - 1)];
}
