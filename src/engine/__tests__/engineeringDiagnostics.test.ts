import { describe, expect, it } from "vitest";
import { getCircuitById } from "@/data/circuits";
import type { BuiltVehicle } from "../build";
import type { RaceOutcome } from "../race";
import { buildEngineeringReport, findDiagnosticVehicle } from "../engineeringDiagnostics";

const vehicle: BuiltVehicle = {
  id: "diagnostic_mower",
  definitionId: "push_mower",
  builtAt: 0,
  condition: 100,
  totalRaces: 1,
  stats: { speed: 18, handling: 8, reliability: 15, weight: 60, performance: 14 },
  parts: {
    engine: {
      part: { id: "engine", definitionId: "engine_small", condition: "good", foundAt: "test", type: "part" },
      addons: [],
    },
    wheel: {
      part: { id: "wheel", definitionId: "wheel_busted", condition: "rusted", foundAt: "test", type: "part" },
      addons: [],
    },
  },
};

const loss: RaceOutcome = {
  result: "loss",
  position: 6,
  totalRacers: 8,
  scrapsEarned: 1,
  repEarned: 1,
  log: [],
  circuitId: "backyard_derby",
};

describe("buildEngineeringReport", () => {
  it("connects the circuit's dominant demand to an installed component", () => {
    const report = buildEngineeringReport(vehicle, getCircuitById("backyard_derby")!, loss);

    expect(report.focus).toBe("grip");
    expect(report.component).toBe("Busted Wheel");
    expect(report.observation).toMatch(/grip|corner/i);
    expect(report.action).toMatch(/wheel|tire|refurbish|replace/i);
  });

  it("prioritizes repairing a damaged vehicle after a DNF", () => {
    const report = buildEngineeringReport({ ...vehicle, condition: 77 }, getCircuitById("backyard_derby")!, { ...loss, result: "dnf" });

    expect(report.priority).toBe("repair");
    expect(report.focus).toBe("reliability");
    expect(report.action).toMatch(/repair/i);
  });

  it("still identifies an improvement after a win without calling it a failure", () => {
    const report = buildEngineeringReport(vehicle, getCircuitById("backyard_derby")!, { ...loss, result: "win", position: 1 });

    expect(report.headline).toMatch(/worked|won|validated/i);
    expect(report.action.length).toBeGreaterThan(10);
  });
});

describe("findDiagnosticVehicle", () => {
  const otherVehicle = { ...vehicle, id: "new-active-vehicle" };

  it("keeps a recorded result tied to the vehicle that raced", () => {
    expect(findDiagnosticVehicle([vehicle, otherVehicle], vehicle.id)).toBe(vehicle);
  });

  it("does not describe another vehicle when the raced vehicle is gone", () => {
    expect(findDiagnosticVehicle([otherVehicle], vehicle.id)).toBeUndefined();
  });

  it("suppresses diagnostics for legacy outcomes without a vehicle id", () => {
    expect(findDiagnosticVehicle([otherVehicle], undefined)).toBeUndefined();
  });
});
