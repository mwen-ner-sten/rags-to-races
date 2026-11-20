import { DARES } from "./modifiers";
import { PLACES } from "./places";
import { crewLevel } from "./team";
import type { DisciplineId, GameState } from "../types";

export type AchievementGroup = "Scavenging" | "Garage" | "Racing" | "Rivals" | "Seasons" | "Money" | "Team" | "Oddities";

export const ACHIEVEMENT_GROUPS: readonly AchievementGroup[] = ["Scavenging", "Garage", "Racing", "Rivals", "Seasons", "Money", "Team", "Oddities"];

/** Cosmetic only: achievements never grant a bonus (the bonus-channel rule in channels.ts stays untouched). */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  group: AchievementGroup;
  /** Shows as "???" until earned. */
  hidden?: boolean;
  check: (state: GameState) => boolean;
}

const stats = (s: GameState) => s.meta.stats;
const seen = (s: GameState, key: string) => s.meta.journalSeen.includes(key);

/** Championships won in a discipline, counting the current tour and every finished one. */
function championships(s: GameState, discipline: DisciplineId): number {
  const owner = s.owner;
  if (!owner) return 0;
  if (owner.records) return Object.values(owner.records[discipline] ?? {}).reduce((sum, r) => sum + (r?.titles ?? 0), 0);
  return [owner.tour, ...owner.history].filter((t) => t.discipline === discipline && t.status === "champion").length;
}

function featureWon(s: GameState, venueId: string): boolean {
  return (stats(s).featureWinsBy[venueId] ?? 0) > 0 || s.meta.records[venueId] !== undefined || s.run.featureWins[venueId] !== undefined;
}

function built(s: GameState, vehicleId: string): boolean {
  return (stats(s).vehiclesBuiltBy[vehicleId] ?? 0) > 0
    || s.run.vehicles.some((v) => v.vehicleId === vehicleId)
    || s.meta.hallOfFame.some((entry) => entry.vehicleId === vehicleId);
}

const beatRival = (s: GameState, id: string) => (s.meta.rivals[id]?.wins ?? 0) > 0;
const trips = (n: number) => (s: GameState) => stats(s).trips >= n;

const FEATURE_VENUES: readonly { venue: string; id: string; name: string; description: string }[] = [
  { venue: "backyard", id: "feature_backyard", name: "Backyard Champion", description: "Win the Backyard Derby Feature." },
  { venue: "dirt", id: "feature_dirt", name: "King of the Dirt", description: "Win a Dirt Track Feature." },
  { venue: "county_fair", id: "feature_county_fair", name: "Blue Ribbon", description: "Win a County Fair Feature." },
  { venue: "regional", id: "feature_regional", name: "Three Counties' Worth", description: "Win a Regional Invitational Feature." },
  { venue: "state", id: "feature_state", name: "State Champion", description: "Win the State Invitational Feature." },
];

