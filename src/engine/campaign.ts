import type { GameState } from "@/state/store";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import type { ResetLayer } from "@/data/resetContracts";

export type OperatingPolicy = "balanced" | "income" | "development";
export type RacingSpecialty = "grassroots" | "technical" | "endurance";
export const SPECIALTIES = {
  grassroots: { name: "Grassroots", description: "+20% performance at local and regional venues; −10% at international venues." },
  technical: { name: "Technical", description: "+15% performance on high-corner circuits; −5% on other circuits." },
  endurance: { name: "Endurance", description: "+15% performance on long circuits; −5% on short circuits." },
} as const;

export interface CampaignProgress {
  lifetimeTeamResets: number;
  lifetimeOwnerResets: number;
  runStartedAt: number;
  runEarnedScrap: number;
  runRivalIds: string[];
  scrapResetsThisTeamEra: number;
  teamResetsThisOwnerEra: number;
  ownerResetsThisTrackEra: number;
  teamFeatureIds: string[];
  ownerFeatureIds: string[];
  trackFeatureIds: string[];
  fleetVenueIds: string[];
  knowledge: { team: boolean; owner: boolean };
  policy: OperatingPolicy;
  specialty: RacingSpecialty | null;
  sponsorWins: Record<RacingSpecialty, number>;
  sponsorClaims: RacingSpecialty[];
  trackSponsorFamilies: RacingSpecialty[];
}

export function initialCampaign(now = Date.now()): CampaignProgress {
  return { lifetimeTeamResets: 0, lifetimeOwnerResets: 0, runStartedAt: now, runEarnedScrap: 0, runRivalIds: [], scrapResetsThisTeamEra: 0,
    teamResetsThisOwnerEra: 0, ownerResetsThisTrackEra: 0, teamFeatureIds: [], ownerFeatureIds: [],
    trackFeatureIds: [], fleetVenueIds: [], knowledge: { team: false, owner: false }, policy: "balanced",
    specialty: null, sponsorWins: { grassroots: 0, technical: 0, endurance: 0 }, sponsorClaims: [], trackSponsorFamilies: [] };
}
const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/** Record progress at the same atomic boundary as the gameplay action. */
export function advanceCampaign(before: GameState, after: GameState): CampaignProgress {
  const prior = before.campaign ?? initialCampaign();
  const features = Object.entries(after.eventWins ?? {}).filter(([, wins]) => (wins.feature ?? 0) > 0).map(([id]) => id);
  const sponsorWins = { ...prior.sponsorWins };
  if (prior.knowledge.owner) for (const circuit of CIRCUIT_DEFINITIONS) {
    const wins = Math.max(0, (after.eventWins?.[circuit.id]?.feature ?? 0) - (before.eventWins?.[circuit.id]?.feature ?? 0));
    if (circuit.tier <= 2) sponsorWins.grassroots += wins;
    if (circuit.profile.cornerDensity === "high") sponsorWins.technical += wins;
    if (circuit.id === "endurance_series") sponsorWins.endurance += wins;
  }
  return { ...prior, runEarnedScrap: prior.runEarnedScrap + Math.max(0, after.lifetimeScrapBucks - before.lifetimeScrapBucks),
    runRivalIds: union(prior.runRivalIds, after.raceHistory.filter((r) => !before.raceHistory.includes(r) && r.result === "win" && r.rivalId).map((r) => r.rivalId!)),
    teamFeatureIds: union(prior.teamFeatureIds, features), ownerFeatureIds: union(prior.ownerFeatureIds, features),
    trackFeatureIds: union(prior.trackFeatureIds, features), sponsorWins };
}

export function promotionRequirements(layer: Exclude<ResetLayer, "scrap">, c: CampaignProgress): { label: string; met: boolean }[] {
  if (layer === "team") return [
    { label: `Scrap Resets this Team era: ${c.scrapResetsThisTeamEra}/4`, met: c.scrapResetsThisTeamEra >= 4 },
    { label: "Win the World Feature this Team era", met: c.teamFeatureIds.includes("world_championship") },
  ];
  if (layer === "owner") return [
    { label: `Team resets this Owner era: ${c.teamResetsThisOwnerEra}/3`, met: c.teamResetsThisOwnerEra >= 3 },
    { label: "Win the World Feature this Owner era", met: c.ownerFeatureIds.includes("world_championship") },
    { label: `Complete fleet programs at different venues: ${c.fleetVenueIds.length}/2`, met: c.fleetVenueIds.length >= 2 },
  ];
  return [
    { label: `Owner resets this Track era: ${c.ownerResetsThisTrackEra}/4`, met: c.ownerResetsThisTrackEra >= 4 },
    { label: "Win the Endurance Feature this Track era", met: c.trackFeatureIds.includes("endurance_series") },
    { label: `Sponsor families completed: ${c.trackSponsorFamilies.length}/3`, met: c.trackSponsorFamilies.length === 3 },
  ];
}
export function canPromote(layer: Exclude<ResetLayer, "scrap">, campaign: CampaignProgress): boolean {
  return promotionRequirements(layer, campaign).every((r) => r.met);
}

