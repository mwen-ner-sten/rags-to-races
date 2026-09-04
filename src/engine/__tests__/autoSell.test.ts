import { describe, expect, it } from "vitest";
import { autoSellJunkParts, getAutoSellThreshold } from "../autoSell";
import { computeTick } from "../tick";
import { createInitialState, type GameState } from "@/state/store";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import type { ScavengedPart } from "../scavenge";

function pureState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

function part(condition: ScavengedPart["condition"], id = condition): ScavengedPart {
  return { id, definitionId: "engine_small", condition, foundAt: "test", type: "part" };
}

describe("baseline junk auto-sell", () => {
  it("sells rusted parts from the first tick of a fresh save", () => {
    const fresh = pureState({ selectedLocationId: "curbside" });
    expect(getAutoSellThreshold(fresh)).toBe("worn");
    let sold = 0;
    let rustedKept = 0;
    withRandomSource(new SeededRandomSource("baseline-junk"), () => {
      for (let tick = 0; tick < 60; tick++) {
        const result = computeTick(fresh);
        sold += result.partsAutoSold;
        rustedKept += result.partsFound.filter((found) => found.condition === "rusted").length;
      }
    });
    expect(sold).toBeGreaterThan(0);
    expect(rustedKept).toBe(0);
  });

  it("lets the Junk Filter milestone raise the threshold to the player's Sell Below Quality pick", () => {
    const filtered = pureState({ prestigeCount: 2, selectedSellBelowQuality: "good" });
    expect(getPrestigeMilestoneBonuses(2).autoSellThreshold).toBe(true);
    expect(getAutoSellThreshold(filtered)).toBe("good");
    const result = autoSellJunkParts([part("rusted"), part("worn"), part("decent"), part("good"), part("pristine")], "good");
    expect(result.soldParts.map((sold) => sold.condition)).toEqual(["rusted", "worn", "decent"]);
    expect(result.keptParts.map((kept) => kept.condition)).toEqual(["good", "pristine"]);
    expect(result.scrapEarned).toBeGreaterThan(0);
  });

  it("keeps unknown definitions instead of discarding them", () => {
    const unknown: ScavengedPart = { id: "u", definitionId: "not_a_part", condition: "rusted", foundAt: "test", type: "part" };
    const result = autoSellJunkParts([unknown], "worn");
    expect(result.keptParts).toEqual([unknown]);
    expect(result.soldParts).toEqual([]);
  });
});
