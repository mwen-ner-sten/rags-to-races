import { afterEach, describe, expect, it } from "vitest";
import { CAMPAIGN_PACING_TARGETS_HOURS } from "@/data/campaignPacing";
import { createInitialState, useGameStore } from "@/state/store";
import { runConnectedCampaignOracle } from "../connectedCampaignOracle";

afterEach(() => useGameStore.setState(createInitialState()));

describe("connected deterministic campaign oracle", () => {
  it("starts clean and reaches the first Scrap Reset through public actions", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "scrap",
      limits: { totalIterations: 2_000, scavengesPerVehicle: 200, cashScavenges: 120, racesPerScrapEra: 400 },
    });

    expect(ledger.initialAccounting).toEqual({
      legacyPoints: 0,
      lifetimeLegacyPoints: 0,
      legacyPointsThisTeamEra: 0,
      teamPoints: 0,
      lifetimeTeamPoints: 0,
      teamPointsThisOwnerEra: 0,
      ownerPoints: 0,
      lifetimeOwnerPoints: 0,
      ownerPointsThisTrackEra: 0,
      scrapResets: 0,
      teamResets: 0,
      ownerResets: 0,
      trackResets: 0,
    });
    expect(ledger.status).toBe("reached_stop_after");
    expect(ledger.milestones.map((milestone) => milestone.id)).toEqual(expect.arrayContaining([
      "first_vehicle",
      "first_race",
      "scrap_eligible",
      "first_scrap_reset",
    ]));
    expect(ledger.resets.scrap.count).toBe(1);
    expect(ledger.resets.scrap.awards[0]).toBeGreaterThan(0);
    expect(ledger.accountingViolations).toEqual([]);
    expect(ledger.targetComparison.scrap).toEqual({
      modeledHours: ledger.elapsed.modeledHours,
      target: CAMPAIGN_PACING_TARGETS_HOURS.scrap,
      withinTarget: false,
    });
    expect(ledger.diagnostics.iterations).toBeLessThanOrEqual(2_000);
  }, 30_000);

  it("reports success when the requested reset settles on the final allowed iteration", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "scrap",
      limits: { totalIterations: 1, scavengesPerVehicle: 200, cashScavenges: 120, racesPerScrapEra: 400 },
    });

    expect(ledger.resets.scrap.count).toBe(1);
    expect(ledger.status).toBe("reached_stop_after");
    expect(ledger.diagnostics.reason).toBeNull();
  }, 30_000);

  it("diagnoses a bounded initial vehicle sourcing stall", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "scrap",
      limits: { totalIterations: 1, scavengesPerVehicle: 1, cashScavenges: 1, racesPerScrapEra: 1 },
    });

    expect(ledger.status).toBe("stalled");
    expect(ledger.diagnostics.reason).toBe("vehicle_source_limit");
    expect(ledger.maintenance.stalls).toContainEqual(expect.objectContaining({
      reason: "vehicle_source_limit",
      vehicleId: "push_mower",
      limit: 1,
      state: expect.any(Object),
    }));
  });

  it("reconciles earned and spent currency against the final clean-start balances", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "scrap",
      limits: { totalIterations: 2_000, scavengesPerVehicle: 200, cashScavenges: 120, racesPerScrapEra: 400 },
    });

    expect(ledger.currencies.scrapBucks.earned - ledger.currencies.scrapBucks.spent)
      .toBeCloseTo(ledger.diagnostics.state.scrapBucks, 8);
    expect(ledger.currencies.legacyPoints.earned - ledger.currencies.legacyPoints.spent)
      .toBeCloseTo(ledger.finalAccounting.legacyPoints, 8);
  }, 30_000);

  it("organically reaches Team, records automation, and compares targets without tuning", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "team",
      limits: { totalIterations: 20, scavengesPerVehicle: 240, cashScavenges: 160, racesPerScrapEra: 450 },
    });

    expect(ledger.status).toBe("reached_stop_after");
    expect(ledger.resets.scrap.count).toBeGreaterThanOrEqual(4);
    expect(ledger.resets.team).toMatchObject({ count: 1 });
    expect(ledger.resets.team.awards[0]).toBeGreaterThan(0);
    expect(ledger.actions.automatic.ticks).toBeGreaterThan(0);
    expect(ledger.actions.automatic.scavenges).toBeGreaterThan(0);
    expect(ledger.elapsed.idleHours).toBeGreaterThan(0);
    expect(ledger.milestones.map((milestone) => milestone.id)).toEqual(expect.arrayContaining([
      "team_eligible",
      "first_team_reset",
    ]));
    expect(ledger.targetComparison.scrap?.withinTarget).toBe(false);
    expect(ledger.targetComparison.team?.withinTarget).toBe(true);
    expect(ledger.accountingViolations).toEqual([]);
    expect(ledger.currencies.scrapBucks.earned - ledger.currencies.scrapBucks.spent)
      .toBeCloseTo(ledger.diagnostics.state.scrapBucks, 8);
    expect(ledger.currencies.legacyPoints.earned - ledger.currencies.legacyPoints.spent)
      .toBeCloseTo(ledger.finalAccounting.legacyPoints, 8);
    expect(ledger.currencies.teamPoints.earned - ledger.currencies.teamPoints.spent)
      .toBeCloseTo(ledger.finalAccounting.teamPoints, 8);
    expect(ledger.diagnostics.iterations).toBeLessThanOrEqual(20);
  }, 60_000);

  it("reports when unattended racing stops because the active vehicle reaches zero condition", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "team",
      limits: { totalIterations: 20, scavengesPerVehicle: 240, cashScavenges: 160, racesPerScrapEra: 450 },
    });

    expect(ledger.actions.automatic.races).toBeGreaterThan(0);
    expect(ledger.maintenance.autoRaceStops).toContainEqual(expect.objectContaining({
      reason: "condition_zero",
      stoppedAfterTicks: expect.any(Number),
      lostIdleHours: expect.any(Number),
    }));
    expect(ledger.milestones.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      "auto_scavenge_unlocked",
      "auto_race_unlocked",
      "first_automatic_scavenge",
      "first_automatic_race",
    ]));
  }, 60_000);

  it("organically settles the first Owner Reset without treating cleared lower eras as invalid", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "owner",
      limits: { totalIterations: 120, scavengesPerVehicle: 240, cashScavenges: 160, racesPerScrapEra: 450 },
    });

    expect(ledger.status).toBe("reached_stop_after");
    expect(ledger.resets.owner).toEqual({ count: 1, awards: [43] });
    expect(ledger.milestones.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      "owner_eligible",
      "first_owner_reset",
    ]));
    expect(ledger.accountingViolations).toEqual([]);
    expect(ledger.finalAccounting).toEqual(expect.objectContaining({
      teamResets: 0,
      ownerResets: 1,
      ownerPoints: 43,
      lifetimeOwnerPoints: 43,
    }));
  }, 60_000);

  it("diagnoses the next responsibility gate when a bounded Track attempt reaches its iteration limit", () => {
    const ledger = runConnectedCampaignOracle({
      seed: "connected-campaign-oracle-v1",
      stopAfter: "track",
      limits: { totalIterations: 8, scavengesPerVehicle: 240, cashScavenges: 160, racesPerScrapEra: 450 },
    });

    expect(ledger.status).toBe("iteration_limit");
    expect(ledger.diagnostics.reason).toBe("total_iteration_limit");
    expect(ledger.diagnostics.nextGate).toEqual({
      layer: "owner",
      current: expect.objectContaining({ lifetimeTeamPoints: expect.any(Number), teamEras: expect.any(Number) }),
      required: { lifetimeTeamPoints: 500, teamEras: 3 },
      remaining: expect.objectContaining({ lifetimeTeamPoints: expect.any(Number), teamEras: expect.any(Number) }),
    });
  }, 60_000);
});
