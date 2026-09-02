import { describe, expect, it } from "vitest";
import { pickWorkshopToKeep } from "../prestige";
import { rollSalvageDrop } from "../race";
import { getRaceTicksNeeded, RACE_TICKS_DEFAULT } from "../tick";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { CONDITIONS } from "@/data/parts";
import { createInitialState, type GameState } from "@/state/store";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

describe("Blueprint Memory", () => {
  it("keeps the most-invested upgrades, deterministically, at level 1", () => {
    const levels = { keen_eye: 2, deep_pockets: 3, toolkit: 1, auto_repair: 3 };
    expect(pickWorkshopToKeep(levels, 2)).toEqual({ auto_repair: 1, deep_pockets: 1 });
    expect(pickWorkshopToKeep(levels, 2)).toEqual(pickWorkshopToKeep(levels, 2));
    expect(pickWorkshopToKeep(levels, 0)).toEqual({});
    expect(pickWorkshopToKeep({}, 3)).toEqual({});
  });
});

describe("race salvage quality", () => {
  const maxConditionIndex = (circuitId: string, seed: string) => {
    const circuit = CIRCUIT_DEFINITIONS.find((c) => c.id === circuitId)!;
    let best = 0;
    withRandomSource(new SeededRandomSource(seed), () => {
      for (let i = 0; i < 400; i++) {
        const drop = rollSalvageDrop(circuit, 1);
        if (drop) best = Math.max(best, CONDITIONS.indexOf(drop.condition));
      }
    });
    return best;
  };

  it("stays rusted or worn on the Backyard Derby but reaches good on national-tier wreckage", () => {
    expect(maxConditionIndex("backyard_derby", "salvage-low")).toBeLessThanOrEqual(CONDITIONS.indexOf("worn"));
    expect(maxConditionIndex("national_circuit", "salvage-high")).toBe(CONDITIONS.indexOf("decent"));
    expect(maxConditionIndex("endurance_series", "salvage-top")).toBe(CONDITIONS.indexOf("good"));
  });
});

describe("Pit Wall", () => {
  it("shortens the auto-race cadence like Pit Crew and Pit Rhythm do", () => {
    const state = createInitialState() as GameState;
    expect(getRaceTicksNeeded(state)).toBe(RACE_TICKS_DEFAULT);
    expect(getRaceTicksNeeded({ ...state, ownerUpgradeLevels: { owner_auto_all: 1 } })).toBe(RACE_TICKS_DEFAULT - 1);
  });
});
