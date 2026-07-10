import { describe, expect, it } from "vitest";
import { runAllCampaignRaceSimulations } from "../campaignRaceSimulation";

describe("seeded 100-race campaign calibration", () => {
  it("keeps observed win and DNF rates inside the displayed aggregate ranges", () => {
    const results = runAllCampaignRaceSimulations("acceptance");
    for (const result of results) {
      expect(result.races).toBe(100);
      expect(result.wins + result.losses + result.dnfs).toBe(100);
      expect(result.winRate).toBeGreaterThanOrEqual(result.displayedWinRange.min);
      expect(result.winRate).toBeLessThanOrEqual(result.displayedWinRange.max);
      expect(result.dnfRate).toBeGreaterThanOrEqual(result.displayedDnfRange.min);
      expect(result.dnfRate).toBeLessThanOrEqual(result.displayedDnfRange.max);
      expect(result.finalCondition).toBeGreaterThanOrEqual(0);
      expect(result.finalCondition).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.netScrap)).toBe(true);
      expect(Number.isFinite(result.rep)).toBe(true);
    }
    expect(results[0].winRate).toBeLessThan(results[1].winRate);
    expect(results[1].winRate).toBeLessThan(results[2].winRate);
  });
});
