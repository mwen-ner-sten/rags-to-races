import { describe, expect, it } from "vitest";
import { calculateStats, expectedLoadedWeight, RELIABILITY_CONDITION_FLOOR, type BuiltVehicle, type InstalledPart } from "../build";
import { getVehicleById } from "@/data/vehicles";
import { getPartById, type PartCondition } from "@/data/parts";
import { isVariantPartId } from "@/data/partVariants";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getCircuitPerformance, winChanceFromRatio } from "../race";
import { buildEngineeringReport, diagnoseFocus } from "../engineeringDiagnostics";
import type { RaceOutcome } from "../race";

function installed(slot: string, definitionId: string, condition: PartCondition = "pristine"): [string, InstalledPart] {
  return [slot, { part: { id: `${slot}_${definitionId}`, definitionId, condition, foundAt: "test", type: "part" }, addons: [] }];
}

function build(vehicleId: string, selections: Record<string, string>, condition = 100): BuiltVehicle {
  const definition = getVehicleById(vehicleId)!;
  const parts = Object.fromEntries(Object.entries(selections).map(([slot, id]) => installed(slot, id)));
  return { id: `test_${vehicleId}`, definitionId: vehicleId, parts, stats: calculateStats(definition, parts, condition), builtAt: 0, condition, totalRaces: 0 };
}

const streetRacer = {
  heavyPower: { engine: "engine_v8", wheel: "wheel_sport", frame: "frame_steel", fuel: "fuel_tank_large", drivetrain: "drive_manual" },
  lightGrip: { engine: "engine_v6", wheel: "wheel_racing", frame: "frame_carbon", fuel: "fuel_tank_large", drivetrain: "drive_chain" },
};

describe("vehicle stat model", () => {
  it("gives every part a handling contribution so grip is an independent axis", () => {
    expect(getPartById("wheel_racing")!.baseHandling).toBeGreaterThan(getPartById("wheel_busted")!.baseHandling);
    expect(getPartById("susp_active")!.baseHandling).toBeGreaterThan(0);
    expect(getPartById("engine_v8")!.baseHandling).toBe(0);
  });

  it("trades pace for grip: the heavier power build is faster, the lighter grip build corners better", () => {
    const heavy = build("street_racer", streetRacer.heavyPower).stats;
    const light = build("street_racer", streetRacer.lightGrip).stats;
    expect(heavy.speed).toBeGreaterThan(light.speed);
    expect(light.handling).toBeGreaterThan(heavy.handling);
    expect(heavy.weight).toBeGreaterThan(expectedLoadedWeight(getVehicleById("street_racer")!));
    expect(light.weight).toBeLessThan(expectedLoadedWeight(getVehicleById("street_racer")!));
  });

  it("makes reliability follow condition so a damaged car breaks down more, not just drives slower", () => {
    const fresh = build("street_racer", streetRacer.heavyPower, 100).stats;
    const worn = build("street_racer", streetRacer.heavyPower, 50).stats;
    const wrecked = build("street_racer", streetRacer.heavyPower, 0).stats;
    expect(worn.reliability).toBeLessThan(fresh.reliability);
    expect(wrecked.reliability).toBeCloseTo(fresh.reliability * RELIABILITY_CONDITION_FLOOR, 5);
    // Above the 70% threshold pace is untouched, so the only change is reliability.
    const slightlyWorn = build("street_racer", streetRacer.heavyPower, 80).stats;
    expect(slightlyWorn.speed).toBeCloseTo(fresh.speed, 5);
    expect(slightlyWorn.reliability).toBeLessThan(fresh.reliability);
  });

  it("fits builds to circuits: the power build gains on power-led tracks, the grip build on corner-heavy ones", () => {
    const heavy = build("street_racer", streetRacer.heavyPower).stats;
    const light = build("street_racer", streetRacer.lightGrip).stats;
    const regional = CIRCUIT_DEFINITIONS.find((c) => c.id === "regional_circuit")!;
    const national = CIRCUIT_DEFINITIONS.find((c) => c.id === "national_circuit")!;
    const heavyEdgeOnRegional = getCircuitPerformance(heavy, regional) / getCircuitPerformance(light, regional);
    const heavyEdgeOnNational = getCircuitPerformance(heavy, national) / getCircuitPerformance(light, national);
    expect(heavyEdgeOnRegional).toBeGreaterThan(heavyEdgeOnNational);
  });

  /**
   * Phase 2 ladder guard (anchor retuned 2026-09-04). Every venue's Heat is a
   * contest for a decent tier-minimum build (35-55% win) and a strong but not
   * safe bet for a pristine tier-maximum build (65-80%). The Backyard Derby
   * is the tutorial venue: its ceiling build is the Riding Mower, which runs
   * into the 85% cap, so only its floor is guarded. Per-event numbers are
   * printed by scripts/calibrate-circuits.ts and recorded in docs/balance.
   */
  it("keeps every Heat a contest for a decent tier-minimum build and beatable-but-not-safe for a pristine tier-maximum build", () => {
    const byTier = ["push_mower", "riding_mower", "go_kart", "beater_car", "street_racer", "rally_car", "stock_car", "prototype_racer", "supercar", "hypercar", "prototype_x"];
    // Same builds as scripts/calibrate-circuits.ts: base parts only (the
    // Light / Sturdy siblings are the tradeoff around these numbers), the
    // lightest per required slot for the floor, the strongest per slot for the ceiling.
    const baseParts = (ids: readonly string[]) => ids.filter((id) => !isVariantPartId(id)).map((id) => getPartById(id)!);
    const floorOf = (vehicleId: string, circuit: (typeof CIRCUIT_DEFINITIONS)[number]) => {
      const vehicle = getVehicleById(vehicleId)!;
      const parts = Object.fromEntries(vehicle.slots.filter((s) => s.required).map((s) => {
        const lightest = baseParts(s.acceptableParts).reduce((a, b) => (b.baseWeight < a.baseWeight ? b : a));
        return installed(s.slot, lightest.id, "decent");
      }));
      return getCircuitPerformance(calculateStats(vehicle, parts), circuit) / circuit.difficulty;
    };
    const ceilOf = (vehicleId: string, circuit: (typeof CIRCUIT_DEFINITIONS)[number]) => {
      const vehicle = getVehicleById(vehicleId)!;
      const parts = Object.fromEntries(vehicle.slots.map((s) => {
        const best = baseParts(s.acceptableParts).reduce((a, b) => (b.basePower + b.baseHandling + b.baseReliability > a.basePower + a.baseHandling + a.baseReliability ? b : a));
        return installed(s.slot, best.id, "pristine");
      }));
      return getCircuitPerformance(calculateStats(vehicle, parts), circuit) / circuit.difficulty;
    };
    for (let index = 1; index < CIRCUIT_DEFINITIONS.length; index++) {
      expect(CIRCUIT_DEFINITIONS[index].difficulty, CIRCUIT_DEFINITIONS[index].id).toBeGreaterThanOrEqual(CIRCUIT_DEFINITIONS[index - 1].difficulty);
    }
    for (const circuit of CIRCUIT_DEFINITIONS) {
      const floor = winChanceFromRatio(floorOf(byTier[circuit.minVehicleTier], circuit));
      expect(floor, `${circuit.id} floor`).toBeGreaterThanOrEqual(0.35);
      expect(floor, `${circuit.id} floor`).toBeLessThanOrEqual(0.55);
      if (circuit.id === "backyard_derby") continue;
      const ceil = winChanceFromRatio(ceilOf(byTier[circuit.maxVehicleTier], circuit));
      expect(ceil, `${circuit.id} ceiling`).toBeGreaterThanOrEqual(0.65);
      expect(ceil, `${circuit.id} ceiling`).toBeLessThanOrEqual(0.80);
    }
  });
});

