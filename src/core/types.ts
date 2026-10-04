/**
 * Core game state for the rebuilt Rags to Races.
 *
 * What survives a reset is decided by WHICH SCOPE a field lives in, never by
 * hand-written keep lists. See docs/design/era-1-and-team.md §2.
 *
 *   meta   — forever (Codex, Know-how, Habit memory, records, perks owned…)
 *   scrap  — Scrap layer: cleared by a Team Reset
 *   team   — Team layer: never cleared (top layer for now)
 *   era    — the current team; null during Era 1; cleared by a Team Reset
 *   run    — the current Season; cleared by every reset
 *   config — choices made at the last reset, fixed for the Season
 */

export type Scope = "run" | "scrap" | "era" | "config";

export type PartCategory =
  | "engine"
  | "wheel"
  | "frame"
  | "fuel"
  | "electronics"
  | "drivetrain"
  | "exhaust"
  | "body"
  | "junk";

/** 0 Scrap · 1 Rusted · 2 Worn · 3 Good · 4 Restored */
export type Condition = 0 | 1 | 2 | 3 | 4;

export type SkillId = "haul" | "wrench" | "build" | "race";
export type DisciplineId = "dirt" | "drag";
export type EventKind = "sprint" | "heat" | "feature";
export type RaceCall = "push" | "nurse";
export type TuneSetting = "balanced" | "power" | "reliable";
export type MaterialId = "metal" | "rubber" | "wiring";
export type CrewRole = "wrench" | "hauler" | "driver" | "spotter";

export interface PartInstance {
  uid: string;
  partId: string;
  condition: Condition;
  /** Where it was found, for the Hall of Fame history. */
  origin: string;
}

export interface VehicleHistory {
  races: number;
  wins: number;
  dnfs: number;
  bestFinish: number | null;
}

export interface Vehicle {
  uid: string;
  vehicleId: string;
  name: string;
  parts: Partial<Record<string, PartInstance>>;
  tune: TuneSetting;
  history: VehicleHistory;
  builtAtSeasonMs: number;
}

/** A job template key: "haul:curb", "clean", "repair", "strip", "race" … */
export type JobTemplate = string;

export type JobSpec =
  | { kind: "haul"; placeId: string; focus?: PartCategory }
  | { kind: "clean"; partUid?: string }
  | { kind: "repair"; partUid?: string }
  | { kind: "restore"; partUid?: string }
  | { kind: "strip"; partUid?: string }
  | { kind: "study"; knowhowId: string }
  | { kind: "assemble"; vehicleId: string; partUids: Record<string, string>; name: string }
  | { kind: "race"; vehicleUid: string; venueId: string; event: EventKind; call: RaceCall; call2?: "pit" | "stay" | "launch_hard" | "launch_soft" };

export type LaneId = string; // "hands" | "bench:0" | "habit:1" | "crew:<id>"

export interface ActiveJob {
  id: string;
  lane: LaneId;
  spec: JobSpec;
  /** Total duration in ms, fixed when the job started. */
  duration: number;
  remaining: number;
  /** True when this job is a Habit loop or crew habit (runs again on completion). */
  looping: boolean;
  /** For habit lanes: the template being repeated. */
  template?: JobTemplate;
}

export interface RaceResult {
  id: string;
  seasonMs: number;
  vehicleUid: string;
  venueId: string;
  event: EventKind;
  call: RaceCall;
  position: number;
  fieldSize: number;
  dnf: boolean;
  prize: number;
  rep: number;
  rival?: { id: string; beaten: boolean };
  margin: number;
  weakestSlot: string | null;
  beats: { at: number; text: string; position: number }[];
  wear: { slot: string; from: Condition; to: Condition }[];
}

export interface JournalEntry {
  id: string;
  season: number;
  seasonMs: number;
  text: string;
}

export interface HallOfFameEntry {
  season: number;
  vehicleId: string;
  name: string;
  history: VehicleHistory;
  parts: { slot: string; partId: string; condition: Condition; origin: string }[];
}

