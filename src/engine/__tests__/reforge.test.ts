import { describe, it, expect } from "vitest";
import { reforgeItem, SHARDS_PER_SALVAGE, REFORGE_COST_SHARDS } from "../reforge";
import { attributeEffectType } from "@/data/gearAttributes";
import type { LootGearItem } from "@/data/lootGear";

function baseItem(): LootGearItem {
  return {
    id: "r1",
    slot: "head",
    rarity: "epic",
    name: "Helm",
    effects: [
      { type: attributeEffectType("instinct"), value: 10 }, // primary
      { type: attributeEffectType("aero"), value: 3 },      // secondary
    ],
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source: "test",
  };
}

describe("reforgeItem", () => {
  it("preserves the primary attribute effect", () => {
    const item = baseItem();
    const reforged = reforgeItem(item);
    expect(reforged.effects[0]).toEqual({
      type: attributeEffectType("instinct"),
      value: 10,
    });
  });

  it("produces the same item id and slot/rarity", () => {
    const item = baseItem();
    const reforged = reforgeItem(item);
    expect(reforged.id).toBe(item.id);
    expect(reforged.slot).toBe(item.slot);
    expect(reforged.rarity).toBe(item.rarity);
  });
});

describe("shard economy", () => {
  it("SHARDS_PER_SALVAGE scales with rarity", () => {
    expect(SHARDS_PER_SALVAGE.common).toBeLessThan(SHARDS_PER_SALVAGE.uncommon);
    expect(SHARDS_PER_SALVAGE.uncommon).toBeLessThan(SHARDS_PER_SALVAGE.rare);
  });

  it("REFORGE_COST_SHARDS scales with rarity", () => {
    expect(REFORGE_COST_SHARDS.common).toBeLessThan(REFORGE_COST_SHARDS.rare);
    expect(REFORGE_COST_SHARDS.rare).toBeLessThan(REFORGE_COST_SHARDS.legendary);
  });
});
