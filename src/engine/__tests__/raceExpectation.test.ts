import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { getCircuitById } from "@/data/circuits";
import type { BuiltVehicle } from "../build";
import { AUTO_EVENT_MIN_WIN_CHANCE, chooseAutoEvent, expectedRace, expectedRaceOn, getActiveEventCircuit } from "../raceExpectation";
import { resolveEventCircuit } from "../eventLadder";

function pureState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

function car(power: "weak" | "strong"): BuiltVehicle {
  const engine = power === "strong" ? "engine_v4" : "engine_small";
  return {
    id: "expect-car",
    definitionId: "riding_mower",
    parts: {
      engine: { part: { id: "e", definitionId: engine, condition: power === "strong" ? "pristine" : "worn", foundAt: "t", type: "part" }, addons: [] },
      wheel: { part: { id: "w", definitionId: "wheel_basic", condition: power === "strong" ? "pristine" : "worn", foundAt: "t", type: "part" }, addons: [] },
      frame: { part: { id: "f", definitionId: "frame_mower", condition: power === "strong" ? "pristine" : "worn", foundAt: "t", type: "part" }, addons: [] },
    },
    stats: { speed: 0, handling: 0, reliability: 0, weight: 0, performance: 0 },
    builtAt: 0,
    condition: 100,
    totalRaces: 0,
  };
}

const backyard = getCircuitById("backyard_derby")!;

describe("event-aware race expectation", () => {
  it("prices each event with its own difficulty, prize and fee", () => {
    const state = pureState({ garage: [car("strong")], activeVehicleId: "expect-car", scrapBucks: 100 });
    const sprint = expectedRaceOn(state, resolveEventCircuit(backyard, "sprint"))!;
    const feature = expectedRaceOn(state, resolveEventCircuit(backyard, "feature"))!;
    expect(sprint.eventId).toBe("sprint");
    expect(feature.eventId).toBe("feature");
    expect(sprint.winChance).toBeGreaterThan(feature.winChance);
    expect(feature.entryFee).toBe(resolveEventCircuit(backyard, "feature").entryFee);
    expect(expectedRaceOn(pureState(), resolveEventCircuit(backyard, "sprint"))).toBeNull();
  });

  it("auto-picks the best-paying open event the vehicle can contest, else the safest", () => {
    const openLadder = { backyard_derby: { sprint: 1, heat: 1 } };
    const strong = pureState({ garage: [car("strong")], activeVehicleId: "expect-car", scrapBucks: 100, eventWins: openLadder });
    const strongPick = chooseAutoEvent(strong, backyard);
    const strongOdds = expectedRaceOn(strong, strongPick)!;
    expect(strongOdds.winChance).toBeGreaterThanOrEqual(AUTO_EVENT_MIN_WIN_CHANCE);
    for (const eventId of ["sprint", "heat", "feature"] as const) {
      const other = expectedRaceOn(strong, resolveEventCircuit(backyard, eventId))!;
      if (other.winChance >= AUTO_EVENT_MIN_WIN_CHANCE) {
        expect(strongOdds.scrapPerRace - strongOdds.entryFee).toBeGreaterThanOrEqual(other.scrapPerRace - other.entryFee);
      }
    }

    // A worn, exhausted mower on the Regional ladder cannot contest anything: it takes the safest event.
    const regional = getCircuitById("regional_circuit")!;
    const weak = pureState({ garage: [car("weak")], activeVehicleId: "expect-car", scrapBucks: 100, eventWins: { regional_circuit: { sprint: 1, heat: 1 } }, fatigue: 90 });
    const weakOptions = (["sprint", "heat", "feature"] as const).map((eventId) => expectedRaceOn(weak, resolveEventCircuit(regional, eventId))!);
    expect(weakOptions.every((option) => option.winChance < AUTO_EVENT_MIN_WIN_CHANCE)).toBe(true);
    const weakOdds = expectedRaceOn(weak, chooseAutoEvent(weak, regional))!;
    for (const option of weakOptions) expect(weakOdds.winChance).toBeGreaterThanOrEqual(option.winChance);
    // Only the Sprint is open on a fresh venue, and a venue without a vehicle still resolves.
    expect(chooseAutoEvent(strong, getCircuitById("dirt_track")!).eventId).toBe("sprint");
    expect(chooseAutoEvent(pureState(), backyard).eventId).toBe("sprint");
  });

  it("honours a pinned event only while it is open", () => {
    const state = pureState({ garage: [car("strong")], activeVehicleId: "expect-car", pinnedEventIds: { backyard_derby: "feature" } });
    expect(getActiveEventCircuit(state)!.eventId).toBe("sprint");
    const opened = { ...state, eventWins: { backyard_derby: { sprint: 1, heat: 1 } } };
    expect(getActiveEventCircuit(opened)!.eventId).toBe("feature");
    expect(expectedRace(opened)!.eventId).toBe("feature");
    expect(getActiveEventCircuit(state, "nowhere")).toBeNull();
  });
});
