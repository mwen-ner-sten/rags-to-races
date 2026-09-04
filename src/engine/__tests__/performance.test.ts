import { describe, expect, it } from "vitest";
import { getVehicleById } from "@/data/vehicles";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { calculateStats, compositePerformance, type BuiltVehicle, type InstalledPart } from "../build";
import { deriveVehicleStats, getCircuitPerformance, vehiclePerformance, withDerivedStats } from "../performance";

function installed(slot: string, definitionId: string): [string, InstalledPart] {
  return [slot, { part: { id: `${slot}_${definitionId}`, definitionId, condition: "decent", foundAt: "test", type: "part" }, addons: [] }];
}

/** A snapshot that could never come from these parts — proves it is ignored. */
const STALE_STATS = { speed: 999, handling: 999, reliability: 999, weight: 1, performance: 999 };

function mower(condition = 100, definitionId = "push_mower"): BuiltVehicle {
  const parts = Object.fromEntries([installed("engine", "engine_small"), installed("wheel", "wheel_busted")]);
  return { id: "mower", definitionId, parts, stats: { ...STALE_STATS }, builtAt: 0, condition, totalRaces: 0 };
}

const backyard = CIRCUIT_DEFINITIONS.find((c) => c.id === "backyard_derby")!;

describe("vehiclePerformance", () => {
  it("derives from parts and condition, never from the persisted stats snapshot", () => {
    const definition = getVehicleById("push_mower")!;
    const expected = compositePerformance(calculateStats(definition, mower().parts, 100));
    expect(vehiclePerformance(mower())).toBeCloseTo(expected, 8);
    expect(vehiclePerformance(mower())).not.toBeCloseTo(STALE_STATS.performance, 0);
  });

  it("applies the circuit-fit formula when a circuit is given", () => {
    const definition = getVehicleById("push_mower")!;
    const stats = calculateStats(definition, mower().parts, 100);
    expect(vehiclePerformance(mower(), backyard)).toBeCloseTo(getCircuitPerformance(stats, backyard), 8);
  });

  it("follows vehicle condition", () => {
    expect(vehiclePerformance(mower(20), backyard)).toBeLessThan(vehiclePerformance(mower(100), backyard));
  });

  it("applies the handling bonus the workshop and station equipment grant", () => {
    expect(vehiclePerformance(mower(), backyard, 0.5)).toBeGreaterThan(vehiclePerformance(mower(), backyard, 0));
  });

  it("falls back to the snapshot only when the vehicle definition is unknown (test fixtures)", () => {
    expect(vehiclePerformance(mower(100, "not_a_real_vehicle"))).toBeCloseTo(compositePerformance(STALE_STATS), 8);
  });

  it("withDerivedStats refreshes the cached stats and keeps every other field", () => {
    const refreshed = withDerivedStats(mower());
    expect(refreshed.id).toBe("mower");
    expect(refreshed.stats.performance).toBeCloseTo(vehiclePerformance(mower()), 8);
    expect(refreshed.stats).toEqual(deriveVehicleStats(mower()));
  });

  it("compositePerformance is exactly the value calculateStats caches", () => {
    const definition = getVehicleById("push_mower")!;
    const stats = calculateStats(definition, mower().parts, 100);
    expect(stats.performance).toBeCloseTo(compositePerformance(stats), 10);
  });
});
