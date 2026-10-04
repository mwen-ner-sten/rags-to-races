import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { readyCampaign } from "@/testing/campaignReady";
import { promotionRequirements } from "@/engine/campaign";
afterEach(() => useGameStore.setState(createInitialState()));
describe("earned responsibility promotions", () => {
  for (const layer of ["team", "owner", "track"] as const) {
    it(`${layer} requires every objective, ignores spent currency, and cannot repeat`, () => {
      const ready = readyCampaign();
      const keys = layer === "team" ? ["scrapResetsThisTeamEra", "teamFeatureIds"] as const : layer === "owner" ? ["teamResetsThisOwnerEra", "ownerFeatureIds", "fleetVenueIds"] as const : ["ownerResetsThisTrackEra", "trackFeatureIds", "trackSponsorFamilies"] as const;
      for (const key of keys) {
        const blocked = { ...ready, [key]: typeof ready[key] === "number" ? (ready[key] as number) - 1 : [] };
        useGameStore.setState({ ...createInitialState(), campaign: blocked });
        useGameStore.getState()[`${layer}Reset`]();
        expect(useGameStore.getState()[`${layer}EraCount`]).toBe(0);
        expect(promotionRequirements(layer, blocked).some((r) => !r.met)).toBe(true);
      }
      useGameStore.setState({ ...createInitialState(), campaign: ready });
      useGameStore.getState()[`${layer}Reset`]();
      expect(useGameStore.getState()[`${layer}EraCount`]).toBe(1);
      const saved = useGameStore.getState();
      useGameStore.getState()[`${layer}Reset`]();
      expect(useGameStore.getState()).toEqual(saved);
    });
  }
});
