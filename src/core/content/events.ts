import type { DisciplineId, EventKind } from "../types";

export interface EventDef {
  /** Score at which the field's middle runner sits. Opponents spread around it. */
  field: number;
  entry: number;
  prize: number;
  rep: number;
  /** Race job length in ms (scaled by discipline). */
  durationMs: number;
  dnfBase: number;
  /** Events run on a schedule: the next one starts this long after the last. */
  everyMs: number;
}

/** How much a venue rewards each stat. 1 is neutral; the three average out near 1. */
export interface VenueDemand {
  power: number;
  handling: number;
  reliability: number;
}

export interface VenueDef {
  id: string;
  name: string;
  blurb: string;
  /** Vehicle tiers allowed to enter. */
  tiers: [number, number];
  events: Record<EventKind, EventDef>;
  /** What the track asks of a car (oval racing only; a drag strip is a drag strip). */
  demand: VenueDemand;
  /** One line telling the player what wins here. */
  character: string;
  /** Rival who leads the Feature field. */
  rival: string;
  /** Legacy Points for the first Feature win this Season. */
  lp: number;
  /** Team-era Team Points for the first Feature win in a team's life. */
  tp: number;
  /**
   * How the venue opens: "start", a Rep cost (via know-how "place:<id>"), or a Feature win elsewhere.
   * `invitation` means that Feature must also have been won in an earlier Season: the invite goes
   * out to last Season's winners.
   */
  opens: { type: "start" } | { type: "knowhow"; id: string } | { type: "feature"; venueId: string; invitation?: boolean };
}

const MIN = 60_000;

function ladder(field: [number, number, number], entry: [number, number, number], prize: [number, number, number], rep: [number, number, number], every: [number, number, number]): Record<EventKind, EventDef> {
  return {
    sprint: { field: field[0], entry: entry[0], prize: prize[0], rep: rep[0], durationMs: 1 * MIN, dnfBase: 0.02, everyMs: every[0] * MIN },
    heat: { field: field[1], entry: entry[1], prize: prize[1], rep: rep[1], durationMs: 3 * MIN, dnfBase: 0.03, everyMs: every[1] * MIN },
    feature: { field: field[2], entry: entry[2], prize: prize[2], rep: rep[2], durationMs: 8 * MIN, dnfBase: 0.05, everyMs: every[2] * MIN },
  };
}

export const VENUES: readonly VenueDef[] = [
  {
    id: "backyard",
    name: "Backyard Derby",
    blurb: "A lap around the Hendersons' yard. Mind the birdbath.",
    tiers: [0, 1],
    events: ladder([6, 8, 9.5], [0, 2, 5], [4, 10, 25], [1, 2, 4], [2, 5, 15]),
    demand: { power: 0.8, handling: 1.3, reliability: 0.9 },
    character: "Tight and twisty. Handling matters most; power has nowhere to go.",
    rival: "dale",
    lp: 2,
    tp: 0,
    opens: { type: "start" },
  },
  {
    id: "dirt",
    name: "Dirt Track",
    blurb: "A quarter-mile oval behind the feed store. Friday nights.",
    tiers: [1, 2],
    events: ladder([16, 21, 27], [5, 10, 20], [18, 45, 110], [2, 4, 8], [10, 45, 180]),
    demand: { power: 0.85, handling: 1.05, reliability: 1.25 },
    character: "Rough and rutted. Reliability matters most: it shakes weak parts to bits.",
    rival: "marisol",
    lp: 5,
    tp: 0,
    opens: { type: "knowhow", id: "place:dirt" },
  },
  {
    id: "county_fair",
    name: "County Fair",
    blurb: "Grandstands, funnel cake and Big Ron's five trophies.",
    tiers: [2, 3],
    events: ladder([48, 60, 72], [20, 40, 80], [70, 160, 420], [5, 8, 15], [30, 180, 720]),
    demand: { power: 1.3, handling: 0.85, reliability: 0.85 },
    character: "A long half-mile with two drag-strip straights. Power matters most.",
    rival: "big_ron",
    lp: 12,
    tp: 5,
    opens: { type: "feature", venueId: "dirt" },
  },
  {
    id: "regional",
    name: "Regional Invitational",
    blurb: "Three counties, one grid, and the Kessler twins.",
    tiers: [3, 4],
    events: ladder([88, 98, 112], [50, 90, 160], [180, 420, 1000], [8, 12, 20], [60, 240, 720]),
    demand: { power: 1.0, handling: 1.3, reliability: 0.75 },
    character: "A flat, technical paved oval. Handling matters most.",
    rival: "kessler",
    lp: 30,
    tp: 15,
    opens: { type: "feature", venueId: "county_fair" },
  },
  {
    id: "state",
    name: "State Invitational",
    blurb: "Real grandstands. Real scouts. Invitation only: they ask back the drivers who won a Regional before.",
    tiers: [3, 4],
    events: ladder([120, 136, 152], [90, 160, 300], [400, 900, 2400], [12, 18, 30], [120, 480, 1440]),
    demand: { power: 1.15, handling: 0.9, reliability: 1.1 },
    character: "Fast and long. Power gets you to the front; reliability keeps you there.",
    rival: "kessler",
    lp: 70,
    tp: 40,
    opens: { type: "feature", venueId: "regional", invitation: true },
  },
];