export interface MetaState {
  /** Handled-count per part id and haul-count per place id. */
  codex: { parts: Record<string, number>; places: Record<string, number> };
  /** Seasons in which each know-how id was learned/opened. */
  knowhow: Record<string, number>;
  /** Seasons in which each habit template was earned (halves its threshold). */
  habitMemory: Record<JobTemplate, number>;
  lastTopHabit: JobTemplate | null;
  /** Best season time (ms) to each venue's Feature win. */
  records: Record<string, number>;
  hallOfFame: HallOfFameEntry[];
  rivals: Record<string, { wins: number; losses: number }>;
  perks: Record<string, number>; // owned perk ranks
  perksUnlocked: string[]; // unlocked (buyable) by dares/milestones
  daresCompleted: string[];
  disciplineMastery: Record<string, number>;
  hardshipMastery: Record<string, number>;
  stateWonEver: boolean;
  journalSeen: string[];
  journal: JournalEntry[];
  seasonsPlayed: number;
  totalTeamResets: number;
  /** Deepest milestone ever reached per venue (for tune-up first-ever bonuses). */
  milestonesEver: string[];
}

export interface ScrapLayerState {
  lp: number;
  lifetimeLp: number;
  resets: number;
  tuneUpPoints: number;
  milestonesThisEra: string[];
  daresThisEra: number;
}

export interface TeamLayerState {
  tp: number;
  lifetimeTp: number;
  resets: number;
  upgrades: Record<string, number>;
}

export interface CrewMember {
  id: string; // roster id
  assignment: { type: "queue" } | { type: "habit"; template: JobTemplate } | { type: "driver" } | { type: "spotter" } | { type: "rest" };
  morale: number; // 0..100
  workedInWindowMs: number;
  windowStartMs: number;
  jobsDone: number;
}

export interface EraState {
  discipline: DisciplineId;
  teamName: string;
  colors: [string, string];
  crew: CrewMember[];
  milestones: string[]; // venue feature wins achieved in this team's life
  hardshipsCompleted: number;
  legends: string[];
  seasonIndex: number;
}

export interface RunState {
  seasonMs: number;
  cash: number;
  rep: number;
  materials: Record<MaterialId, number>;
  inventory: PartInstance[];
  vehicles: Vehicle[];
  placesOpen: string[];
  venuesOpen: string[];
  /** Per venue: which event kinds are unlocked. */
  ladder: Record<string, EventKind[]>;
  tools: Record<string, number>;
  learned: string[]; // know-how ids learned/opened this Season
  available: string[]; // know-how ids whose trigger fired (studyable)
  reps: Record<JobTemplate, number>;
  habitsKnown: JobTemplate[];
  habitSlots: (JobTemplate | null)[];
  jobs: ActiveJob[];
  queue: JobSpec[];
  idleLanes: LaneId[];
  practice: Record<string, number>; // venue → races run
  /** Season ms when each "venue:event" was last entered (events run on a schedule). */
  lastEntered: Record<string, number>;
  featureWins: Record<string, number>; // venue → season ms of first Feature win
  races: RaceResult[];
  stats: { partsSold: number; hauls: number; racesLost: Record<string, number>; firstStartDone: boolean };
  revealed: string[];
  candidates: string[]; // crew candidates this Season (team era)
  shellsBought: number;
  /** Dealer saturation per part id, decaying 1 per hour (see garage.partSellValue). */
  saleSat: Record<string, { n: number; at: number }>;
  notices: string[];
  pushOnlyRaces: boolean;
}

export interface RunConfig {
  perks: string[]; // equipped this Season
  tuneUp: Record<SkillId, number>;
  dare: string | null;
  hardships: string[];
}

export interface GameState {
  version: 1;
  seed: string;
  rng: number;
  uid: number;
  meta: MetaState;
  scrap: ScrapLayerState;
  team: TeamLayerState;
  era: EraState | null;
  run: RunState;
  config: RunConfig;
}
