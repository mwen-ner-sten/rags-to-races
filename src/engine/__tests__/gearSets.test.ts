import { describe, it, expect } from "vitest";
import { getActiveSets, getActiveSetEffects } from "../gearSets";
import type { LootGearItem } from "@/data/lootGear";
import type { GearSlot } from "@/data/gearSlots";

function makeSetItem(slot: GearSlot, setId: string, id = `item_${slot}_${setId}`): LootGearItem {
  return {
    id,
    slot,
    rarity: "common",
    name: `Set ${slot}`,
    effects: [],
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source: "test",
    setId,
  };
}

describe("getActiveSets", () => {
  it("activates 2pc when two set pieces are equipped", () => {
    const head = makeSetItem("head", "grease_monkey");
    const body = makeSetItem("body", "grease_monkey");
    const equipped = {
      head: head.id, body: body.id, hands: null, feet: null, tool: null, accessory: null,
    } as Record<GearSlot, string | null>;

    const active = getActiveSets(equipped, [head, body]);
    expect(active).toHaveLength(1);
    expect(active[0].set.id).toBe("grease_monkey");
    expect(active[0].piecesEquipped).toBe(2);
    expect(active[0].activeTiers).toHaveLength(1);
    expect(active[0].activeTiers[0].piecesRequired).toBe(2);
  });

  it("activates both 2pc and 4pc when four pieces are equipped", () => {
    const head = makeSetItem("head", "grease_monkey");
    const body = makeSetItem("body", "grease_monkey");
    const hands = makeSetItem("hands", "grease_monkey");
    const tool = makeSetItem("tool", "grease_monkey");
    const equipped = {
      head: head.id, body: body.id, hands: hands.id, feet: null, tool: tool.id, accessory: null,
    } as Record<GearSlot, string | null>;

    const active = getActiveSets(equipped, [head, body, hands, tool]);
    expect(active[0].piecesEquipped).toBe(4);
    expect(active[0].activeTiers).toHaveLength(2);
  });

  it("does not activate bonuses with only 1 piece", () => {
    const head = makeSetItem("head", "grease_monkey");
    const equipped = {
      head: head.id, body: null, hands: null, feet: null, tool: null, accessory: null,
    } as Record<GearSlot, string | null>;

    const active = getActiveSets(equipped, [head]);
    expect(active[0].piecesEquipped).toBe(1);
    expect(active[0].activeTiers).toHaveLength(0);
    expect(getActiveSetEffects(equipped, [head])).toEqual([]);
  });
});
