import { getPartById, CONDITIONS, type PartCondition } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import { CATEGORY_TO_MATERIALS, type MaterialType } from "@/data/materials";
import type { ScavengedPart } from "./scavenge";

export interface DecomposeResult {
  /** Materials yielded, keyed by type */
  materials: Partial<Record<MaterialType, number>>;
  /** Human-readable description of what was extracted */
  log: string;
}

/**
 * Decompose a part into salvage materials.
 *
 * Yield formula:
 *   baseMaterials = floor(scrapValue / 10)
 *   qualityMult   = conditionIndex * 0.5 + 0.5  (rusted=0.5x, artifact=4.5x)
 *   fatigueMult   = 1 - fatigue * 0.003          (up to -30% at 99 fatigue)
 *   yield per material = max(1, floor(baseMaterials * qualityMult * fatigueMult))
 *
 * Each part category yields 1–2 material types.
 * No scrap bucks are gained from decomposing (that's the tradeoff vs selling).
 */
export function decomposePart(
  part: ScavengedPart,
  fatigue: number = 0,
): DecomposeResult | null {
  const condition = part.condition as PartCondition;
  const conditionIndex = CONDITIONS.indexOf(condition);
  if (conditionIndex < 0) return null;

  // Look up definition — could be a core part or an add-on
  const partDef = getPartById(part.definitionId);
  const addonDef = !partDef ? getAddonById(part.definitionId) : null;

  if (!partDef && !addonDef) return null;

  const scrapValue = partDef?.scrapValue ?? addonDef?.scrapValue ?? 1;
  const category = partDef?.category ?? (addonDef ? "misc" : "misc");

  // Yield calculation
  const baseMaterials = Math.floor(scrapValue / 10);
  const qualityMult = conditionIndex * 0.5 + 0.5;
  const fatigueMult = Math.max(0.1, 1 - fatigue * 0.003);
  const yieldPerMaterial = Math.max(1, Math.floor(baseMaterials * qualityMult * fatigueMult));

  const materialTypes = CATEGORY_TO_MATERIALS[category] ?? ["metalScrap"];
  const result: Partial<Record<MaterialType, number>> = {};

  for (const mat of materialTypes) {
    result[mat] = (result[mat] ?? 0) + yieldPerMaterial;
  }

  const name = partDef?.name ?? addonDef?.name ?? part.definitionId;
  const matList = Object.entries(result)
    .map(([m, q]) => `${q}x ${m}`)
    .join(", ");

  return {
    materials: result,
    log: `Decomposed ${name} (${condition}) → ${matList}`,
  };
}

/**
 * Decompose all parts matching a filter condition (e.g., all rusted/worn).
 * Returns combined material yield and total parts decomposed.
 */
export function decomposeMany(
  parts: ScavengedPart[],
  fatigue: number = 0,
): { materials: Partial<Record<MaterialType, number>>; count: number } {
  const combined: Partial<Record<MaterialType, number>> = {};
  let count = 0;

  for (const part of parts) {
    const result = decomposePart(part, fatigue);
    if (!result) continue;
    for (const [mat, qty] of Object.entries(result.materials) as [MaterialType, number][]) {
      combined[mat] = (combined[mat] ?? 0) + qty;
    }
    count++;
  }

  return { materials: combined, count };
}
