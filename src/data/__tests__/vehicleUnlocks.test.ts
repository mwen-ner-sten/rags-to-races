import { describe, expect, it } from "vitest";
import {
  formatVehicleUnlockRequirement,
  getVehicleById,
  isVehicleUnlockRequirementMet,
  type VehicleUnlockProgress,
} from "../vehicles";
import { REP_PROGRESSION } from "@/config/progression";

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
    ["beater_car", REP_PROGRESSION.vehicles.beater_car],
    ["street_racer", REP_PROGRESSION.vehicles.street_racer],
    ["stock_car", REP_PROGRESSION.vehicles.stock_car],
    ["supercar", REP_PROGRESSION.vehicles.supercar],
  ] as const)("unlocks %s at the exact displayed reputation boundary", (vehicleId, amount) => {
    const requirement = getVehicleById(vehicleId)!.unlockRequirement;

    expect(formatVehicleUnlockRequirement(requirement)).toBe(
      `Reach ${amount.toLocaleString("en-US")} Reputation`,
    );
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: amount - 1 }))).toBe(false);
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: amount }))).toBe(true);
  });

  it("unlocks the Go-Kart on the shared Rep ladder alongside Dirt Track and the Local Junkyard", () => {
    const requirement = getVehicleById("go_kart")!.unlockRequirement;

    expect(formatVehicleUnlockRequirement(requirement)).toBe("Reach 25 Reputation");
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: 24 }))).toBe(false);
    expect(isVehicleUnlockRequirementMet(requirement, progress({ reputation: 25 }))).toBe(true);
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
