import { PART_DEFINITIONS, type PartCondition } from "@/data/parts";
import type { LocationDefinition } from "@/data/locations";
import { weightedPick, rollCondition, randInt } from "@/utils/random";
import type { PartCategory } from "@/data/parts";

export interface ScavengedPart {
  id: string;                 // unique instance id
  definitionId: string;       // references PartDefinition
  condition: PartCondition;
  foundAt: string;            // location id
}

let _instanceCounter = 0;
export function makePartId(): string {
  return `part_${Date.now()}_${_instanceCounter++}`;
}

/** Scavenge a location once and return found parts */
export function scavenge(
  location: LocationDefinition,
  luckBonus: number = 0,   // 0–1 additive to rarityBias
): ScavengedPart[] {
  const count = randInt(1, location.maxPartsPerScavenge);
  const results: ScavengedPart[] = [];
  const effectiveRarity = Math.min(1, location.rarityBias + luckBonus);

  for (let i = 0; i < count; i++) {
    // Pick category by drop rate weights
    const category = weightedPick(location.partDropRates as Record<PartCategory, number>);

    // Filter eligible parts by category and tier
    const eligible = PART_DEFINITIONS.filter(
      (p) => p.category === category && p.minTier <= location.tier,
    );
    if (eligible.length === 0) continue;

    // Bias toward lower-tier parts with small chance of higher
    const def = eligible[randInt(0, Math.min(eligible.length - 1, Math.floor(eligible.length * 0.6 + Math.random() * eligible.length * 0.4)))];

    results.push({
      id: makePartId(),
      definitionId: def.id,
      condition: rollCondition(effectiveRarity),
      foundAt: location.id,
    });
  }

  return results;
}
