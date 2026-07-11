import { describe, expect, it } from "vitest";
import { canScrapReset, REP_PROGRESSION, SCRAP_RESET_REQUIREMENTS } from "../progression";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { DEALER_TIER2_REP, DEALER_TIER3_REP, DEALER_UNLOCK_REP } from "@/data/dealer";

describe("central progression ladder", () => {
  it("enforces the Scrap Reset boundary exactly", () => {
    const exact = {
      vehiclesBuilt: SCRAP_RESET_REQUIREMENTS.vehiclesBuilt,
      reputation: SCRAP_RESET_REQUIREMENTS.reputation,
      lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
    };
    expect(canScrapReset(exact)).toBe(true);
    expect(canScrapReset({ ...exact, vehiclesBuilt: exact.vehiclesBuilt - 1 })).toBe(false);
    expect(canScrapReset({ ...exact, reputation: exact.reputation - 1 })).toBe(false);
    expect(canScrapReset({ ...exact, lifetimeScrapBucks: exact.lifetimeScrapBucks - 1 })).toBe(false);
  });

  it("drives locations, circuits, Dealer, and workshop gates from one contract", () => {
    for (const location of LOCATION_DEFINITIONS) {
      expect(location.unlockCost).toBe(REP_PROGRESSION.locations[location.id as keyof typeof REP_PROGRESSION.locations]);
    }
    for (const circuit of CIRCUIT_DEFINITIONS) {
      expect(circuit.unlockRepCost).toBe(REP_PROGRESSION.circuits[circuit.id as keyof typeof REP_PROGRESSION.circuits]);
    }
    expect([DEALER_UNLOCK_REP, DEALER_TIER2_REP, DEALER_TIER3_REP]).toEqual([
      REP_PROGRESSION.dealer.unlock,
      REP_PROGRESSION.dealer.tier2,
      REP_PROGRESSION.dealer.tier3,
    ]);
    for (const [upgradeId, reputation] of Object.entries(REP_PROGRESSION.workshop)) {
      expect(UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === upgradeId)?.unlockRequirement?.repPoints).toBe(reputation);
    }
  });
});
