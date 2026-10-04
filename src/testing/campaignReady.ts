import { initialCampaign, type CampaignProgress } from "@/engine/campaign";

/** Explicit earned history for boundary fixtures; never used by live gameplay. */
export function readyCampaign(): CampaignProgress {
  return { ...initialCampaign(1_700_000_000_000), runEarnedScrap: 8000, runRivalIds: ["rival_greasy_pete", "rival_scrap_queen"],
    scrapResetsThisTeamEra: 4, teamResetsThisOwnerEra: 3, ownerResetsThisTrackEra: 4,
    teamFeatureIds: ["world_championship"], ownerFeatureIds: ["world_championship"], trackFeatureIds: ["endurance_series"],
    fleetVenueIds: ["backyard_derby", "dirt_track"], knowledge: { team: true, owner: true },
    trackSponsorFamilies: ["grassroots", "technical", "endurance"] };
}
