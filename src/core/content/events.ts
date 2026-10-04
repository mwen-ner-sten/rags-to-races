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

export interface VenueDef {
  id: string;
  name: string;
  blurb: string;
  /** Vehicle tiers allowed to enter. */
  tiers: [number, number];
  events: Record<EventKind, EventDef>;
  /** Rival who leads the Feature field. */
  rival: string;
  /** Legacy Points for the first Feature win this Season. */
  lp: number;
  /** Team-era Team Points for the first Feature win in a team's life. */
  tp: number;
  /** How the venue opens: "start", a Rep cost (via know-how "place:<id>"), or a Feature win elsewhere. */
  opens: { type: "start" } | { type: "knowhow"; id: string } | { type: "feature"; venueId: string };
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
    events: ladder([16, 21, 27], [5, 10, 20], [18, 45, 110], [2, 4, 8], [10, 30, 60]),
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
    events: ladder([48, 60, 72], [20, 40, 80], [70, 160, 420], [5, 8, 15], [30, 120, 360]),
    rival: "big_ron",
    lp: 12,
    tp: 5,
    opens: { type: "feature", venueId: "dirt" },
  },
  {
    id: "regional",
    name: "Regional Invitational",
    blurb: "Three counties, one grid, and the Kessler twins.",
    tiers: [3, 3],
    events: ladder([80, 88, 98], [50, 90, 160], [180, 420, 1000], [8, 12, 20], [60, 240, 720]),
    rival: "kessler",
    lp: 30,
    tp: 15,
    opens: { type: "feature", venueId: "county_fair" },
  },
  {
    id: "state",
    name: "State Invitational",
    blurb: "Real grandstands. Real scouts. Lou from the race shop is watching.",
    tiers: [3, 3],
    events: ladder([95, 104, 113], [90, 160, 300], [400, 900, 2400], [12, 18, 30], [120, 480, 1440]),
    rival: "kessler",
    lp: 70,
    tp: 40,
    opens: { type: "feature", venueId: "regional" },
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

export const PRIZE_SHARE = [1, 0.5, 0.25, 0, 0, 0] as const;

export interface RivalDef {
  id: string;
  name: string;
  line: string;
}

export const RIVALS: readonly RivalDef[] = [
  { id: "dale", name: "Dale", line: "Two doors down. Has a Snapper and an attitude." },
  { id: "marisol", name: "Marisol", line: "Her dad owns the junkyard. She owns the Dirt Track." },
  { id: "big_ron", name: "Big Ron", line: "Five-time County Fair champion. Six if you let him." },
  { id: "kessler", name: "The Kessler Twins", line: "One drives, one wrenches, both trash-talk." },
];

export const RIVAL_BY_ID: Record<string, RivalDef> = Object.fromEntries(RIVALS.map((r) => [r.id, r]));

export interface DisciplineDef {
  id: DisciplineId;
  name: string;
  blurb: string;
  weights: { power: number; handling: number; reliability: number; weight: number };
  fieldScale: number;
  wearMult: number;
  dnfMult: number;
  durationMult: number;
  /** On a DNF, extra condition steps lost by the engine. */
  engineBlowSteps: number;
  venueNames: Record<string, string>;
  secondCall: { a: { id: "pit" | "launch_hard"; name: string }; b: { id: "stay" | "launch_soft"; name: string } };
  /** Mastery: permanent, applies while racing any discipline. */
  mastery: { channel: string; perLevel: number; cap: number; text: string };
}

export const DISCIPLINES: Record<DisciplineId, DisciplineDef> = {
  dirt: {
    id: "dirt",
    name: "Dirt Oval",
    blurb: "Left turns, flying clods, cautions. Handling and reliability win.",
    weights: { power: 0.35, handling: 0.4, reliability: 0.25, weight: 0.01 },
    fieldScale: 1,
    wearMult: 1,
    dnfMult: 1,
    durationMult: 1,
    engineBlowSteps: 0,
    venueNames: {},
    secondCall: { a: { id: "pit", name: "Pit under caution" }, b: { id: "stay", name: "Stay out" } },
    mastery: { channel: "wear", perLevel: 0.06, cap: 0.4, text: "Part wear −6% per level in every discipline" },
  },
  drag: {
    id: "drag",
    name: "Drag",
    blurb: "An eighth or a quarter mile, dead straight. Power, traction, and engines that let go.",
    weights: { power: 0.6, handling: 0.2, reliability: 0.1, weight: 0.02 },
    fieldScale: 0.92,
    wearMult: 0.7,
    dnfMult: 1.6,
    durationMult: 0.4,
    engineBlowSteps: 1,
    venueNames: { backyard: "Driveway Drags", dirt: "Strip Night", county_fair: "Fair Drags", regional: "Regional Eliminator", state: "State Nationals" },
    secondCall: { a: { id: "launch_hard", name: "Launch hard" }, b: { id: "launch_soft", name: "Feather the launch" } },
    mastery: { channel: "rebuild_speed", perLevel: 0.08, cap: 0.5, text: "Engine repairs 8% faster per level in every discipline" },
  },
};

export function venueName(venueId: string, discipline: DisciplineId): string {
  return DISCIPLINES[discipline].venueNames[venueId] ?? getVenue(venueId).name;
}