export function campaignAfterReset(state: GameState, layer: ResetLayer): CampaignProgress {
  const c = state.campaign;
  const next: CampaignProgress = { ...c, lifetimeTeamResets: (c.lifetimeTeamResets ?? 0) + (layer === "team" ? 1 : 0), lifetimeOwnerResets: (c.lifetimeOwnerResets ?? 0) + (layer === "owner" ? 1 : 0), runStartedAt: Date.now(), runEarnedScrap: 0, runRivalIds: [],
    knowledge: { team: c.knowledge.team || layer !== "scrap", owner: c.knowledge.owner || layer === "owner" || layer === "track" } };
  if (layer === "scrap") next.scrapResetsThisTeamEra++;
  else { next.scrapResetsThisTeamEra = 0; next.teamFeatureIds = []; }
  if (layer === "team") next.teamResetsThisOwnerEra++;
  if (layer === "owner" || layer === "track") {
    next.teamResetsThisOwnerEra = 0; next.ownerFeatureIds = []; next.fleetVenueIds = [];
    next.specialty = null; next.sponsorWins = { grassroots: 0, technical: 0, endurance: 0 }; next.sponsorClaims = [];
  }
  if (layer === "owner") next.ownerResetsThisTrackEra++;
  if (layer === "track") { next.ownerResetsThisTrackEra = 0; next.trackFeatureIds = []; next.trackSponsorFamilies = []; }
  return next;
}
export function halveUpgradeLevels(levels: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(levels).filter(([, n]) => n >= 2).map(([id, n]) => [id, Math.floor(n / 2)]));
}

/** Applied after the reset's existing currency award and ordinary retention. */
export function resetCampaignFields(before: GameState, after: GameState, layer: ResetLayer): Partial<GameState> {
  const campaign = campaignAfterReset(before, layer);
  const workshopLevels = { ...after.workshopLevels };
  if (campaign.knowledge.team) workshopLevels.toolkit = Math.max(1, workshopLevels.toolkit ?? 0);
  if (campaign.knowledge.owner) workshopLevels.auto_repair = Math.max(1, workshopLevels.auto_repair ?? 0);
  return { campaign, workshopLevels, lifetimeTeamPoints: Math.max(before.lifetimeTeamPoints, after.lifetimeTeamPoints), lifetimeOwnerPoints: Math.max(before.lifetimeOwnerPoints, after.lifetimeOwnerPoints), lastOfflineSettlement: before.lastOfflineSettlement,
    unlockedCircuitIds: campaign.knowledge.team ? union(after.unlockedCircuitIds, ["dirt_track"]) : after.unlockedCircuitIds,
    lootGearInventory: before.lootGearInventory, equippedLootGear: before.equippedLootGear, gearModInventory: before.gearModInventory,
    projects: [], fleetAssignments: [], hostedEvents: [],
    ...(layer === "team" ? { legacyUpgradeLevels: halveUpgradeLevels(before.legacyUpgradeLevels) } : {}),
    ...(layer === "owner" ? { teamUpgradeLevels: halveUpgradeLevels(before.teamUpgradeLevels), crewSlots: Math.max(after.crewSlots, 1 + Math.floor((before.teamUpgradeLevels.team_crew_slots ?? 0) / 2)), legacyUpgradeLevels: {} } : {}),
    ...(layer === "track" ? { ownerUpgradeLevels: {}, teamUpgradeLevels: {}, legacyUpgradeLevels: {} } : {}),
  };
}

export function specialtyPerformance(specialty: RacingSpecialty | null | undefined, circuit: (typeof CIRCUIT_DEFINITIONS)[number]): number {
  if (specialty === "grassroots") return circuit.tier <= 2 ? 0.2 : circuit.tier >= 4 ? -0.1 : 0;
  if (specialty === "technical") return circuit.profile.cornerDensity === "high" ? 0.15 : -0.05;
  if (specialty === "endurance") return circuit.profile.length === "long" ? 0.15 : circuit.profile.length === "short" ? -0.05 : 0;
  return 0;
}
