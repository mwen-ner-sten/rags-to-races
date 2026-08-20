import { describe, expect, it } from "vitest";
import { getVehicleById } from "@/data/vehicles";
import { getCircuitById } from "@/data/circuits";
import type { PartCondition } from "@/data/parts";
import type { ScavengedPart } from "../scavenge";
import type { BuiltVehicle, InstalledPart } from "../build";
import { calculateBuildCircuitEvaluation, calculateBuildProfile, classifyBuildIndices } from "../buildIdentity";

let sequence = 0;

function item(definitionId: string, condition: PartCondition, type: ScavengedPart["type"] = "part"): ScavengedPart {
  sequence += 1;
  return { id: `identity-${sequence}`, definitionId, condition, type, foundAt: "test" };
}

function installed(
  definitionId: string,
  condition: PartCondition,
  addons: Array<[string, PartCondition]> = [],
): InstalledPart {
  return {
    part: item(definitionId, condition),
    addons: addons.map(([id, addonCondition]) => item(id, addonCondition, "addon")),
  };
}

function vehicle(
  definitionId: string,
  parts: BuiltVehicle["parts"],
  condition = 100,
): BuiltVehicle {
  return {
    id: `vehicle-${definitionId}`,
    definitionId,
    parts,
    stats: { speed: 1, handling: 1, reliability: 1, weight: 1, performance: 1 },
    builtAt: 0,
    condition,
    totalRaces: 0,
  };
}

describe("calculateBuildProfile", () => {
  it("names a direction at the exact four-point dominance boundary", () => {
    const boundary = classifyBuildIndices({ pace: 1.09, handling: 1.05, reliability: 1 });
    expect(boundary.identity).toBe("redline_special");
    expect(boundary.dominanceGap).toBeCloseTo(0.04);
    expect(classifyBuildIndices({ pace: 1.089, handling: 1.05, reliability: 1 }).identity).toBeNull();
  });

  it("derives Redline Special from legal pace-focused hardware", () => {
    const definition = getVehicleById("push_mower")!;
    const build = vehicle(definition.id, {
      engine: installed("engine_lawn", "artifact", [
        ["addon_nitrous", "artifact"],
        ["addon_turbo_snail", "artifact"],
      ]),
      wheel: installed("wheel_busted", "good"),
    });

    const profile = calculateBuildProfile(definition, build);

    expect(profile.identity).toBe("redline_special");
    expect(profile.dominantAxis).toBe("pace");
  });

  it("derives Cornering Rig from legal handling-focused hardware", () => {
    const definition = getVehicleById("push_mower")!;
    const build = vehicle(definition.id, {
      engine: installed("engine_small", "rusted"),
      wheel: installed("wheel_basic", "artifact", [
        ["addon_wheel_spacers", "artifact"],
        ["addon_tire_warmers", "artifact"],
        ["addon_slick_compound", "artifact"],
      ]),
    });

    const profile = calculateBuildProfile(definition, build);

    expect(profile.identity).toBe("cornering_rig");
    expect(profile.dominantAxis).toBe("handling");
  });

  it("derives Finish-First Build from legal reliability-focused hardware", () => {
    const definition = getVehicleById("go_kart")!;
    const build = vehicle(definition.id, {
      engine: installed("engine_v4", "rusted"),
      wheel: installed("wheel_basic", "rusted"),
      frame: installed("frame_steel", "artifact", [["addon_roll_cage", "artifact"]]),
      fuel: installed("fuel_tank_large", "artifact", [["addon_fuel_filter", "artifact"]]),
    });

    const profile = calculateBuildProfile(definition, build);

    expect(profile.identity).toBe("finish_first");
    expect(profile.dominantAxis).toBe("reliability");
  });

  it("continuously rewards a handling-focused build on a handling-led circuit", () => {
    const definition = getVehicleById("push_mower")!;
    const circuit = getCircuitById("backyard_derby")!;
    const build = vehicle(definition.id, {
      engine: installed("engine_small", "rusted"),
      wheel: installed("wheel_basic", "artifact", [
        ["addon_wheel_spacers", "artifact"],
        ["addon_tire_warmers", "artifact"],
        ["addon_slick_compound", "artifact"],
      ]),
    });

    const evaluation = calculateBuildCircuitEvaluation(definition, build, circuit.profile);

    expect(evaluation.alignment).toBeGreaterThan(0);
    expect(evaluation.performanceMultiplier).toBeGreaterThan(1);
    expect(evaluation.performanceMultiplier).toBeLessThanOrEqual(1.05);
  });

  it("returns no identity for an underdeveloped build", () => {
    const definition = getVehicleById("push_mower")!;
    const profile = calculateBuildProfile(definition, vehicle(definition.id, {
      engine: installed("engine_small", "rusted"),
      wheel: installed("wheel_busted", "rusted"),
    }));

    expect(profile.identity).toBeNull();
  });

  it("does not let vehicle wear rename the hardware direction", () => {
    const definition = getVehicleById("push_mower")!;
    const parts = {
      engine: installed("engine_lawn", "artifact", [["addon_nitrous", "artifact"]]),
      wheel: installed("wheel_busted", "good"),
    };

    expect(calculateBuildProfile(definition, vehicle(definition.id, parts, 100)).identity)
      .toBe(calculateBuildProfile(definition, vehicle(definition.id, parts, 1)).identity);
  });

  it("ignores fuel demand when evaluating hardware fit", () => {
    const definition = getVehicleById("push_mower")!;
    const circuit = getCircuitById("backyard_derby")!;
    const build = vehicle(definition.id, {
      engine: installed("engine_lawn", "artifact", [["addon_nitrous", "artifact"]]),
      wheel: installed("wheel_busted", "good"),
    });
    const fuelHeavy = {
      ...circuit.profile,
      demands: { ...circuit.profile.demands, fuel: circuit.profile.demands.fuel + 100 },
    };

    expect(calculateBuildCircuitEvaluation(definition, build, fuelHeavy).performanceMultiplier)
      .toBe(calculateBuildCircuitEvaluation(definition, build, circuit.profile).performanceMultiplier);
  });

  it("fails neutral instead of producing NaN for malformed installed hardware", () => {
    const definition = getVehicleById("push_mower")!;
    const malformed = vehicle(definition.id, {
      engine: installed("engine_lawn", "not-a-condition" as PartCondition),
      wheel: installed("unknown-wheel", "good"),
    });

    const evaluation = calculateBuildCircuitEvaluation(definition, malformed, getCircuitById("backyard_derby")!.profile);

    expect(evaluation.profile.identity).toBeNull();
    expect(Object.values(evaluation.profile.indices).every(Number.isFinite)).toBe(true);
    expect(evaluation.performanceMultiplier).toBe(1);
  });
});
