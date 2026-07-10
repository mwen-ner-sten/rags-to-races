import { runAllCampaignRaceSimulations } from "../src/testing/campaignRaceSimulation";

console.log(JSON.stringify(runAllCampaignRaceSimulations(process.argv[2] ?? "full-campaign-2026"), null, 2));
