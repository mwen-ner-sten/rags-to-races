import { PART_DEFINITIONS, getScavengeCap, type PartCondition } from "@/data/parts";
import { ADDON_DEFINITIONS } from "@/data/addons";
import type { LocationDefinition } from "@/data/locations";
import { weightedPick, rollCondition, randInt } from "@/utils/random";
import type { PartCategory, CoreSlot } from "@/data/parts";

export interface ScavengedPart {
  id: string;                 // unique instance id
  definitionId: string;       // references PartDefinition OR AddOnDefinition
  condition: PartCondition;
  foundAt: string;            // location id
  type: "part" | "addon";     // discriminator
}

let _instanceCounter = 0;
export function makePartId(): string {
  return `part_${Date.now()}_${_instanceCounter++}`;
}

/** Scavenge a location once and return found parts (and possibly add-ons) */
export function scavenge(
  location: LocationDefinition,
  luckBonus: number = 0,   // 0–1 additive to rarityBias
  fatigue: number = 0,     // 0–99 fatigue penalty
  gearLuckBonus: number = 0,   // gear scavenge_luck_bonus (can be negative for T0 penalties)
  gearYieldBonus: number = 0,  // gear scavenge_yield_pct
): ScavengedPart[] {
  const baseCount = randInt(1, location.maxPartsPerScavenge);
  const count = Math.max(1, Math.round(baseCount * (1 + gearYieldBonus)));
  const results: ScavengedPart[] = [];
  const fatiguePenalty = fatigue * 0.005; // at 50 fatigue: -0.25 rarity
  const effectiveRarity = Math.max(0, Math.min(1, location.rarityBias + luckBonus + gearLuckBonus - fatiguePenalty));

  // Enforce quality cap based on location tier — scavenging never yields legendary+
  const conditionCap = getScavengeCap(location.tier);

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
      condition: rollCondition(effectiveRarity, conditionCap),
      foundAt: location.id,
      type: "part",
    });

    // Secondary roll: chance to also drop an add-on for this slot category
    const addonChance = 0.03 + location.tier * 0.05; // 3% at T0, 28% at T5
    if (Math.random() < addonChance) {
      const slotCategory = def.category as CoreSlot;
      const eligibleAddons = ADDON_DEFINITIONS.filter(
        (a) => a.targetSlot === slotCategory && a.minTier <= location.tier,
      );
      if (eligibleAddons.length > 0) {
        const addonDef = eligibleAddons[randInt(0, eligibleAddons.length - 1)];
        results.push({
          id: makePartId(),
          definitionId: addonDef.id,
          condition: rollCondition(effectiveRarity, conditionCap),
          foundAt: location.id,
          type: "addon",
        });
      }
    }
  }

  return results;
}
