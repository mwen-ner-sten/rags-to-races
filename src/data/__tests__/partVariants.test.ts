import { describe, expect, it } from "vitest";
import { CORE_PART_DEFINITIONS, PART_DEFINITIONS, getPartById } from "../parts";
import { getBasePartId, getPartVariantKind, isVariantPartId, PART_VARIANTS, rollPartVariant } from "../partVariants";
import { getFixedAsset } from "@/assets/manifest";
import { VEHICLE_DEFINITIONS } from "../vehicles";
import { withRandomSource, type RandomSource } from "@/utils/random";

class ScriptedRandomSource implements RandomSource {
  private index = 0;
  constructor(private readonly values: readonly number[]) {}
  next(): number {
    const value = this.values[this.index] ?? 0.5;
    this.index += 1;
    return value;
  }
}

const variants = PART_DEFINITIONS.filter((part) => isVariantPartId(part.id));

describe("part variants", () => {
  it("generates Light and Sturdy siblings for every core part with unique ids", () => {
    const eligibleBases = CORE_PART_DEFINITIONS.filter((part) => part.category !== "misc" && part.baseWeight > 0);
    expect(variants).toHaveLength(eligibleBases.length * PART_VARIANTS.length);
    const ids = PART_DEFINITIONS.map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const variant of variants) {
      const base = getPartById(getBasePartId(variant.id))!;
      expect(base, variant.id).toBeDefined();
      expect(isVariantPartId(base.id)).toBe(false);
      expect(variant.name).toMatch(new RegExp(`^(Light|Sturdy) ${base.name}$`));
      expect(variant).toMatchObject({ category: base.category, minTier: base.minTier, scrapValue: base.scrapValue, baseHandling: base.baseHandling });
    }
  });

  it("keeps variant stats within sane bounds relative to the base part", () => {
    for (const variant of variants) {
      const base = getPartById(getBasePartId(variant.id))!;
      const kind = getPartVariantKind(variant.id);
      expect(variant.baseWeight).toBeGreaterThanOrEqual(0);
      expect(variant.baseReliability).toBeGreaterThanOrEqual(0);
      expect(variant.basePower).toBeGreaterThanOrEqual(0);
      if (kind === "light") {
        expect(variant.baseWeight).toBe(Math.max(1, Math.round(base.baseWeight * 0.75)));
        expect(variant.baseReliability).toBe(Math.round(base.baseReliability * 0.9));
        expect(variant.basePower).toBe(base.basePower);
      } else {
        expect(kind).toBe("sturdy");
        expect(variant.baseWeight).toBe(Math.round(base.baseWeight * 1.15));
        expect(variant.baseReliability).toBe(Math.round(base.baseReliability * 1.2));
        expect(variant.basePower).toBe(Math.round(base.basePower * 0.95));
      }
    }
  });

  it("resolves art for every variant through the base part's sprite", () => {
    for (const variant of variants) {
      const asset = getFixedAsset("part", variant.id);
      const baseAsset = getFixedAsset("part", getBasePartId(variant.id));
      expect(asset, variant.id).toBeDefined();
      expect(asset!.src).toBe(baseAsset!.src);
    }
  });

  it("lets every vehicle slot accept the variants of its base parts", () => {
    for (const vehicle of VEHICLE_DEFINITIONS) {
      for (const slot of vehicle.slots) {
        const bases = slot.acceptableParts.filter((id) => !isVariantPartId(id));
        for (const baseId of bases) {
          if ((getPartById(baseId)?.baseWeight ?? 0) === 0) continue;
          expect(slot.acceptableParts).toContain(`${baseId}_light`);
          expect(slot.acceptableParts).toContain(`${baseId}_sturdy`);
        }
        expect(slot.acceptableParts[0]).toBe(bases[0]);
      }
    }
  });

  it("rolls base, Light and Sturdy with equal weight", () => {
    const engine = getPartById("engine_small")!;
    const picks = [0, 0.4, 0.9].map((roll) => withRandomSource(new ScriptedRandomSource([roll]), () => rollPartVariant(engine).id));
    expect(picks).toEqual(["engine_small", "engine_small_light", "engine_small_sturdy"]);
    const misc = getPartById("misc_junk")!;
    expect(rollPartVariant(misc)).toBe(misc);
  });
});
