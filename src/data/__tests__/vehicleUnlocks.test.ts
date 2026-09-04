import { describe, expect, it } from "vitest";
import {
  formatVehicleUnlockRequirement,
  getVehicleById,
  isVehicleUnlockRequirementMet,
  type VehicleUnlockProgress,
} from "../vehicles";
import { REP_UNLOCK_COSTS } from "@/config/progression";

function progress(overrides: Partial<VehicleUnlockProgress> = {}): VehicleUnlockProgress {
  return {
    reputation: 0,
    wonCircuitIds: [],
    circuitWinStreaks: {},
    ownerUpgradeLevels: {},
    ...overrides,
  };
}

describe("vehicle blueprint unlock contracts", () => {
  it.each([
    ["beater_car", REP_UNLOCK_COSTS.vehicles.beater_car],
    ["street_racer", REP_UNLOCK_COSTS.vehicles.street_racer],
    ["stock_car", REP_UNLOCK_COSTS.vehicles.stock_car],
    ["supercar", REP_UNLOCK_COSTS.vehicles.supercar],
  ] as const)("prices %s at the exact displayed Rep cost", (vehicleId, amount) => {
    const requirement = getVehicleById(vehicleId)!.unlockRequirement;

    expect(formatVehicleUnlockRequirement(requirement)).toBe(
      `Costs ${amount.toLocaleString("en-US")} Rep`,
    );
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: amount - 1 }))).toBe(false);
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: amount }))).toBe(true);
  });

  it("prices the Go-Kart on the halved shared Rep ladder", () => {
    const requirement = getVehicleById("go_kart")!.unlockRequirement;

    expect(formatVehicleUnlockRequirement(requirement)).toBe("Costs 13 Rep");
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: 12 }))).toBe(false);
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: 13 }))).toBe(true);
  });

  it("keeps the streak requirement type evaluable for future blueprints", () => {
    const requirement = { type: "circuit_win_streak", circuitId: "backyard_derby", wins: 5 } as const;
    expect(formatVehicleUnlockRequirement(requirement)).toBe("5-win streak at the Backyard Derby");
    expect(isVehicleUnlockRequirementMet(requirement, progress({ circuitWinStreaks: { backyard_derby: 4 } }))).toBe(false);
    expect(isVehicleUnlockRequirementMet(requirement, progress({ circuitWinStreaks: { backyard_derby: 5 } }))).toBe(true);
  });

  it("derives circuit-win and Owner-upgrade labels from structured identifiers", () => {
    const rally = getVehicleById("rally_car")!.unlockRequirement;
    const hypercar = getVehicleById("hypercar")!.unlockRequirement;

    expect(formatVehicleUnlockRequirement(rally)).toBe("Win a Regional Circuit race");
    expect(isVehicleUnlockRequirementMet(rally, progress({ wonCircuitIds: ["regional_circuit"] }))).toBe(true);
    expect(formatVehicleUnlockRequirement(hypercar)).toBe("Owner upgrade: Vehicle Mastery");
    expect(isVehicleUnlockRequirementMet(hypercar, progress({ ownerUpgradeLevels: { owner_vehicle_mastery: 1 } }))).toBe(true);
  });
});