export const VENUE_BY_ID: Record<string, VenueDef> = Object.fromEntries(VENUES.map((v) => [v.id, v]));

export function getVenue(id: string): VenueDef {
  const venue = VENUE_BY_ID[id];
  if (!venue) throw new Error(`Unknown venue ${id}`);
  return venue;
}

export const EVENT_KINDS: readonly EventKind[] = ["sprint", "heat", "feature"];

/** Opponent scores relative to the event field, strongest (the rival in Features) first. */
export const OPPONENT_SPREAD = [1.12, 1.04, 0.97, 0.9, 0.82] as const;

/** Drag eliminations: the car in the other lane each round, relative to the event field. The last one is the rival in a Feature. */
export const BRACKET_SPREAD: Record<EventKind, readonly number[]> = {
  sprint: [1.0],
  heat: [0.94, 1.04],
  feature: [0.92, 1.02, 1.1],
};

export const PRIZE_SHARE = [1, 0.5, 0.25, 0, 0, 0] as const;

export interface RivalDef {
  id: string;
  name: string;
  line: string;
  /** How they race, told to the player so they can build and call against it. */
  style: string;
  /** Score relative to the event field (the plain front-runner is 1.12). */
  pace: number;
  /** Multiplier on race-to-race variation: below 1 is metronomic, above 1 is wild. */
  variation: number;
  /** Chance their car quits before the flag. */
  breakdown: number;
  /** Pace multiplier when you make a Nurse call. */
  vsNurse?: number;
  /** A second car that runs this fast relative to the field (the plain second runner is 1.04). */
  wingman?: number;
}

export const RIVALS: readonly RivalDef[] = [
  {
    id: "dale",
    name: "Dale",
    line: "Two doors down. Has a Snapper and an attitude.",
    style: "Fastest thing in the yard, when it runs. His Snapper quits about one race in five, so keep finishing and he'll hand you one.",
    pace: 1.16,
    variation: 1.3,
    breakdown: 0.2,
  },
  {
    id: "marisol",
    name: "Marisol",
    line: "Her dad owns the junkyard. She owns the Dirt Track.",
    style: "Never breaks, never makes a mistake, runs the same lap all night. You won't luck into this one: bring a better machine.",
    pace: 1.1,
    variation: 0.4,
    breakdown: 0,
  },
  {
    id: "big_ron",
    name: "Big Ron",
    line: "Five-time County Fair champion. Six if you let him.",
    style: "Leans on anybody who lifts. Push and he races you clean; Nurse it and he's all over you.",
    pace: 1.11,
    variation: 1,
    breakdown: 0.03,
    vsNurse: 1.06,
  },
  {
    id: "kessler",
    name: "The Kessler Twins",
    line: "One drives, one wrenches, both trash-talk.",
    style: "Two cars working together: one to beat and one in the way. You have to be clearly quicker than both.",
    pace: 1.12,
    variation: 0.8,
    breakdown: 0.02,
    wingman: 1.09,
  },
];

export const RIVAL_BY_ID: Record<string, RivalDef> = Object.fromEntries(RIVALS.map((r) => [r.id, r]));

