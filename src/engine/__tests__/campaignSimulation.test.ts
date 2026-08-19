import { describe, expect, it } from "vitest";
import { CAMPAIGN_PACING_TARGETS_HOURS, DECISION_SESSION_TARGET_MINUTES } from "@/data/campaignPacing";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { DEFAULT_RACE_PLAN, type CircuitProfile, type RacePlan } from "@/data/raceStrategy";
import type { BuiltVehicle } from "@/engine/build";
import { simulateRace } from "@/engine/race";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

type Strategy = "weak" | "average" | "optimized";

function tunedPlan(profile: CircuitProfile): RacePlan {
  const needsFuel = profile.length === "long" || profile.demands.fuel >= 7;
  return {
    tire: profile.weather === "wet" ? "wet" : "medium",
    fuelLoad: needsFuel ? "heavy" : "balanced",
    gearing: profile.cornerDensity === "high" ? "short" : profile.length === "long" ? "long" : "balanced",
    aero: profile.cornerDensity === "high" ? "high" : profile.cornerDensity === "low" ? "low" : "balanced",
    suspension: profile.surface !== "asphalt" || profile.cornerDensity === "high" ? "soft" : "balanced",
    aggression: "balanced",
    pitStrategy: !profile.pitAvailable ? "none" : needsFuel ? "scheduled" : "reactive",
  };
}

function vehicleFor(strategy: Strategy, difficulty: number): BuiltVehicle {
  const multipliers = { weak: 0.55, average: 0.95, optimized: 1.35 } as const;
  const reliability = { weak: 20, average: 55, optimized: 100 } as const;
  return {
    id: `sim-${strategy}`,
    definitionId: "simulation_fixture",
    parts: {},
    stats: {
      speed: difficulty,
      handling: difficulty,
      reliability: reliability[strategy],
      weight: 500,
      performance: difficulty * 2 * multipliers[strategy],
    },
    builtAt: 0,
    condition: 100,
    totalRaces: 0,
  };
}

describe("1,000-seed campaign simulation guardrails", () => {
  it("keeps every circuit finite and rewards preparation", () => {
    const totals: Record<Strategy, { races: number; wins: number; dnfs: number; scrap: number; rep: number }> = {
      weak: { races: 0, wins: 0, dnfs: 0, scrap: 0, rep: 0 },
      average: { races: 0, wins: 0, dnfs: 0, scrap: 0, rep: 0 },
      optimized: { races: 0, wins: 0, dnfs: 0, scrap: 0, rep: 0 },
    };

    for (let seed = 0; seed < 1_000; seed += 1) {
      for (const circuit of CIRCUIT_DEFINITIONS) {
        for (const strategy of Object.keys(totals) as Strategy[]) {
          const plan = strategy === "optimized" ? tunedPlan(circuit.profile) : DEFAULT_RACE_PLAN;
          const outcome = withRandomSource(
            new SeededRandomSource(`${seed}:${circuit.id}:${strategy}`),
            () => simulateRace(vehicleFor(strategy, circuit.difficulty), circuit, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, false, plan),
          );
          expect(outcome.circuitId).toBe(circuit.id);
          expect(outcome.vehicleId).toBe(`sim-${strategy}`);
          expect(outcome.position).toBeGreaterThanOrEqual(1);
          expect(outcome.position).toBeLessThanOrEqual(8);
          expect(Number.isFinite(outcome.scrapsEarned)).toBe(true);
          expect(Number.isFinite(outcome.repEarned)).toBe(true);
          expect(outcome.scrapsEarned).toBeGreaterThanOrEqual(0);
          expect(outcome.repEarned).toBeGreaterThanOrEqual(0);
          totals[strategy].races += 1;
          totals[strategy].wins += outcome.result === "win" ? 1 : 0;
          totals[strategy].dnfs += outcome.result === "dnf" ? 1 : 0;
          totals[strategy].scrap += outcome.scrapsEarned;
          totals[strategy].rep += outcome.repEarned;
        }
      }
    }

    expect(totals.average.wins / totals.average.races).toBeGreaterThan(totals.weak.wins / totals.weak.races);
    expect(totals.optimized.wins / totals.optimized.races).toBeGreaterThan(totals.average.wins / totals.average.races);
    expect(totals.optimized.dnfs).toBeLessThan(totals.weak.dnfs);
    expect(totals.optimized.scrap).toBeGreaterThan(totals.average.scrap);
    expect(totals.optimized.rep).toBeGreaterThan(totals.average.rep);
  });

  it("keeps pacing targets ordered and decision sessions bounded", () => {
    const layers = Object.values(CAMPAIGN_PACING_TARGETS_HOURS);
    for (const target of layers) expect(target.min).toBeLessThan(target.max);
    for (let index = 1; index < layers.length; index += 1) {
      expect(layers[index].min).toBeGreaterThan(layers[index - 1].max);
    }
    expect(DECISION_SESSION_TARGET_MINUTES).toEqual({ min: 10, max: 20 });
  });
});
