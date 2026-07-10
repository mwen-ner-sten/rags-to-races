import { describe, expect, it } from "vitest";
import { buildRaceForecast, DEFAULT_RACE_PLAN, evaluateRacePlan, RACE_PLAN_PRESETS, type CircuitProfile, type RacePlan } from "@/data/raceStrategy";
import { calculateOdds } from "../race";

const profile: CircuitProfile = { surface: "gravel", weather: "wet", length: "long", cornerDensity: "high", demands: { power: 7, grip: 9, aero: 8, reliability: 8, fuel: 9 }, wearPressure: 1.3, breakdownPressure: 1.05, pitAvailable: true, rewardProfile: "endurance" };
const plan = (changes: Partial<RacePlan>): RacePlan => ({ ...DEFAULT_RACE_PLAN, ...changes });

describe("strategic race preparation", () => {
  it.each([
    ["tire", plan({ tire: "wet" }), plan({ tire: "soft" }), "performanceMultiplier"],
    ["fuel", plan({ fuelLoad: "heavy" }), plan({ fuelLoad: "light" }), "fuelRisk"],
    ["gearing", plan({ gearing: "short" }), plan({ gearing: "long" }), "performanceMultiplier"],
    ["aero", plan({ aero: "high" }), plan({ aero: "low" }), "performanceMultiplier"],
    ["suspension", plan({ suspension: "soft" }), plan({ suspension: "stiff" }), "performanceMultiplier"],
    ["pit", plan({ fuelLoad: "heavy", pitStrategy: "scheduled" }), plan({ fuelLoad: "heavy", pitStrategy: "none" }), "fuelRisk"],
  ] as const)("makes %s choice affect the shared evaluation", (_label, compatible, incompatible, metric) => {
    const good = evaluateRacePlan(profile, compatible);
    const bad = evaluateRacePlan(profile, incompatible);
    if (metric === "fuelRisk") expect(good.fuelRisk).toBeLessThan(bad.fuelRisk);
    else expect(good.performanceMultiplier).toBeGreaterThan(bad.performanceMultiplier);
  });

  it("makes aggression a real pace, wear, and reliability tradeoff", () => {
    const push = evaluateRacePlan(profile, plan({ aggression: "push" }));
    const conserve = evaluateRacePlan(profile, plan({ aggression: "conserve" }));
    expect(push.performanceMultiplier).toBeGreaterThan(conserve.performanceMultiplier);
    expect(push.wearMultiplier).toBeGreaterThan(conserve.wearMultiplier);
    expect(push.dnfDelta).toBeGreaterThan(conserve.dnfDelta);
  });

  it("uses the same evaluation in displayed odds calculations", () => {
    const wet = evaluateRacePlan(profile, RACE_PLAN_PRESETS.wet);
    const sprint = evaluateRacePlan(profile, RACE_PLAN_PRESETS.sprint);
    const wetOdds = calculateOdds(80, 50, 75, 1, 0, 0, 0, 0, 0, 0, false, wet);
    const sprintOdds = calculateOdds(80, 50, 75, 1, 0, 0, 0, 0, 0, 0, false, sprint);
    expect(wetOdds.dnfChance).toBeLessThan(sprintOdds.dnfChance);
  });

  it("narrows forecast uncertainty as Diagnostics improves", () => {
    const evaluation = evaluateRacePlan(profile, RACE_PLAN_PRESETS.endurance);
    const basic = buildRaceForecast(0.5, 0.2, 8, evaluation, 0);
    const advanced = buildRaceForecast(0.5, 0.2, 8, evaluation, 6);
    expect(advanced.winChance.max - advanced.winChance.min).toBeLessThan(basic.winChance.max - basic.winChance.min);
    expect(advanced.wear.max - advanced.wear.min).toBeLessThan(basic.wear.max - basic.wear.min);
  });
});
