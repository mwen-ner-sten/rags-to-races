import { describe, expect, it } from "vitest";
import { RACE_CONTROL_RACES_PER_OPPORTUNITY } from "@/config/gameplayLimits";
import { CIRCUIT_DEFINITIONS, getCircuitById } from "@/data/circuits";
import { DEFAULT_RACE_PLAN, evaluateRacePlan } from "@/data/raceStrategy";
import type { BuiltVehicle } from "../build";
import { calculateWear, simulateRace } from "../race";
import { buildRaceControlBriefing } from "../raceControl";
import { generateRaceEvents } from "../raceEvents";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import type { RaceControlCallId } from "../raceControl";

describe("Race Control briefing", () => {
  it("offers standing, Attack, and Protect with bounded opposing effects", () => {
    const circuit = getCircuitById("backyard_derby")!;
    const briefing = buildRaceControlBriefing(circuit.profile);

    expect(briefing.context).toBeTruthy();
    expect(briefing.calls.map((call) => call.id)).toEqual(["standing", "attack", "protect"]);
    expect(briefing.calls[0].effect).toEqual({ performanceMultiplier: 1, dnfDelta: 0, wearMultiplier: 1 });
    expect(briefing.calls[1].effect.performanceMultiplier).toBeGreaterThan(1);
    expect(briefing.calls[1].effect.dnfDelta).toBeGreaterThan(0);
    expect(briefing.calls[1].effect.wearMultiplier).toBeGreaterThan(1);
    expect(briefing.calls[2].effect.performanceMultiplier).toBeLessThan(1);
    expect(briefing.calls[2].effect.dnfDelta).toBeLessThan(0);
    expect(briefing.calls[2].effect.wearMultiplier).toBeLessThan(1);
    for (const call of briefing.calls) {
      expect(call.effect.performanceMultiplier).toBeGreaterThanOrEqual(0.95);
      expect(call.effect.performanceMultiplier).toBeLessThanOrEqual(1.05);
      expect(call.effect.dnfDelta).toBeGreaterThanOrEqual(-0.03);
      expect(call.effect.dnfDelta).toBeLessThanOrEqual(0.03);
      expect(call.effect.wearMultiplier).toBeGreaterThanOrEqual(0.85);
      expect(call.effect.wearMultiplier).toBeLessThanOrEqual(1.15);
    }
  });

  it("applies a selected call to simulation and records an explanation", () => {
    const circuit = getCircuitById("backyard_derby")!;
    const vehicle: BuiltVehicle = {
      id: "called-racer",
      definitionId: "push_mower",
      builtAt: 0,
      condition: 100,
      totalRaces: 0,
      parts: {},
      stats: { speed: 40, handling: 40, reliability: 40, weight: 60, performance: 40 },
    };
    const standing = evaluateRacePlan(circuit.profile, DEFAULT_RACE_PLAN);

    const outcome = simulateRace(
      vehicle, circuit, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, true,
      DEFAULT_RACE_PLAN, 1, "attack",
    );

    expect(outcome.raceControlCall).toMatchObject({ id: "attack" });
    expect(outcome.planEvaluation?.performanceMultiplier).toBeCloseTo(standing.performanceMultiplier * 1.04);
    expect(outcome.planEvaluation?.dnfDelta).toBeCloseTo(standing.dnfDelta + 0.025);
    expect(outcome.planEvaluation?.wearMultiplier).toBeCloseTo(standing.wearMultiplier * 1.12);
    expect(outcome.log.some((line) => line.includes("Race Control: Attack"))).toBe(true);
    const events = generateRaceEvents(outcome, circuit, circuit.raceDuration);
    expect(events).toContainEqual(expect.objectContaining({
      type: "race_control",
      commentary: expect.stringContaining("Attack"),
    }));
  });

  it("keeps the best seeded called-race value uplift at ten percent and long-run uplift at one percent", () => {
    const calls: RaceControlCallId[] = ["standing", "attack", "protect"];
    let worstCalledRaceUplift = Number.NEGATIVE_INFINITY;
    let attackDnfDelta = 0;
    let protectWinDelta = 0;

    for (const circuit of CIRCUIT_DEFINITIONS) {
      for (const reliability of [20, 60, 100]) {
        const vehicle: BuiltVehicle = {
          id: `calibration-${circuit.id}-${reliability}`,
          definitionId: "push_mower",
          builtAt: 0,
          condition: 100,
          totalRaces: 0,
          parts: {},
          stats: {
            speed: circuit.difficulty,
            handling: circuit.difficulty,
            reliability,
            weight: 60,
            performance: circuit.difficulty,
          },
        };
        const totals = Object.fromEntries(calls.map((call) => [call, { value: 0, wins: 0, dnfs: 0 }])) as Record<RaceControlCallId, { value: number; wins: number; dnfs: number }>;

        for (let sample = 0; sample < 800; sample++) {
          for (const call of calls) {
            const outcome = withRandomSource(
              new SeededRandomSource(`${circuit.id}-${reliability}-${sample}`),
              () => simulateRace(
                vehicle, circuit, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, false,
                DEFAULT_RACE_PLAN, 1, call,
              ),
            );
            totals[call].value += outcome.scrapsEarned / Math.max(1, circuit.rewardBase)
              + outcome.repEarned / Math.max(1, circuit.repReward);
            totals[call].wins += outcome.result === "win" ? 1 : 0;
            totals[call].dnfs += outcome.result === "dnf" ? 1 : 0;
          }
        }

        const standingValue = totals.standing.value;
        const bestCalledValue = Math.max(totals.attack.value, totals.protect.value);
        worstCalledRaceUplift = Math.max(
          worstCalledRaceUplift,
          (bestCalledValue - standingValue) / standingValue,
        );
        attackDnfDelta += totals.attack.dnfs - totals.standing.dnfs;
        protectWinDelta += totals.protect.wins - totals.standing.wins;
      }
    }

    expect(worstCalledRaceUplift).toBeLessThanOrEqual(0.10);
    expect(attackDnfDelta).toBeGreaterThan(0);
    expect(protectWinDelta).toBeLessThan(0);
  });

  it("keeps the best seeded ten-race cohort uplift near one percent including wear carryover", () => {
    const calls: RaceControlCallId[] = ["standing", "attack", "protect"];
    let standingValue = 0;
    let bestCalledValue = 0;

    for (const circuit of CIRCUIT_DEFINITIONS) {
      for (const reliability of [20, 60, 100]) {
        const totals = Object.fromEntries(calls.map((call) => [call, 0])) as Record<RaceControlCallId, number>;

        for (let sample = 0; sample < 200; sample++) {
          for (const call of calls) {
            totals[call] += withRandomSource(
              new SeededRandomSource(`cohort-${circuit.id}-${reliability}-${sample}`),
              () => {
                const basePerformance = circuit.difficulty;
                let vehicle: BuiltVehicle = {
                  id: `cohort-${call}`,
                  definitionId: "push_mower",
                  builtAt: 0,
                  condition: 100,
                  totalRaces: 0,
                  parts: {},
                  stats: {
                    speed: basePerformance,
                    handling: basePerformance,
                    reliability,
                    weight: 60,
                    performance: basePerformance,
                  },
                };
                let value = 0;
                for (let race = 0; race < RACE_CONTROL_RACES_PER_OPPORTUNITY; race++) {
                  const outcome = simulateRace(
                    vehicle, circuit, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, false,
                    DEFAULT_RACE_PLAN, 1, race === 0 ? call : "standing",
                  );
                  value += outcome.scrapsEarned / Math.max(1, circuit.rewardBase)
                    + outcome.repEarned / Math.max(1, circuit.repReward);
                  const condition = Math.max(0, vehicle.condition - calculateWear(
                    vehicle, outcome.result, 0, 0, 0, 0,
                    outcome.planEvaluation?.wearMultiplier ?? 1,
                  ));
                  const conditionMultiplier = condition < 70 ? 0.3 + (condition / 70) * 0.7 : 1;
                  vehicle = {
                    ...vehicle,
                    condition,
                    totalRaces: vehicle.totalRaces + 1,
                    stats: {
                      ...vehicle.stats,
                      speed: basePerformance * conditionMultiplier,
                      handling: basePerformance * conditionMultiplier,
                      performance: basePerformance * 0.8 * conditionMultiplier + reliability * 0.2,
                    },
                  };
                }
                return value;
              },
            );
          }
        }

        standingValue += totals.standing;
        bestCalledValue += Math.max(totals.attack, totals.protect);
      }
    }

    expect((bestCalledValue - standingValue) / standingValue).toBeLessThanOrEqual(0.01);
  });
});
