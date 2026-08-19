import { describe, expect, it } from "vitest";
import { getVehicleById } from "@/data/vehicles";
import type { ScavengedPart } from "../scavenge";
import { calculateStats, compareInstalledPart, type BuiltVehicle } from "../build";

function part(id: string, definitionId: string, condition: ScavengedPart["condition"], type: ScavengedPart["type"] = "part"): ScavengedPart {
  return { id, definitionId, condition, type, foundAt: "test" };
}

function mower(): { definition: NonNullable<ReturnType<typeof getVehicleById>>; vehicle: BuiltVehicle } {
  const definition = getVehicleById("push_mower")!;
  const parts = {
    engine: { part: part("installed-engine", "engine_small", "good"), addons: [] },
    wheel: { part: part("installed-wheel", "wheel_basic", "decent"), addons: [] },
  };
  return {
    definition,
    vehicle: {
      id: "test-mower",
      definitionId: definition.id,
      parts,
      stats: calculateStats(definition, parts, 42, 0.15),
      builtAt: 0,
      condition: 42,
      totalRaces: 0,
    },
  };
}

describe("compareInstalledPart", () => {
  it("matches direct calculateStats projection and reports every signed delta", () => {
    const { definition, vehicle } = mower();
    const candidate = part("candidate-engine", "engine_lawn", "pristine");

    const comparison = compareInstalledPart(definition, vehicle, "engine", candidate, 0.15);

    expect(comparison).not.toBeNull();
    const projectedParts = {
      ...vehicle.parts,
      engine: { part: candidate, addons: [] },
    };
    const direct = calculateStats(definition, projectedParts, vehicle.condition, 0.15);
    expect(comparison!.projectedStats).toEqual(direct);
    expect(comparison!.currentStats).toEqual(calculateStats(definition, vehicle.parts, vehicle.condition, 0.15));
    expect(comparison!.deltas).toEqual({
      speed: direct.speed - comparison!.currentStats.speed,
      handling: direct.handling - comparison!.currentStats.handling,
      reliability: direct.reliability - comparison!.currentStats.reliability,
      weight: direct.weight - comparison!.currentStats.weight,
      performance: direct.performance - comparison!.currentStats.performance,
    });
    expect(comparison!.displacedAddonCount).toBe(0);
  });

  it("drops add-ons beyond a lower-condition candidate's capacity", () => {
    const { definition, vehicle } = mower();
    const firstAddon = part("air-filter", "addon_air_filter", "good", "addon");
    const secondAddon = part("turbo", "addon_turbo_snail", "good", "addon");
    vehicle.parts.engine.addons = [firstAddon, secondAddon];
    const candidate = part("candidate-engine", "engine_lawn", "decent");

    const comparison = compareInstalledPart(definition, vehicle, "engine", candidate);

    const projectedParts = {
      ...vehicle.parts,
      engine: { part: candidate, addons: [firstAddon] },
    };
    expect(comparison!.projectedStats).toEqual(
      calculateStats(definition, projectedParts, vehicle.condition),
    );
    expect(comparison!.displacedAddonCount).toBe(1);
  });

  it("rejects add-ons, incompatible parts, and unknown slots", () => {
    const { definition, vehicle } = mower();

    expect(compareInstalledPart(
      definition,
      vehicle,
      "engine",
      part("addon", "addon_air_filter", "good", "addon"),
    )).toBeNull();
    expect(compareInstalledPart(
      definition,
      vehicle,
      "engine",
      part("wrong-core", "wheel_basic", "good"),
    )).toBeNull();
    expect(compareInstalledPart(
      definition,
      vehicle,
      "aero",
      part("core", "engine_lawn", "good"),
    )).toBeNull();
  });

  it.each(["toString", "__proto__"])(
    "rejects malformed inherited condition %s without projecting stats",
    (condition) => {
      const { definition, vehicle } = mower();
      const candidate = part(
        "malformed-condition",
        "engine_lawn",
        condition as ScavengedPart["condition"],
      );

      const comparison = compareInstalledPart(definition, vehicle, "engine", candidate);

      expect(comparison).toBeNull();
      expect(comparison?.projectedStats).toBeUndefined();
    },
  );
});