const BASE: readonly AchievementDef[] = [
  // Scavenging
  { id: "first_find", name: "First Find", group: "Scavenging", description: "Bring home your first part from a trip.", check: (s) => stats(s).trips >= 1 || seen(s, "first_find") },
  { id: "trips_10", name: "Curbside Regular", group: "Scavenging", description: "Complete 10 trips.", check: trips(10) },
  { id: "trips_100", name: "Known at the Yard", group: "Scavenging", description: "Complete 100 trips.", check: trips(100) },
  { id: "trips_1000", name: "Part of the Scenery", group: "Scavenging", description: "Complete 1,000 trips.", check: trips(1000) },
  { id: "well_traveled", name: "Well Traveled", group: "Scavenging", description: "Haul from every place on the trip list.", check: (s) => PLACES.every((p) => (s.meta.codex.places[p.id] ?? 0) > 0) },
  { id: "first_sale", name: "Making a Buck", group: "Scavenging", description: "Sell a part.", check: (s) => stats(s).partsSold >= 1 },

  // Garage
  { id: "first_clean", name: "Elbow Grease", group: "Garage", description: "Clean a part.", check: (s) => stats(s).partsCleaned >= 1 || seen(s, "first_clean") },
  { id: "first_repair", name: "Shade Tree Fix", group: "Garage", description: "Repair a part.", check: (s) => stats(s).partsRepaired >= 1 },
  { id: "first_restore", name: "Better Than New", group: "Garage", description: "Restore a part.", check: (s) => stats(s).partsRestored >= 1 || seen(s, "first_restore") },
  { id: "first_strip", name: "Teardown", group: "Garage", description: "Strip a part for materials.", check: (s) => stats(s).partsStripped >= 1 },
  { id: "first_build", name: "It Lives", group: "Garage", description: "Build your first vehicle.", check: (s) => stats(s).vehiclesBuilt >= 1 || seen(s, "first_start") },
  { id: "built_riding_mower", name: "Sit-Down Job", group: "Garage", description: "Build a Riding Mower.", check: (s) => built(s, "riding_mower") },
  { id: "built_go_kart", name: "Ugly Welds", group: "Garage", description: "Build a Go-Kart.", check: (s) => built(s, "go_kart") },
  { id: "built_beater_car", name: "Four Doors", group: "Garage", description: "Build a Beater.", check: (s) => built(s, "beater_car") },
  { id: "built_street_stock", name: "Number on the Roof", group: "Garage", description: "Build a Street Stock.", check: (s) => built(s, "street_stock") },

  // Racing
  { id: "first_race", name: "On the Grid", group: "Racing", description: "Enter your first race.", check: (s) => stats(s).racesEntered >= 1 || seen(s, "first_race") },
  { id: "first_win", name: "Popsicle Trophy", group: "Racing", description: "Win a race.", check: (s) => stats(s).raceWins >= 1 || seen(s, "first_win") },
  { id: "podiums_10", name: "Regular on the Podium", group: "Racing", description: "Finish in the top three 10 times.", check: (s) => stats(s).podiums >= 10 },
  ...FEATURE_VENUES.map(({ venue, ...rest }): AchievementDef => ({ ...rest, group: "Racing", check: (s) => featureWon(s, venue) })),
  { id: "record_broken", name: "Record Breaker", group: "Racing", description: "Beat your own best Feature time at a venue.", check: (s) => stats(s).recordsBroken >= 1 },

  // Rivals
  { id: "beat_dale", name: "Stuck Throttle", group: "Rivals", description: "Beat Dale in a Feature.", check: (s) => beatRival(s, "dale") },
  { id: "beat_marisol", name: "Home Turf", group: "Rivals", description: "Beat Marisol in a Feature.", check: (s) => beatRival(s, "marisol") },
  { id: "beat_big_ron", name: "Long Handshake", group: "Rivals", description: "Beat Big Ron in a Feature.", check: (s) => beatRival(s, "big_ron") },
  { id: "beat_kessler", name: "Seeing Double", group: "Rivals", description: "Beat the Kessler Twins in a Feature.", check: (s) => beatRival(s, "kessler") },

  // Seasons
  { id: "first_scrap_reset", name: "Fresh Start", group: "Seasons", description: "Do your first Scrap Reset.", check: (s) => stats(s).scrapResets >= 1 || s.scrap.resets >= 1 },
  { id: "seasons_5", name: "Seasoned", group: "Seasons", description: "Play 5 Seasons.", check: (s) => s.meta.seasonsPlayed >= 5 },
  { id: "seasons_25", name: "Lifer", group: "Seasons", description: "Play 25 Seasons.", check: (s) => s.meta.seasonsPlayed >= 25 },
  { id: "all_dares", name: "Daredevil", group: "Seasons", description: "Complete all 8 Dares.", check: (s) => DARES.every((d) => s.meta.daresCompleted.includes(d.id)) },

  // Money
  { id: "earned_500", name: "Pocket Money", group: "Money", description: "Earn 500 Scrap Bucks in your career.", check: (s) => stats(s).cashEarned >= 500 },
  { id: "earned_10k", name: "Real Money", group: "Money", description: "Earn 10,000 Scrap Bucks in your career.", check: (s) => stats(s).cashEarned >= 10_000 },
  { id: "earned_100k", name: "Six Figures of Scrap", group: "Money", description: "Earn 100,000 Scrap Bucks in your career.", check: (s) => stats(s).cashEarned >= 100_000 },

  // Team
  { id: "founded_team", name: "Paint on the Door", group: "Team", description: "Found a team.", check: (s) => s.meta.totalTeamResets >= 1 },
  { id: "crew_legend", name: "Living Legend", group: "Team", description: "Take a crew member to Legend level.", check: (s) => !!s.era && (s.era.legends.length > 0 || s.era.crew.some((m) => crewLevel(m.jobsDone) >= 5)) },
  { id: "owner_title", name: "Owner's Trophy", group: "Team", description: "Win a championship as an Owner.", check: (s) => (s.owner?.titles ?? 0) >= 1 },
  { id: "champion_dirt", name: "Dirt Oval Champion", group: "Team", description: "Win a Dirt Oval championship.", check: (s) => championships(s, "dirt") > 0 },
  { id: "champion_drag", name: "Drag Champion", group: "Team", description: "Win a Drag championship.", check: (s) => championships(s, "drag") > 0 },
  { id: "champion_rally", name: "Stage Rally Champion", group: "Team", description: "Win a Stage Rally championship.", check: (s) => championships(s, "rally") > 0 },

  // Oddities
  { id: "scrap_heap_hero", name: "Scrap Heap Hero", group: "Oddities", hidden: true, description: "Win a race with a part still in Scrap condition.", check: (s) => stats(s).winsOnScrapPart >= 1 },
  { id: "dnf_three", name: "Push It Home", group: "Oddities", hidden: true, description: "Fail to finish three races in a row.", check: (s) => stats(s).bestDnfStreak >= 3 },
  { id: "hot_streak", name: "Hot Streak", group: "Oddities", hidden: true, description: "Win five races in a row.", check: (s) => stats(s).bestWinStreak >= 5 },
];

const completionist: AchievementDef = {
  id: "completionist", name: "Completionist", group: "Oddities", hidden: true, description: "Earn every other achievement.",
  check: (s) => BASE.every((a) => s.meta.achievements[a.id] !== undefined),
};

export const ACHIEVEMENTS: readonly AchievementDef[] = [...BASE, completionist];
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
