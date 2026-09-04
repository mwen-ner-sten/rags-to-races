import { describe, expect, it } from "vitest";
import { EMPTY_EQUIPPED_LOOT_GEAR, type LootGearItem } from "@/data/lootGear";
import {
  compatibleMods,
  computeEquipDelta,
  filterAndSortGear,
  formatChannelValue,
  formatEffect,
  gearPower,
  lootGearAffixArt,
  lootGearBonuses,
  needsSalvageConfirm,
  nextModSlotLevel,
} from "../lockerHelpers";

function gear(overrides: Partial<LootGearItem> & Pick<LootGearItem, "id" | "slot" | "rarity">): LootGearItem {
  return {
    name: overrides.id,
    effects: [],
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source: "test",
    ...overrides,
  };
}

const goggles = gear({
  id: "goggles", slot: "head", rarity: "epic", name: "Goggles",
  effects: [{ type: "race_dnf_reduction", value: 0.08 }, { type: "scavenge_luck_bonus", value: 0.04 }],
  enhancementLevel: 3, modSlots: 1,
  mods: [{ id: "m1", templateId: "mod_padding", name: "Padding", effectType: "race_wear_reduction_pct", value: 0.05 }],
});
const cap = gear({ id: "cap", slot: "head", rarity: "common", name: "Cap", effects: [{ type: "race_dnf_reduction", value: 0.02 }] });
const gloves = gear({ id: "gloves", slot: "hands", rarity: "rare", name: "Gloves", effects: [{ type: "build_cost_reduction_pct", value: 0.06 }], enhancementLevel: 1 });
const inventory = [goggles, cap, gloves];

describe("formatChannelValue", () => {
  it("signs reductions as minus and bonuses as plus", () => {
    expect(formatChannelValue("build_cost_reduction_pct", 0.06)).toBe("−6%");
    expect(formatChannelValue("race_performance_pct", 0.042)).toBe("+4.2%");
    expect(formatChannelValue("race_performance_pct", 0)).toBe("0%");
    expect(formatChannelValue("tick_speed_reduction_ms", 120)).toBe("−120 ms");
  });

  it("labels an effect line and falls back for unknown channels", () => {
    expect(formatEffect("race_dnf_reduction", 0.08)).toBe("DNF chance −8%");
    expect(formatEffect("mystery", 1)).toBe("mystery 1");
  });
});

describe("gearPower", () => {
  it("sums enhanced affixes and mods in percentage points", () => {
    // 0.08 × 1.36 + 0.04 × 1.36 + 0.05 mod = 0.2132 -> 21.3
    expect(gearPower(goggles)).toBe(21.3);
    expect(gearPower(cap)).toBe(2);
  });
});

describe("computeEquipDelta", () => {
  it("reports only the channels that move when a slot is empty", () => {
    const delta = computeEquipDelta(gloves, EMPTY_EQUIPPED_LOOT_GEAR, inventory);
    expect(delta).toEqual([
      { channel: "build_cost_reduction_pct", before: 0, after: 0.0672, delta: 0.0672 },
    ]);
  });

  it("accounts for the item being replaced, including its mods", () => {
    const equipped = { ...EMPTY_EQUIPPED_LOOT_GEAR, head: "goggles" };
    const delta = computeEquipDelta(cap, equipped, inventory);
    const byChannel = Object.fromEntries(delta.map((entry) => [entry.channel, entry.delta]));
    expect(byChannel.race_dnf_reduction).toBeCloseTo(0.02 - 0.1088, 4);
    expect(byChannel.scavenge_luck_bonus).toBeCloseTo(-0.0544, 4);
    expect(byChannel.race_wear_reduction_pct).toBeCloseTo(-0.05, 4);
    expect(delta.map((entry) => entry.channel)).toEqual(["scavenge_luck_bonus", "race_dnf_reduction", "race_wear_reduction_pct"]);
  });

  it("is a no-op for an item already equipped in its slot", () => {
    const equipped = { ...EMPTY_EQUIPPED_LOOT_GEAR, head: "cap" };
    expect(computeEquipDelta(cap, equipped, inventory)).toEqual([]);
  });
});

