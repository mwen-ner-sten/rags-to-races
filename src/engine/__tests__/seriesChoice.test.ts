import { describe, it, expect } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { completeSeries, seriesTerms, forecastSeries } from "../series";
import { DEFAULT_TRACK_CONFIG } from "@/data/trackVenue";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

describe("committed series choices", () => {
  it("changes forecasts with the actual surface and round profile", () => {
    const s = { ...createInitialState(), ...createGameplayFixture("track_reset_ready").payload.state } as GameState;
    const vehicle = s.garage[0];
    expect(forecastSeries(s, vehicle, DEFAULT_TRACK_CONFIG)).not.toEqual(forecastSeries(s, vehicle, { ...DEFAULT_TRACK_CONFIG, surface: "asphalt", cornerDensity: "high", length: "long" }));
  });
  it("low and high stakes each win a reproducible net-return scenario", () => {
    const s = { ...createInitialState(), ...createGameplayFixture("track_reset_ready").payload.state } as GameState;
    const cases: { condition: number; risk: number; net: number }[] = [];
    for (const condition of [30, 100]) for (const riskReward of [1, 5] as const) {
      const vehicle = { ...s.garage[0], condition };
      const config = { ...DEFAULT_TRACK_CONFIG, riskReward };
      const terms = seriesTerms(config, vehicle, s);
      let net = 0;
      for (let seed = 0; seed < 100; seed++) {
        const result = withRandomSource(new SeededRandomSource(`series-${seed}`), () => completeSeries({ ...s, garage: [vehicle] }, {
          id: "test", name: "test", config, sponsor: "test", status: "running", remainingTicks: 0,
          reward: 0, prize: terms.prize, fee: terms.fee, vehicleId: vehicle.id, plan: s.currentRacePlan,
        }));
        net += result.event.reward - terms.fee;
      }
      cases.push({ condition, risk: riskReward, net });
    }
    expect(cases[0].net, JSON.stringify(cases)).toBeGreaterThan(cases[1].net);
    expect(cases[3].net, JSON.stringify(cases)).toBeGreaterThan(cases[2].net);
  });
});