describe("engineering debrief", () => {
  const loss = (position = 4): RaceOutcome => ({ result: "loss", position, totalRacers: 8, scrapsEarned: 1, repEarned: 0.5, log: [], circuitId: "regional_circuit" });

  it("blames grip on a corner-heavy circuit when the build leans on pace, and pace on a power circuit when it leans on grip", () => {
    const heavy = build("street_racer", streetRacer.heavyPower);
    const light = build("street_racer", streetRacer.lightGrip);
    const regional = CIRCUIT_DEFINITIONS.find((c) => c.id === "regional_circuit")!;
    const national = CIRCUIT_DEFINITIONS.find((c) => c.id === "national_circuit")!;
    expect(diagnoseFocus(heavy, national, loss())).toBe("grip");
    expect(diagnoseFocus(light, regional, loss())).toBe("power");
  });

  it("calls out weight when the build is far over the chassis' expected load", () => {
    // A go-kart with a V6 and a steel unibody carries ~33% more than the chassis expects.
    const overloaded = build("go_kart", { engine: "engine_v6", wheel: "wheel_sport", frame: "frame_steel", fuel: "fuel_tank_large" });
    const regional = CIRCUIT_DEFINITIONS.find((c) => c.id === "regional_circuit")!;
    // Diagnostics derive weight from the installed parts, so a stale snapshot cannot hide the overload.
    const heavier = { ...overloaded, stats: { ...overloaded.stats, weight: 0 } };
    const report = buildEngineeringReport(heavier, regional, loss());
    expect(report.focus).toBe("weight");
    expect(report.component).toBe("Steel Unibody");
    expect(report.action).toMatch(/lighter/i);
  });

  it("prioritises repair on a DNF and says why", () => {
    const damaged = build("street_racer", streetRacer.heavyPower, 40);
    const regional = CIRCUIT_DEFINITIONS.find((c) => c.id === "regional_circuit")!;
    const report = buildEngineeringReport(damaged, regional, { ...loss(8), result: "dnf" });
    expect(report.priority).toBe("repair");
    expect(report.focus).toBe("reliability");
    expect(report.observation).toMatch(/breaks down more/);
  });
});
