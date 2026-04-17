import { describe, it, expect } from "vitest";
import {
  deriveBonusesFromAttributes,
  emptyGearAttributes,
  getGearAttributes,
  getGearBonuses,
  ATTRIBUTE_DERIVATION,
} from "../gear";
import { attributeEffectType } from "@/data/gearAttributes";
import type { LootGearItem } from "@/data/lootGear";
import type { GearSlot } from "@/data/gearSlots";

const emptyStaticGear = {} as Record<GearSlot, string>;

function makeLootItem(
  slot: GearSlot,
  effects: LootGearItem["effects"],
  id = `test_${slot}`,
): LootGearItem {
  return {
    id,
    slot,
    rarity: "common",
    name: `Test ${slot}`,
    effects,
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source: "test",
  };
}

describe("emptyGearAttributes", () => {
  it("zeroes every tracked attribute", () => {
    const attrs = emptyGearAttributes();
    expect(attrs.power).toBe(0);
    expect(attrs.engineering).toBe(0);
    expect(attrs.weight_reduction).toBe(0);
    expect(attrs.charisma).toBe(0);
  });
});

describe("deriveBonusesFromAttributes", () => {
  it("produces zero bonuses from zero attributes", () => {
    const b = deriveBonusesFromAttributes(emptyGearAttributes());
    expect(b.race_performance_pct).toBe(0);
    expect(b.build_cost_reduction_pct).toBe(0);
  });

  it("derives race_performance_pct from power per the derivation table", () => {
    const attrs = emptyGearAttributes();
    attrs.power = 10;
    const b = deriveBonusesFromAttributes(attrs);
    const expected = 10 * ATTRIBUTE_DERIVATION.power.race_performance_pct!;
    expect(b.race_performance_pct).toBeCloseTo(expected, 8);
  });

  it("stacks multiple effects from a single attribute (fortune → luck + sell + scrap)", () => {
    const attrs = emptyGearAttributes();
    attrs.fortune = 5;
    const b = deriveBonusesFromAttributes(attrs);
    expect(b.scavenge_luck_bonus).toBeCloseTo(
      5 * ATTRIBUTE_DERIVATION.fortune.scavenge_luck_bonus!,
      8,
    );
    expect(b.sell_value_bonus_pct).toBeCloseTo(
      5 * ATTRIBUTE_DERIVATION.fortune.sell_value_bonus_pct!,
      8,
    );
    expect(b.race_scrap_bonus_pct).toBeCloseTo(
      5 * ATTRIBUTE_DERIVATION.fortune.race_scrap_bonus_pct!,
      8,
    );
  });

  it("sums contributions across attributes into the same field", () => {
    const attrs = emptyGearAttributes();
    attrs.reflexes = 4;
    attrs.grip = 6;
    attrs.weight_reduction = 3;
    const b = deriveBonusesFromAttributes(attrs);
    const expected =
      4 * ATTRIBUTE_DERIVATION.reflexes.race_handling_pct! +
      6 * ATTRIBUTE_DERIVATION.grip.race_handling_pct! +
      3 * ATTRIBUTE_DERIVATION.weight_reduction.race_handling_pct!;
    expect(b.race_handling_pct).toBeCloseTo(expected, 8);
  });
});

describe("getGearAttributes", () => {
  it("returns empty attributes with no gear", () => {
    const attrs = getGearAttributes(undefined, []);
    expect(attrs.power).toBe(0);
  });

  it("sums attribute grants from equipped loot gear", () => {
    const helm = makeLootItem("head", [
      { type: attributeEffectType("instinct"), value: 5 },
      { type: attributeEffectType("aero"), value: 3 },
    ]);
    const gloves = makeLootItem("hands", [
      { type: attributeEffectType("engineering"), value: 4 },
    ]);
    const equipped = {
      head: helm.id,
      hands: gloves.id,
      body: null,
      feet: null,
      tool: null,
      accessory: null,
    } as Record<GearSlot, string | null>;
    const attrs = getGearAttributes(equipped, [helm, gloves]);
    expect(attrs.instinct).toBe(5);
    expect(attrs.aero).toBe(3);
    expect(attrs.engineering).toBe(4);
    expect(attrs.power).toBe(0);
  });

  it("ignores non-attribute effects", () => {
    const item = makeLootItem("tool", [
      { type: "race_performance_pct", value: 0.05 },
      { type: attributeEffectType("engineering"), value: 7 },
    ]);
    const equipped = {
      head: null, body: null, hands: null, feet: null,
      tool: item.id, accessory: null,
    } as Record<GearSlot, string | null>;
    const attrs = getGearAttributes(equipped, [item]);
    expect(attrs.engineering).toBe(7);
  });
});

describe("getGearBonuses (combined attribute + legacy path)", () => {
  it("combines raw % effects with attribute-derived bonuses", () => {
    const item = makeLootItem("tool", [
      { type: "race_performance_pct", value: 0.05 },
      { type: attributeEffectType("power"), value: 10 },
    ]);
    const equipped = {
      head: null, body: null, hands: null, feet: null,
      tool: item.id, accessory: null,
    } as Record<GearSlot, string | null>;
    const bonuses = getGearBonuses(emptyStaticGear, equipped, [item]);
    // 0.05 raw + 10 * 0.01 derived = 0.15
    expect(bonuses.race_performance_pct).toBeCloseTo(0.15, 8);
  });

  it("returns all-zero bonuses when nothing is equipped", () => {
    const bonuses = getGearBonuses(emptyStaticGear);
    expect(bonuses.race_performance_pct).toBe(0);
    expect(bonuses.scavenge_luck_bonus).toBe(0);
  });
});
