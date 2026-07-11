import { describe, expect, it } from "vitest";
import { canEnterSelectedRace, canScavengeSelectedLocation, getRaceIneligibilityReason } from "../eligibility";
import type { BuiltVehicle } from "../build";

function vehicle(definitionId = "push_mower"): BuiltVehicle {
  return {
    id: "vehicle",
    definitionId,
    parts: {},
    stats: { speed: 10, handling: 10, reliability: 10, weight: 10, performance: 10 },
    builtAt: 1,
    condition: 100,
    totalRaces: 0,
  };
}

describe("gameplay eligibility contracts", () => {
  it("rejects a locked or under-tier selected circuit", () => {
    const state = {
      activeVehicleId: "vehicle",
      garage: [vehicle()],
      selectedCircuitId: "regional_circuit",
      unlockedCircuitIds: ["backyard_derby"],
      scrapBucks: 1_000,
    };
    expect(getRaceIneligibilityReason(state)).toBe("circuit_locked");
    expect(canEnterSelectedRace({ ...state, unlockedCircuitIds: ["backyard_derby", "regional_circuit"] })).toBe(false);
    expect(getRaceIneligibilityReason({ ...state, unlockedCircuitIds: ["backyard_derby", "regional_circuit"] })).toBe("vehicle_tier_low");
  });

  it("accepts an unlocked circuit with an eligible vehicle and entry fee", () => {
    expect(canEnterSelectedRace({
      activeVehicleId: "vehicle",
      garage: [vehicle("street_racer")],
      selectedCircuitId: "regional_circuit",
      unlockedCircuitIds: ["regional_circuit"],
      scrapBucks: 1_000,
    })).toBe(true);
  });

  it("rejects stale locked location selections", () => {
    expect(canScavengeSelectedLocation({ selectedLocationId: "local_junkyard", unlockedLocationIds: ["curbside"] })).toBe(false);
    expect(canScavengeSelectedLocation({ selectedLocationId: "local_junkyard", unlockedLocationIds: ["curbside", "local_junkyard"] })).toBe(true);
  });
});
