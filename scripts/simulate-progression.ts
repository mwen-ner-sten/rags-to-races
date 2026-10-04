import { mkdirSync, writeFileSync } from "node:fs";
import { createSaveEnvelope } from "../src/utils/saveLoad";
import { runMixedCampaign, MIXED_PLAY_DEFAULTS, PURE_IDLE_DEFAULTS, projectLp } from "../src/testing/mixedCampaign";
import { useGameStore, createInitialState, type GameState } from "../src/state/store";
import { LEGACY_UPGRADE_DEFINITIONS } from "../src/data/legacyUpgrades";
import { TEAM_UPGRADE_DEFINITIONS } from "../src/data/teamUpgrades";
import { canPromote } from "../src/engine/campaign";
import { canScrapReset, getScrapResetProgress } from "../src/config/progression";
import { CIRCUIT_DEFINITIONS } from "../src/data/circuits";
import { getVehicleCircuitIneligibilityReason } from "../src/engine/eligibility";
import { gearPower } from "../src/components/Locker/lockerHelpers";
import { GEAR_SLOTS } from "../src/data/lootGear";

const profile = process.argv[2] ?? "mixed";
const policy = process.argv[3] ?? "farm";
const seed = process.argv[4] ?? "progression-0";
const limit = Number(process.argv[5] ?? 3);

function prepare(s: GameState) {
  for (const upgrade of LEGACY_UPGRADE_DEFINITIONS) s.purchaseLegacyUpgrade(upgrade.id);
  for (const upgrade of TEAM_UPGRADE_DEFINITIONS) s.purchaseTeamUpgrade(upgrade.id);
  if (s.campaign.knowledge.owner) {
    s.purchaseOwnerUpgrade("owner_adv_circuits"); s.purchaseOwnerUpgrade("owner_vehicle_mastery");
    if (!s.campaign.specialty) s.chooseSpecialty("endurance");
    for (const family of ["grassroots", "technical", "endurance"] as const) s.claimSponsor(family);
  }
  for (const slot of GEAR_SLOTS) {
    const best = [...s.lootGearInventory].filter((g) => g.slot === slot).sort((a,b) => gearPower(b)-gearPower(a))[0];
    if (best) s.equipLootGear(best.id);
  }
  if (s.campaign.knowledge.team) {
    for (const assignment of s.fleetAssignments) if (assignment.status === "complete") s.collectFleetAssignment(assignment.id);
    for (const v of s.garage) {
      if (v.id === s.activeVehicleId) continue;
      const circuit = CIRCUIT_DEFINITIONS.find((c) => !s.campaign.fleetVenueIds.includes(c.id) && Object.values(s.eventWins[c.id] ?? {}).some((wins) => (wins ?? 0)>0) && !getVehicleCircuitIneligibilityReason(v,c));
      if (circuit) { s.repairVehicle(v.id); s.startFleetAssignment(v.id,circuit.id); }
    }
  }
}

useGameStore.setState({ ...createInitialState(), tutorialStep: -1, tutorialDismissed: true });
let hours = 0;
let lp = 0;
const runs: unknown[] = [];
const snapshots = new Set<string>();
function snapshot(layer: string, state: GameState) {
  if (limit < 10 || snapshots.has(layer)) return;
  snapshots.add(layer); mkdirSync("output/playtests/2026-09-04", { recursive: true });
  writeFileSync(`output/playtests/2026-09-04/earned-${layer}.json`, JSON.stringify(createSaveEnvelope(`Earned ${layer} playtest`, { ...state, lastActiveTimestamp: Date.now(), campaign: { ...state.campaign, runStartedAt: Date.now() - Math.max(0, state.lastActiveTimestamp - state.campaign.runStartedAt) } })));
}
for (let run = 0; run < limit; run++) {
  const before = useGameStore.getState();
  if (process.env.PROGRESSION_CHECKPOINT) writeFileSync(process.env.PROGRESSION_CHECKPOINT, JSON.stringify(createSaveEnvelope(`Before segment ${run + 1}`, before)));
  let goalVenue = policy === "push" || before.campaign.scrapResetsThisTeamEra >= 4 ? "world_championship" : "national_circuit";
  if (before.campaign.knowledge.owner && before.campaign.ownerResetsThisTrackEra >= 4) {
    goalVenue = !before.campaign.trackSponsorFamilies.includes("grassroots") ? "dirt_track" : !before.campaign.trackSponsorFamilies.includes("technical") ? "national_circuit" : "endurance_series";
  }
  const fleetGoal = before.campaign.knowledge.team && before.campaign.teamResetsThisOwnerEra >= 3 && before.campaign.fleetVenueIds.length < 2 && before.campaign.ownerResetsThisTrackEra < 4;
  const oldFleetVenues = before.campaign.fleetVenueIds.length;
  if (fleetGoal) goalVenue = before.campaign.fleetVenueIds.includes("backyard_derby") ? "dirt_track" : "backyard_derby";
  const result = runMixedCampaign({ ...(profile === "idle" ? PURE_IDLE_DEFAULTS : MIXED_PLAY_DEFAULTS), seed: `${seed}:${run}`,
    continueSave: true, maxDays: 60, goalVenue, prepare,
    stopCondition: (s) => {
      if (fleetGoal) return canPromote("owner",s.campaign) || s.campaign.fleetVenueIds.length > oldFleetVenues;
      if (canPromote("track",s.campaign) || canPromote("owner",s.campaign) || canPromote("team",s.campaign)) return true;
      if (goalVenue === "endurance_series" || goalVenue === "dirt_track") return s.campaign.sponsorClaims.includes(goalVenue === "dirt_track" ? "grassroots" : "endurance");
      return canScrapReset(getScrapResetProgress(s)) && (s.eventWins[goalVenue]?.feature ?? 0)>0;
    } });
  hours += result.wallHours ?? 60 * 24;
  const s = useGameStore.getState();
  if (s.campaign.knowledge.team) snapshot("team", s);
  if (s.campaign.knowledge.owner) snapshot("owner", s);
  if (canPromote("track",s.campaign)) snapshot("track-ready", s);
  const award = projectLp(s);
  const report = { run: run+1, goalVenue, reached: result.reachedReset, hours: result.wallHours, lp: award, earned: s.campaign.runEarnedScrap, campaign: s.campaign, progress: result.finalProgress };
  runs.push(report); console.log(JSON.stringify(report));
  if (!result.reachedReset) break;
  if (canPromote("track",s.campaign)) { s.trackReset(); snapshot("track", useGameStore.getState()); break; }
  if (canPromote("owner",s.campaign)) s.ownerReset();
  else if (fleetGoal) continue;
  else if (canPromote("team",s.campaign)) s.teamReset();
  else if (goalVenue !== "dirt_track" && goalVenue !== "endurance_series") { lp += award; s.prestige(); }
}
console.log("PROGRESSION_RESULT " + JSON.stringify({ profile, policy, seed, hours, lp, lpPerHour: lp/Math.max(1,hours), runs: runs.length, trackEra: useGameStore.getState().trackEraCount }));
