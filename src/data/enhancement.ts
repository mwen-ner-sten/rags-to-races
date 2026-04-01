import type { MaterialType } from "./materials";
import type { PartCategory } from "./parts";

/** Condition index → condition name (must match parts.ts CONDITIONS array order) */
export const CONDITION_NAMES = [
  "rusted",    // 0
  "worn",      // 1
  "decent",    // 2
  "good",      // 3
  "pristine",  // 4
  "polished",  // 5
  "legendary", // 6
  "mythic",    // 7
  "artifact",  // 8
] as const;

export type EnhancementCost = Partial<Record<MaterialType, number>>;

/**
 * Base material costs to enhance from conditionIndex N to N+1.
 * Indexed by TARGET condition index (e.g., [4] = cost to reach "pristine").
 * Artifact (index 8) requires the Artifact Forge — not regular enhancement.
 */
export const BASE_ENHANCEMENT_COSTS: Record<number, EnhancementCost> = {
  // worn → decent (1→2): very cheap, early game
  2: { metalScrap: 1 },
  // decent → good (2→3): still cheap
  3: { metalScrap: 2, greaseSludge: 1 },
  // good → pristine (3→4): first real gate
  4: { heatCore: 3, metalScrap: 2 },
  // pristine → polished (4→5): meaningful cost
  5: { heatCore: 8, metalScrap: 5, greaseSludge: 3 },
  // polished → legendary (5→6): significant investment
  6: { heatCore: 20, metalScrap: 10, greaseSludge: 8, circuitFragment: 5 },
  // legendary → mythic (6→7): heavy cost
  7: { heatCore: 50, metalScrap: 25, greaseSludge: 15, circuitFragment: 12, carbonDust: 5 },
  // mythic → artifact: handled by Artifact Forge (forgeTokens required), not here
};

/**
 * Per-category material multipliers — different part types emphasize different materials.
 * The base cost is multiplied by the relevant material's factor for that category.
 */
export const CATEGORY_COST_OVERRIDES: Partial<Record<PartCategory, Partial<Record<MaterialType, number>>>> = {
  engine:      { heatCore: 1.5, greaseSludge: 1.3 },
  wheel:       { rubberCompound: 1.8, metalScrap: 0.5 },
  frame:       { metalScrap: 1.8, greaseSludge: 0.5 },
  fuel:        { circuitFragment: 1.5, greaseSludge: 1.3 },
  electronics: { circuitFragment: 2.0, heatCore: 0.5 },
  drivetrain:  { rubberCompound: 1.4, carbonDust: 1.4, metalScrap: 0.8 },
  exhaust:     { metalScrap: 1.4, heatCore: 1.2 },
  suspension:  { metalScrap: 1.3, greaseSludge: 1.2 },
  aero:        { carbonDust: 2.0, metalScrap: 0.6 },
};

/**
 * Calculate the actual enhancement cost for a part given its category.
 * Substitutes category-relevant materials: if the base cost includes metalScrap but
 * the category has a rubberCompound multiplier, it replaces/augments accordingly.
 */
export function calculateEnhancementCost(
  targetConditionIndex: number,
  category: PartCategory,
  fatigue: number = 0,
): EnhancementCost | null {
  const base = BASE_ENHANCEMENT_COSTS[targetConditionIndex];
  if (!base) return null;

  const overrides = CATEGORY_COST_OVERRIDES[category] ?? {};
  const result: EnhancementCost = {};

  // Apply base costs, scaled by category overrides
  for (const [mat, qty] of Object.entries(base) as [MaterialType, number][]) {
    const multiplier = overrides[mat] ?? 1.0;
    const scaled = Math.ceil(qty * multiplier);
    if (scaled > 0) result[mat] = scaled;
  }

  // Add category-specific materials not in base (if override has them with no base entry)
  for (const [mat, multiplier] of Object.entries(overrides) as [MaterialType, number][]) {
    if (!(mat in base) && multiplier > 1.0) {
      // Add a small surcharge in this material for the category flavor
      const surcharge = Math.ceil(((base.metalScrap ?? base.heatCore ?? 1)) * (multiplier - 1.0));
      if (surcharge > 0) result[mat] = (result[mat] ?? 0) + surcharge;
    }
  }

  // High fatigue adds +20% to all costs (rounded up)
  if (fatigue >= 50) {
    const fatigueMult = 1.2;
    for (const mat of Object.keys(result) as MaterialType[]) {
      result[mat] = Math.ceil((result[mat] ?? 0) * fatigueMult);
    }
  }

  return result;
}

/**
 * Returns true if the player has enough materials to pay the enhancement cost.
 */
export function canAffordEnhancement(
  cost: EnhancementCost,
  materials: Record<MaterialType, number>,
): boolean {
  for (const [mat, qty] of Object.entries(cost) as [MaterialType, number][]) {
    if ((materials[mat] ?? 0) < qty) return false;
  }
  return true;
}

/** Artifact Forge: cost in Forge Tokens (always 1) + heavy materials */
export const ARTIFACT_FORGE_COST: EnhancementCost = {
  heatCore: 100,
  metalScrap: 50,
  greaseSludge: 30,
  circuitFragment: 25,
  carbonDust: 15,
  rubberCompound: 15,
};
export const ARTIFACT_FORGE_TOKEN_COST = 1;
