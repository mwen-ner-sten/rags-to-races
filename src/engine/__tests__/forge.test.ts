import { describe, it, expect } from "vitest";
import { forgeItem, FORGE_COST } from "../forge";
import { parseAttributeEffectType } from "@/data/gearAttributes";
import { RARITY_PRIMARY_RANGE } from "@/data/lootGear";

describe("forgeItem", () => {
  it("returns a LootGearItem with the requested slot + rarity", () => {
    const item = forgeItem("head", "rare");
    expect(item.slot).toBe("head");
    expect(item.rarity).toBe("rare");
    expect(item.source).toBe("Forge");
    expect(item.enhancementLevel).toBe(0);
  });

  it("has a primary attribute effect in range", () => {
    const item = forgeItem("tool", "epic");
    const [min, max] = RARITY_PRIMARY_RANGE.epic;
    const attrEffects = item.effects.filter((e) => parseAttributeEffectType(e.type));
    expect(attrEffects.length).toBeGreaterThanOrEqual(1);
    const primary = attrEffects[0];
    expect(primary.value).toBeGreaterThanOrEqual(min);
    expect(primary.value).toBeLessThanOrEqual(max);
  });

  it("FORGE_COST is monotonic with rarity", () => {
    expect(FORGE_COST.common).toBeLessThan(FORGE_COST.uncommon);
    expect(FORGE_COST.uncommon).toBeLessThan(FORGE_COST.rare);
    expect(FORGE_COST.rare).toBeLessThan(FORGE_COST.epic);
    expect(FORGE_COST.epic).toBeLessThan(FORGE_COST.legendary);
  });
});
