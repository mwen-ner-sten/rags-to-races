import { describe, expect, it } from "vitest";
import { canScrapReset, getScrapResetProgress, REP_PROGRESSION, REP_UNLOCK_COSTS, SCRAP_RESET_REQUIREMENTS, scrapResetRequirementText } from "../progression";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { DEALER_TIER2_REP, DEALER_TIER3_REP, DEALER_UNLOCK_REP } from "@/data/dealer";

describe("central progression ladder", () => {
  it("enforces the Scrap Reset boundary exactly", () => {
    const exact = {
      featureWins: 1,
      rivalsDefeated: SCRAP_RESET_REQUIREMENTS.rivalsDefeated,
      lifetimeRep: SCRAP_RESET_REQUIREMENTS.lifetimeRep,
    };
    expect(canScrapReset(exact)).toBe(true);
    expect(canScrapReset({ ...exact, featureWins: 0 })).toBe(false);
    expect(canScrapReset({ ...exact, rivalsDefeated: exact.rivalsDefeated - 1 })).toBe(false);
    expect(canScrapReset({ ...exact, lifetimeRep: exact.lifetimeRep - 1 })).toBe(false);
  });

  it("reads the gate from state: National Feature wins, rivals defeated, lifetime Rep", () => {
    expect(getScrapResetProgress({ lifetimeRep: 10 })).toEqual({ featureWins: 0, rivalsDefeated: 0, lifetimeRep: 10 });
    expect(getScrapResetProgress({
      eventWins: { national_circuit: { sprint: 3, heat: 1, feature: 2 }, dirt_track: { feature: 5 } },
      defeatedRivalIds: ["rival_greasy_pete", "rival_redline_rosa"],
      lifetimeRep: 2_500,
    })).toEqual({ featureWins: 2, rivalsDefeated: 2, lifetimeRep: 2_500 });
    expect(scrapResetRequirementText()).toContain("National Circuit Feature");
    expect(scrapResetRequirementText()).toContain("2,500");
  });

  it("drives locations, circuits, Dealer, and workshop gates from one contract", () => {
    // Spendable prices are the halved ladder; the Dealer stays a lifetime threshold.
    for (const location of LOCATION_DEFINITIONS) {
      expect(location.unlockCost).toBe(REP_UNLOCK_COSTS.locations[location.id as keyof typeof REP_UNLOCK_COSTS.locations]);
    }
    for (const circuit of CIRCUIT_DEFINITIONS) {
      expect(circuit.unlockRepCost).toBe(REP_UNLOCK_COSTS.circuits[circuit.id as keyof typeof REP_UNLOCK_COSTS.circuits]);
    }
    expect([DEALER_UNLOCK_REP, DEALER_TIER2_REP, DEALER_TIER3_REP]).toEqual([
      REP_PROGRESSION.dealer.unlock,
      REP_PROGRESSION.dealer.tier2,
      REP_PROGRESSION.dealer.tier3,
    ]);
    for (const [upgradeId, reputation] of Object.entries(REP_UNLOCK_COSTS.workshop)) {
      expect(UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === upgradeId)?.unlockRequirement?.repPoints).toBe(reputation);
    }
    for (const [key, threshold] of Object.entries(REP_PROGRESSION.locations)) {
      expect(REP_UNLOCK_COSTS.locations[key as keyof typeof REP_UNLOCK_COSTS.locations]).toBe(Math.ceil(threshold / 2));
    }
  });
});
