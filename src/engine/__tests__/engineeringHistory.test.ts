import { describe, expect, it } from "vitest";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import { selectEngineeringHistory } from "../engineeringHistory";

const vehicle: BuiltVehicle = {
  id: "race-car-7",
  definitionId: "push_mower",
  parts: {},
  stats: { speed: 10, handling: 10, reliability: 10, weight: 10, performance: 10 },
  builtAt: 1,
  condition: 88,
  totalRaces: 4,
};

function reportedRace(index: number): RaceOutcome {
  return {
    result: index === 0 ? "win" : "loss",
    position: index === 0 ? 1 : 4,
    totalRacers: 8,
    scrapsEarned: 10,
    repEarned: 2,
    log: [`race ${index}`],
    vehicleId: vehicle.id,
    circuitId: "backyard_derby",
    engineeringReport: {
      headline: `Stored diagnosis ${index}`,
      focus: "grip",
      priority: "component",
      component: "Basic Tire",
      slot: "wheel",
      observation: `Stored evidence ${index}`,
      action: `Stored action ${index}`,
    },
  };
}

describe("selectEngineeringHistory", () => {
  it("returns a bounded newest-first view with resolved circuit and raced vehicle identity", () => {
    const races = Array.from({ length: 12 }, (_, index) => reportedRace(index));

    const history = selectEngineeringHistory(races, [vehicle], 8);

    expect(history).toHaveLength(8);
    expect(history[0]).toMatchObject({
      result: "win",
      position: 1,
      circuitId: "backyard_derby",
      circuitName: "Backyard Derby",
      vehicleId: "race-car-7",
      vehicleName: "Push Mower",
      vehicleAvailability: "available",
      report: races[0].engineeringReport,
    });
    expect(history.at(-1)?.report?.headline).toBe("Stored diagnosis 7");
  });

  it("never expands beyond the notebook's bounded recent-history window", () => {
    const races = Array.from({ length: 12 }, (_, index) => reportedRace(index));

    const history = selectEngineeringHistory(races, [vehicle], Number.POSITIVE_INFINITY);

    expect(history).toHaveLength(8);
    expect(history.at(-1)?.report?.headline).toBe("Stored diagnosis 7");
  });

  it("keeps legacy entries honest instead of substituting a garage vehicle or diagnosis", () => {
    const legacyRace: RaceOutcome = {
      result: "dnf",
      position: 8,
      totalRacers: 8,
      scrapsEarned: 0,
      repEarned: 1,
      log: ["Legacy breakdown"],
      circuitId: "backyard_derby",
    };

    const [entry] = selectEngineeringHistory([legacyRace], [vehicle]);

    expect(entry).toMatchObject({
      vehicleAvailability: "legacy",
      vehicleId: undefined,
      vehicleName: undefined,
      vehicleLabel: "Vehicle not recorded",
      report: undefined,
    });
  });

  it("retains a missing raced vehicle's recorded identity and stored report", () => {
    const race = {
      ...reportedRace(0),
      vehicleId: "sold-race-car",
    };

    const [entry] = selectEngineeringHistory([race], [vehicle]);

    expect(entry).toMatchObject({
      vehicleAvailability: "sold-or-missing",
      vehicleId: "sold-race-car",
      vehicleName: undefined,
      vehicleLabel: "Vehicle no longer in garage · sold-race-car",
      report: race.engineeringReport,
    });
  });
});
