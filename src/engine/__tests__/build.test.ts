import { describe, it, expect } from "vitest";
import { calculateRepairCost } from "../build";
import type { VehicleDefinition } from "@/data/vehicles";

// Minimal vehicle definition stub for testing repair cost
const makeVehicleDef = (tier: number) =>
  ({ tier }) as VehicleDefinition;

describe("calculateRepairCost", () => {
  // REPAIR_COST_BASE = 1, REPAIR_COST_PER_POINT_PER_TIER = 3

  it("returns 0 when target <= current condition", () => {
    expect(calculateRepairCost(makeVehicleDef(0), 100, 100, 0)).toBe(0);
    expect(calculateRepairCost(makeVehicleDef(0), 80, 50, 0)).toBe(0);
  });

  it("calculates base cost for tier 0", () => {
    // costPerPoint = 1 + 0*3 = 1, points = 10, baseCost = 10
    expect(calculateRepairCost(makeVehicleDef(0), 90, 100, 0)).toBe(10);
  });

  it("scales cost with vehicle tier", () => {
    // Tier 2: costPerPoint = 1 + 2*3 = 7, points = 10, baseCost = 70
    expect(calculateRepairCost(makeVehicleDef(2), 90, 100, 0)).toBe(70);
  });

  it("applies repair cost reduction", () => {
    // Tier 0, 10 points, baseCost = 10, 50% reduction → 5
    expect(calculateRepairCost(makeVehicleDef(0), 90, 100, 0.5)).toBe(5);
  });

  it("applies fatigue multiplier", () => {
    // Tier 0, 10 points, baseCost = 10, no reduction, fatigue=50
    // fatigueMult = 1 + 50*0.01 = 1.5, final = floor(10 * 1.5) = 15
    expect(calculateRepairCost(makeVehicleDef(0), 90, 100, 0, 50)).toBe(15);
  });

  it("returns minimum cost of 1", () => {
    // Even with 100% reduction, result should be at least 1
    expect(calculateRepairCost(makeVehicleDef(0), 99, 100, 1.0)).toBe(1);
  });

  it("combines reduction and fatigue correctly", () => {
    // Tier 1: costPerPoint = 1 + 1*3 = 4, points = 20, baseCost = 80
    // 25% reduction: 80 * 0.75 = 60
    // fatigue 20: fatigueMult = 1 + 20*0.01 = 1.2, final = floor(60 * 1.2) = 72
    expect(calculateRepairCost(makeVehicleDef(1), 80, 100, 0.25, 20)).toBe(72);
  });
});
