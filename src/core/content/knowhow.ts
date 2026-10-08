import type { GameState } from "../types";
import { PART_BY_ID } from "./parts";

/**
 * Know-how: techniques, vehicle blueprints and places.
 *
 * Learning      — never done: full study job (or full Rep for places).
 * Familiar      — done in a previous Season: 25% study time / half Rep.
 * Second Nature — done in 3 Seasons: unlocks automatically when its trigger fires.
 */
export interface KnowhowDef {
  id: string; // "tech:welding" | "blueprint:go_kart" | "place:junkyard"
  name: string;
  kind: "technique" | "blueprint" | "place";
  blurb: string;
  /** Study length in ms at the Learning tier (0 for places; they cost Rep instead). */
  studyMs: number;
  /** When the know-how becomes available (a reason it matters right now). */
  trigger: (state: GameState) => boolean;
  /** Short hint shown while the trigger has not fired. */
  hint: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

const partCategoryOf = (partId: string) => PART_BY_ID[partId]?.category ?? "junk";

const hasPartAtCondition = (state: GameState, category: string, condition: number) =>
  state.run.inventory.some((p) => partCategoryOf(p.partId) === category && p.condition === condition);

const owns = (state: GameState, vehicleId: string) => state.run.vehicles.some((v) => v.vehicleId === vehicleId);
const featureWon = (state: GameState, venueId: string) => state.run.featureWins[venueId] !== undefined;

export const KNOWHOW: readonly KnowhowDef[] = [
  { id: "tech:patching", name: "Patching", kind: "technique", blurb: "Plugs, patches and hose clamps. Repairs wheels and fuel parts.", studyMs: 20 * MIN, trigger: (s) => hasPartAtCondition(s, "wheel", 2) || hasPartAtCondition(s, "fuel", 2), hint: "Find a worn wheel or tank" },
  { id: "tech:rebuilding", name: "Rebuilding", kind: "technique", blurb: "Gaskets, rings and patience. Repairs engines and drivetrains.", studyMs: 45 * MIN, trigger: (s) => hasPartAtCondition(s, "engine", 2), hint: "Find a worn engine" },
  { id: "tech:haggling", name: "Haggling", kind: "technique", blurb: "Sell parts for 15% more.", studyMs: 1 * HOUR, trigger: (s) => s.run.stats.partsSold >= 20, hint: "Sell 20 parts" },
  { id: "tech:sorting", name: "Sorting", kind: "technique", blurb: "Choose what happens to finds when the driveway overflows.", studyMs: 30 * MIN, trigger: (s) => (s.run.stats.drivewayOverflows ?? 0) > 0, hint: "Let the driveway overflow" },
  { id: "tech:scouting", name: "Scouting", kind: "technique", blurb: "Pick a part category to look for on each trip.", studyMs: 45 * MIN, trigger: (s) => s.run.stats.hauls >= 30, hint: "Make 30 trips" },
  { id: "tech:welding", name: "Welding", kind: "technique", blurb: "Repairs frames and exhausts. Kart chassis need it.", studyMs: 4 * HOUR, trigger: (s) => (s.run.tools.welder ?? 0) > 0, hint: "Buy a welder" },
  { id: "tech:tuning", name: "Tuning", kind: "technique", blurb: "Set a build for power or reliability, and restore parts past Good.", studyMs: 6 * HOUR, trigger: (s) => s.run.races.some((r) => r.position === 1 && !r.dnf), hint: "Win a race" },
  { id: "tech:wiring", name: "Wiring", kind: "technique", blurb: "Repairs harnesses and ECUs.", studyMs: 7 * HOUR, trigger: (s) => s.run.inventory.some((p) => partCategoryOf(p.partId) === "electronics"), hint: "Find any electronics" },
  { id: "tech:bodywork", name: "Bodywork", kind: "technique", blurb: "Turns a rotten shell into a car.", studyMs: 8 * HOUR, trigger: (s) => s.run.inventory.some((p) => p.partId === "beater_shell") || s.run.vehicles.some((v) => v.vehicleId === "beater_car"), hint: "Buy a sedan shell" },

  { id: "blueprint:riding_mower", name: "Riding Mower plans", kind: "blueprint", blurb: "Sit-down power. Tows a trailer.", studyMs: 2 * HOUR, trigger: (s) => featureWon(s, "backyard"), hint: "Win the Backyard Feature" },
  { id: "blueprint:go_kart", name: "Go-Kart plans", kind: "blueprint", blurb: "A welded kart chassis and a real engine.", studyMs: 6 * HOUR, trigger: (s) => s.run.venuesOpen.includes("dirt") && s.run.learned.includes("tech:welding"), hint: "Open the Dirt Track and learn Welding" },
  { id: "blueprint:beater_car", name: "Beater plans", kind: "blueprint", blurb: "A whole car. The longest project of the Season.", studyMs: 8 * HOUR, trigger: (s) => (s.run.tools.engine_hoist ?? 0) > 0 && owns(s, "go_kart"), hint: "Own a Go-Kart and an engine hoist" },

  { id: "place:yards", name: "Neighbourhood Yards", kind: "place", blurb: "Ask the neighbours if you can look around.", studyMs: 0, trigger: () => true, hint: "" },
  { id: "place:junkyard", name: "Marisol's Junkyard", kind: "place", blurb: "Membership card and a promise not to pet the dog.", studyMs: 0, trigger: (s) => owns(s, "riding_mower"), hint: "Own a Riding Mower" },
  { id: "place:auction", name: "Salvage Auction", kind: "place", blurb: "A bidder number with your name on it.", studyMs: 0, trigger: (s) => s.run.venuesOpen.includes("dirt"), hint: "Open the Dirt Track" },
  { id: "place:long_haul", name: "The Long Haul", kind: "place", blurb: "The county yard lets you in if you can carry it out.", studyMs: 0, trigger: (s) => owns(s, "beater_car") || s.config.perks.includes("scavengers_map"), hint: "Finish the Beater" },
  { id: "place:dirt", name: "Dirt Track entry", kind: "place", blurb: "Your name on the sign-up sheet at the Dirt Track.", studyMs: 0, trigger: (s) => owns(s, "riding_mower"), hint: "Own a Riding Mower" },
];

export const KNOWHOW_BY_ID: Record<string, KnowhowDef> = Object.fromEntries(KNOWHOW.map((k) => [k.id, k]));

export function getKnowhow(id: string): KnowhowDef {
  const def = KNOWHOW_BY_ID[id];
  if (!def) throw new Error(`Unknown know-how ${id}`);
  return def;
}

/** Rep cost to open places and the Dirt Track. */
export const PLACE_REP: Record<string, number> = {
  "place:yards": 5,
  "place:junkyard": 40,
  "place:auction": 90,
  "place:long_haul": 60,
  "place:dirt": 20,
};