export interface DisciplineDef {
  id: DisciplineId;
  name: string;
  blurb: string;
  /** "oval": a field of six over laps. "bracket": head-to-head elimination rounds. */
  format: "oval" | "bracket";
  /** `traction` is the grip of the drive tyres alone (Drag has no use for cornering). */
  weights: { power: number; handling: number; reliability: number; weight: number; traction: number };
  fieldScale: number;
  wearMult: number;
  /** Extra wear on tyres. */
  wheelWearMult: number;
  dnfMult: number;
  durationMult: number;
  /** On a DNF, extra condition steps lost by the engine. */
  engineBlowSteps: number;
  /** Chance of a caution flag per event (ovals in the Team era). */
  cautionChance: Record<EventKind, number>;
  venueNames: Record<string, string>;
  /** What the rules change, in plain words, for the Founding screen. */
  rules: readonly string[];
  secondCall: { a: { id: "pit" | "launch_hard"; name: string; text: string }; b: { id: "stay" | "launch_soft"; name: string; text: string } };
  /** Mastery: permanent, applies while racing any discipline. */
  mastery: { channel: string; perLevel: number; cap: number; text: string };
}

/** What the driver's second call does. One table, read by the race engine and shown by the UI. */
export const CALL2 = {
  /** Dirt Oval, only if the yellow flag comes out. */
  pit: { score: 0.985, wear: 0.6, wheelWear: 0 },
  stay: { score: 1.035, wear: 1, wheelWear: 1.8 },
  /** Drag, every round. A hard launch either hooks or spins. */
  launch_hard: { hook: 1.07, spin: 0.9, spinChance: 0.22, dnf: 1.4 },
  launch_soft: { score: 0.98, dnf: 0.7 },
} as const;

export const DISCIPLINES: Record<DisciplineId, DisciplineDef> = {
  dirt: {
    id: "dirt",
    name: "Dirt Oval",
    blurb: "Left turns, flying clods, cautions. Handling and reliability win.",
    format: "oval",
    weights: { power: 0.35, handling: 0.4, reliability: 0.25, weight: 0.01, traction: 0 },
    fieldScale: 1,
    wearMult: 1,
    wheelWearMult: 1.6,
    dnfMult: 1,
    durationMult: 1,
    engineBlowSteps: 0,
    cautionChance: { sprint: 0, heat: 0.35, feature: 0.6 },
    venueNames: {},
    rules: [
      "A field of six over laps, at five tracks that each reward a different build.",
      "Tyres wear faster than anything else.",
      "Heats and Features can go yellow. Your driver decides beforehand: pit for fresh tyres, or stay out for track position.",
    ],
    secondCall: {
      a: { id: "pit", name: "Pit under caution", text: "If the yellow comes out: fresh tyres and far less wear, but you restart a little further back." },
      b: { id: "stay", name: "Stay out", text: "If the yellow comes out: you gain track position, and your tyres pay for it." },
    },
    mastery: { channel: "wear", perLevel: 0.06, cap: 0.4, text: "Part wear −6% per level in every discipline" },
  },
  drag: {
    id: "drag",
    name: "Drag",
    blurb: "Two lanes, dead straight, loser goes home. Power, traction, and engines that let go.",
    format: "bracket",
    weights: { power: 0.6, handling: 0, reliability: 0.08, weight: 0.03, traction: 0.9 },
    fieldScale: 1,
    wearMult: 0.7,
    wheelWearMult: 1,
    dnfMult: 1.6,
    durationMult: 0.4,
    engineBlowSteps: 1,
    cautionChance: { sprint: 0, heat: 0, feature: 0 },
    venueNames: { backyard: "Driveway Drags", dirt: "Strip Night", county_fair: "Fair Drags", regional: "Regional Eliminator", state: "State Nationals" },
    rules: [
      "Head-to-head eliminations: one round in a Sprint, two in a Heat, three in a Feature. Lose a round and you're out.",
      "Cornering doesn't count. Power, the grip of your tyres and weight do.",
      "Engines let go: a DNF costs the engine an extra condition step.",
      "Your driver picks the launch: leave hard and risk spinning the tyres, or feather it.",
    ],
    secondCall: {
      a: { id: "launch_hard", name: "Launch hard", text: "Each round: usually a big jump off the line, sometimes wheelspin that costs you the round. Harder on the engine." },
      b: { id: "launch_soft", name: "Feather the launch", text: "Each round: a safe, slightly slow start. Easier on the engine." },
    },
    mastery: { channel: "rebuild_speed", perLevel: 0.08, cap: 0.5, text: "Engine repairs 8% faster per level in every discipline" },
  },
};

export function venueName(venueId: string, discipline: DisciplineId): string {
  return DISCIPLINES[discipline].venueNames[venueId] ?? getVenue(venueId).name;
}
