import type { CrewRole, JobSpec } from "../types";

type JobKind = JobSpec["kind"];

export interface CrewDef {
  id: string;
  name: string;
  role: CrewRole;
  strength: string;
  quirk: string;
  /** Speed multiplier by job kind (missing = 1). */
  speed: Partial<Record<JobKind, number>>;
  /** Job kinds this person refuses. */
  refuses: JobKind[];
  /** Extra carry on trips they run. */
  carry?: number;
  /** Trips at or above this length run faster / below run slower (Vic). */
  longTrip?: { thresholdMs: number; longMult: number; shortMult: number };
  refusesPlace?: string;
  driverPerf?: number;
  dnfMult?: number;
  pushDnfMult?: number;
  nurseScoreMult?: number;
  moraleDrainMult?: number;
  noExperience?: boolean;
  staminaHours?: number;
}

export const CREW: readonly CrewDef[] = [
  { id: "gus", name: "Gus", role: "wrench", strength: "Retired mechanic. Bench jobs +30%.", quirk: "Won't go on trips.", speed: { clean: 1.3, repair: 1.3, restore: 1.3, strip: 1.3, study: 1.3, assemble: 1.3 }, refuses: ["haul"] },
  { id: "tina", name: "Tina", role: "hauler", strength: "Carries 3 more parts on every trip she runs.", quirk: "Burns out twice as fast.", speed: {}, refuses: [], carry: 3, moraleDrainMult: 2 },
  { id: "deshawn", name: "DeShawn", role: "driver", strength: "As driver: +6% performance.", quirk: "Pushes too hard: Push calls DNF 20% more.", speed: {}, refuses: [], driverPerf: 0.06, pushDnfMult: 1.2 },
  { id: "pearl", name: "Pearl", role: "spotter", strength: "As spotter: DNF chance −35%.", quirk: "Slow on the bench (−30%).", speed: { clean: 0.7, repair: 0.7, restore: 0.7, strip: 0.7 }, refuses: [], dnfMult: 0.65 },
  { id: "benny", name: "Benny", role: "hauler", strength: "Trips 25% faster.", quirk: "Won't set foot in the Salvage Auction.", speed: { haul: 1.25 }, refuses: [], refusesPlace: "auction" },
  { id: "rosa", name: "Rosa", role: "wrench", strength: "Repairs and restores 40% faster.", quirk: "Won't strip parts. 'That's a perfectly good alternator.'", speed: { repair: 1.4, restore: 1.4 }, refuses: ["strip"] },
  { id: "earl", name: "Earl", role: "wrench", strength: "Cleans and strips twice as fast.", quirk: "Never gets any better: no experience.", speed: { clean: 2, strip: 2 }, refuses: [], noExperience: true },
  { id: "lou_jr", name: "Lou Jr.", role: "driver", strength: "As driver: +4% performance.", quirk: "Nervous: Nurse calls lose another 3%.", speed: {}, refuses: [], driverPerf: 0.04, nurseScoreMult: 0.97 },
  { id: "kim", name: "Kim", role: "spotter", strength: "As spotter: DNF chance −25%.", quirk: "Needs rest: works 6-hour stretches, not 8.", speed: {}, refuses: [], dnfMult: 0.75, staminaHours: 6 },
  { id: "vic", name: "Vic", role: "hauler", strength: "Trips of an hour or more run 35% faster.", quirk: "Short trips run 20% slower.", speed: {}, refuses: [], longTrip: { thresholdMs: 3_600_000, longMult: 1.35, shortMult: 0.8 } },
];

export const CREW_BY_ID: Record<string, CrewDef> = Object.fromEntries(CREW.map((c) => [c.id, c]));

/** Jobs needed to reach each experience level (1–5). Level 5 is a Legend. */
export const CREW_LEVELS = [0, 20, 60, 150, 400] as const;

export function crewLevel(jobsDone: number): number {
  let level = 1;
  for (let i = 0; i < CREW_LEVELS.length; i++) if (jobsDone >= CREW_LEVELS[i]) level = i + 1;
  return level;
}

export interface TeamUpgradeDef {
  id: string;
  name: string;
  text: string;
  cost: number[];
}

export const TEAM_UPGRADES: readonly TeamUpgradeDef[] = [
  { id: "second_bay", name: "Second Bay", text: "+1 bench.", cost: [20] },
  { id: "parts_room", name: "Parts Room", text: "+12 storage.", cost: [15] },
  { id: "tow_rig", name: "Tow Rig", text: "+5 carry on every trip.", cost: [15] },
  { id: "crew_quarters", name: "Crew Quarters", text: "+1 crew member.", cost: [25, 50, 90] },
  { id: "dyno", name: "Dyno", text: "See exact win and DNF odds before every race.", cost: [20] },
  { id: "sponsor_board", name: "Sponsor Board", text: "Race prizes +15% per rank.", cost: [20, 40, 80] },
  { id: "scouting_network", name: "Scouting Network", text: "Places reach Second Nature after 1 Season instead of 3.", cost: [30] },
  { id: "legacy_ledger", name: "Legacy Ledger", text: "+1 perk slot per rank.", cost: [40, 100] },
  { id: "old_hands", name: "Old Hands", text: "Keep one crew member through a Team Reset.", cost: [35] },
];

export const TEAM_UPGRADE_BY_ID: Record<string, TeamUpgradeDef> = Object.fromEntries(TEAM_UPGRADES.map((u) => [u.id, u]));

/** Base crew capacity in a team era. */
export const BASE_CREW_CAP = 2;
