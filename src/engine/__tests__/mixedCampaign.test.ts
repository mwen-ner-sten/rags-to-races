import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "@/state/store";
import { CAMPAIGN_PACING_TARGETS_HOURS } from "@/data/campaignPacing";
import { MIXED_PLAY_DEFAULTS, PURE_IDLE_DEFAULTS, runMixedCampaign } from "@/testing/mixedCampaign";

/**
 * Phase 2 pacing guard: wall-clock days to the first Scrap Reset, measured by
 * the mixed-play simulation (real store actions in bounded sessions, the
 * app's offline catch-up between them). Mixed play: four ~15 min check-ins a
 * day. Pure idle: one 5-minute check-in a day.
 *
 * Measured 2026-09-04 (docs/balance/phase2-mixed-play-2026-09-04.md): mixed
 * 3.0 days, idle 11 days. The charter's mixed target is 2-4 days. Pure idle
 * misses the design note's 5-7 day aspiration: a once-a-day player climbs
 * about one ladder rung per visit and, with tier-minimum builds, needs ~4
 * days of Feature entries at 22-30% for the two rivals and the National
 * Feature. Its guard is therefore the measured value +-20%; the balance note
 * lists the idle-only levers that would close the gap.
 */
const MIXED_WALL_DAYS_GUARD = { min: CAMPAIGN_PACING_TARGETS_HOURS.scrap.min / 24, max: CAMPAIGN_PACING_TARGETS_HOURS.scrap.max / 24 };
const IDLE_WALL_DAYS_GUARD = { min: 9, max: 13 };

afterEach(() => {
  useGameStore.setState(createInitialState());
});

describe("mixed-play campaign pacing", () => {
  it("reaches the first Scrap Reset in 2-4 wall days of mixed play", () => {
    const result = runMixedCampaign(MIXED_PLAY_DEFAULTS);
    console.info("MIXED_PLAY_CAMPAIGN", { wallDays: result.wallDays, sessions: result.sessions, handsOnMinutes: result.handsOnMinutes, manualRaces: result.manualRaces, manualScavenges: result.manualScavenges, lp: result.lpProjection, days: result.days });
    expect(result.reachedReset).toBe(true);
    expect(result.wallDays).toBeGreaterThanOrEqual(MIXED_WALL_DAYS_GUARD.min);
    expect(result.wallDays).toBeLessThanOrEqual(MIXED_WALL_DAYS_GUARD.max);
    expect(result.lpProjection).toBeGreaterThanOrEqual(5);
  });

  it("reaches the first Scrap Reset in the measured pure-idle band", () => {
    const result = runMixedCampaign(PURE_IDLE_DEFAULTS);
    console.info("PURE_IDLE_CAMPAIGN", { wallDays: result.wallDays, sessions: result.sessions, handsOnMinutes: result.handsOnMinutes, days: result.days.map((day) => `${day.day}:${day.venue}:${day.event}`) });
    expect(result.reachedReset).toBe(true);
    expect(result.wallDays).toBeGreaterThanOrEqual(IDLE_WALL_DAYS_GUARD.min);
    expect(result.wallDays).toBeLessThanOrEqual(IDLE_WALL_DAYS_GUARD.max);
  });
}, 20_000);