describe("lootGearBonuses", () => {
  it("aggregates only equipped pieces and ignores dangling ids", () => {
    const totals = lootGearBonuses({ ...EMPTY_EQUIPPED_LOOT_GEAR, head: "goggles", hands: "missing" }, inventory);
    expect(totals.race_dnf_reduction).toBeCloseTo(0.1088, 4);
    expect(totals.race_wear_reduction_pct).toBeCloseTo(0.05, 4);
    expect(totals.build_cost_reduction_pct).toBe(0);
  });
});

describe("filterAndSortGear", () => {
  it("filters by slot and rarity", () => {
    expect(filterAndSortGear(inventory, { slot: "head", rarity: "all", sort: "power" }).map((item) => item.id)).toEqual(["goggles", "cap"]);
    expect(filterAndSortGear(inventory, { slot: "all", rarity: "rare", sort: "power" }).map((item) => item.id)).toEqual(["gloves"]);
    expect(filterAndSortGear(inventory, { slot: "feet", rarity: "all", sort: "power" })).toEqual([]);
  });

  it("sorts by power, rarity, level, and name without mutating the input", () => {
    const original = [...inventory];
    expect(filterAndSortGear(inventory, { slot: "all", rarity: "all", sort: "power" }).map((item) => item.id)).toEqual(["goggles", "gloves", "cap"]);
    expect(filterAndSortGear(inventory, { slot: "all", rarity: "all", sort: "rarity" }).map((item) => item.id)).toEqual(["goggles", "gloves", "cap"]);
    expect(filterAndSortGear(inventory, { slot: "all", rarity: "all", sort: "level" }).map((item) => item.id)).toEqual(["goggles", "gloves", "cap"]);
    expect(filterAndSortGear(inventory, { slot: "all", rarity: "all", sort: "name" }).map((item) => item.id)).toEqual(["cap", "gloves", "goggles"]);
    expect(inventory).toEqual(original);
  });
});

describe("mods and sockets", () => {
  const bag = [
    { id: "grip", templateId: "mod_grip_tape", name: "Grip Tape", effectType: "race_handling_pct", value: 0.03 },
    { id: "eyes", templateId: "mod_sharp_eyes", name: "Sharp Eyes", effectType: "scavenge_luck_bonus", value: 0.04 },
    { id: "bogus", templateId: "mod_unknown", name: "Bogus", effectType: "x", value: 1 },
  ];

  it("offers only mods whose template fits the slot", () => {
    expect(compatibleMods(goggles, bag).map((mod) => mod.id)).toEqual(["eyes"]);
    expect(compatibleMods(gloves, bag).map((mod) => mod.id)).toEqual(["grip"]);
  });

  it("knows when the next socket opens", () => {
    expect(nextModSlotLevel(0)).toBe(3);
    expect(nextModSlotLevel(3)).toBe(7);
    expect(nextModSlotLevel(7)).toBeNull();
  });
});

describe("salvage and art", () => {
  it("asks to confirm from Rare upward", () => {
    expect(needsSalvageConfirm(cap)).toBe(false);
    expect(needsSalvageConfirm(gloves)).toBe(true);
    expect(needsSalvageConfirm(goggles)).toBe(true);
  });

  it("picks distinct affix overlays, strongest first, capped at three", () => {
    expect(lootGearAffixArt(goggles)).toEqual(["handling", "sourcing"]);
    const stacked = gear({
      id: "s", slot: "tool", rarity: "legendary",
      effects: [
        { type: "build_cost_reduction_pct", value: 0.1 },
        { type: "repair_cost_reduction_pct", value: 0.09 },
        { type: "refurb_cost_reduction_pct", value: 0.08 },
        { type: "sell_value_bonus_pct", value: 0.07 },
        { type: "race_performance_pct", value: 0.06 },
      ],
    });
    expect(lootGearAffixArt(stacked)).toEqual(["engineering", "repair", "logistics"]);
  });
});
