/**
 * Part variants: every core part has a Light and a Sturdy sibling generated
 * from this table, so three builds per tier exist without hand-writing parts.
 * Variants share the base part's tier, category, handling and sell value; art
 * falls back to the base sprite (see assets/manifest.ts).
 */
import type { PartDefinition } from "./parts";
import { randInt } from "@/utils/random";

export type PartVariantKind = "light" | "sturdy";

export interface PartVariantDefinition {
  id: PartVariantKind;
  label: string;
  weightMult: number;
  reliabilityMult: number;
  powerMult: number;
}

export const PART_VARIANTS: readonly PartVariantDefinition[] = [
  { id: "light", label: "Light", weightMult: 0.75, reliabilityMult: 0.9, powerMult: 1 },
  { id: "sturdy", label: "Sturdy", weightMult: 1.15, reliabilityMult: 1.2, powerMult: 0.95 },
];

const VARIANT_SUFFIXES = PART_VARIANTS.map((variant) => `_${variant.id}`);

/** Variants generated so far, keyed by base part id (filled by generatePartVariants). */
const registry = new Map<string, PartDefinition[]>();

/** Misc junk and weightless placeholders (No Electronics) have no meaningful sibling. */
export function isVariantEligible(part: PartDefinition): boolean {
  return part.category !== "misc" && part.baseWeight > 0 && !isVariantPartId(part.id);
}

export function makeVariantId(baseId: string, kind: PartVariantKind): string {
  return `${baseId}_${kind}`;
}

function buildVariant(base: PartDefinition, variant: PartVariantDefinition): PartDefinition {
  return {
    ...base,
    id: makeVariantId(base.id, variant.id),
    name: `${variant.label} ${base.name}`,
    basePower: Math.round(base.basePower * variant.powerMult),
    baseReliability: Math.round(base.baseReliability * variant.reliabilityMult),
    baseWeight: Math.max(1, Math.round(base.baseWeight * variant.weightMult)),
  };
}

/** Light and Sturdy siblings for every eligible base part, in table order. */
export function generatePartVariants(baseParts: readonly PartDefinition[]): PartDefinition[] {
  const generated: PartDefinition[] = [];
  for (const base of baseParts) {
    if (!isVariantEligible(base)) continue;
    const variants = PART_VARIANTS.map((variant) => buildVariant(base, variant));
    registry.set(base.id, variants);
    generated.push(...variants);
  }
  return generated;
}

export function isVariantPartId(id: string): boolean {
  return VARIANT_SUFFIXES.some((suffix) => id.endsWith(suffix));
}

export function getBasePartId(id: string): string {
  for (const suffix of VARIANT_SUFFIXES) {
    if (id.endsWith(suffix)) return id.slice(0, -suffix.length);
  }
  return id;
}

export function getPartVariantKind(id: string): "base" | PartVariantKind {
  for (const variant of PART_VARIANTS) {
    if (id.endsWith(`_${variant.id}`)) return variant.id;
  }
  return "base";
}

/** Ids of the generated siblings of a base part (empty for variants and ineligible parts). */
export function variantIdsFor(part: PartDefinition | undefined): string[] {
  if (!part || !isVariantEligible(part)) return [];
  return PART_VARIANTS.map((variant) => makeVariantId(part.id, variant.id));
}

/** A slot's base part list followed by each base part's variants. */
export function expandAcceptablePartIds(
  baseIds: readonly string[],
  lookup: (id: string) => PartDefinition | undefined,
): string[] {
  const variants = baseIds.flatMap((id) => variantIdsFor(lookup(id)));
  return [...baseIds, ...variants];
}

/** Base, Light or Sturdy with equal weight; parts without siblings return themselves. */
export function rollPartVariant(part: PartDefinition): PartDefinition {
  const variants = registry.get(part.id);
  if (!variants || variants.length === 0) return part;
  const options = [part, ...variants];
  return options[randInt(0, options.length - 1)];
}
