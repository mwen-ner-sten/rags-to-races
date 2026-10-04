import type { GameState } from "../types";

export interface FindEntry {
  partId: string;
  weight: number;
}

export interface PlaceDef {
  id: string;
  name: string;
  blurb: string;
  /** Base trip length in ms. */
  tripMs: number;
  /** Rep to open the first time (Familiar: half; Second Nature: opens free at this Rep). 0 = open from the start. */
  rep: number;
  /** Scrap Bucks charged per trip. */
  fee: number;
  /** Fill ratio range of carry capacity. */
  fill: [number, number];
  /** Base condition weights [Scrap, Rusted, Worn, Good, Restored]. */
  condition: [number, number, number, number, number];
  finds: FindEntry[];
  /** Extra requirement beyond Rep; returns a reason when not met. */
  requires?: (state: GameState) => string | null;
  /** Habit threshold (repetitions) or null when this trip never becomes a Habit. */
  habitAt: number | null;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

export const PLACES: readonly PlaceDef[] = [
  {
    id: "curb",
    name: "Curbside",
    blurb: "Trash night on your street. Somebody's junk is your engine.",
    tripMs: 15_000,
    rep: 0,
    fee: 0,
    fill: [0.5, 1],
    condition: [30, 40, 22, 8, 0],
    finds: [
      { partId: "engine_small", weight: 14 },
      { partId: "wheel_busted", weight: 22 },
      { partId: "frame_scrap", weight: 10 },
      { partId: "fuel_gas_can", weight: 10 },
      { partId: "junk_misc", weight: 30 },
      { partId: "engine_lawn", weight: 3 },
      { partId: "wheel_basic", weight: 4 },
    ],
    habitAt: 25,
  },
  {
    id: "yards",
    name: "Neighbourhood Yards",
    blurb: "Sheds, side yards and Mr. Pruitt's 'collection'. Ask first.",
    tripMs: 2 * MIN,
    rep: 5,
    fee: 0,
    fill: [0.6, 1],
    condition: [20, 35, 30, 14, 1],
    finds: [
      { partId: "engine_lawn", weight: 16 },
      { partId: "wheel_basic", weight: 18 },
      { partId: "frame_mower", weight: 14 },
      { partId: "exhaust_rusted", weight: 8 },
      { partId: "junk_seat", weight: 12 },
      { partId: "junk_misc", weight: 18 },
      { partId: "engine_small", weight: 6 },
      { partId: "wheel_kart", weight: 2 },
      { partId: "frame_kart", weight: 1 },
    ],
    habitAt: 25,
  },
  {
    id: "junkyard",
    name: "Marisol's Junkyard",
    blurb: "Rows of wrecks and a dog named Carburetor. Bring a trailer.",
    tripMs: 10 * MIN,
    rep: 40,
    fee: 0,
    fill: [0.6, 1],
    condition: [15, 30, 33, 20, 2],
    finds: [
      { partId: "engine_v4", weight: 10 },
      { partId: "wheel_kart", weight: 12 },
      { partId: "frame_kart", weight: 10 },
      { partId: "fuel_tank_small", weight: 10 },
      { partId: "drive_chain", weight: 9 },
      { partId: "elec_basic", weight: 9 },
      { partId: "engine_lawn", weight: 8 },
      { partId: "wheel_sport", weight: 3 },
      { partId: "frame_steel", weight: 3 },
      { partId: "junk_misc", weight: 14 },
    ],
    requires: (state) => (ownsVehicle(state, "riding_mower") ? null : "Needs a Riding Mower to tow the trailer"),
    habitAt: 15,
  },
  {
    id: "auction",
    name: "Salvage Auction",
    blurb: "Saturday lots from insurance write-offs. Pay to bid, get better stuff.",
    tripMs: 1 * HOUR,
    rep: 90,
    fee: 40,
    fill: [0.7, 1],
    condition: [5, 15, 35, 38, 7],
    finds: [
      { partId: "engine_v6", weight: 10 },
      { partId: "wheel_sport", weight: 12 },
      { partId: "frame_steel", weight: 10 },
      { partId: "fuel_tank_large", weight: 9 },
      { partId: "elec_ecu", weight: 7 },
      { partId: "drive_manual", weight: 8 },
      { partId: "exhaust_straight", weight: 8 },
      { partId: "engine_v4", weight: 10 },
      { partId: "elec_basic", weight: 6 },
    ],
    habitAt: null,
  },
  {
    id: "long_haul",
    name: "The Long Haul",
    blurb: "An overnight run to the county scrapyard with the Beater's trunk empty.",
    tripMs: 8 * HOUR,
    rep: 60,
    fee: 15,
    fill: [0.8, 1],
    condition: [12, 28, 34, 23, 3],
    finds: [
      { partId: "engine_v4", weight: 12 },
      { partId: "engine_v6", weight: 6 },
      { partId: "wheel_sport", weight: 10 },
      { partId: "wheel_kart", weight: 8 },
      { partId: "frame_steel", weight: 8 },
      { partId: "fuel_tank_large", weight: 7 },
      { partId: "drive_manual", weight: 6 },
      { partId: "elec_basic", weight: 8 },
      { partId: "exhaust_straight", weight: 5 },
      { partId: "junk_misc", weight: 20 },
    ],
    requires: (state) => (ownsVehicle(state, "beater_car") || state.config.perks.includes("scavengers_map") ? null : "Needs the Beater's trunk"),
    habitAt: 5,
  },
];

function ownsVehicle(state: GameState, vehicleId: string): boolean {
  return state.run.vehicles.some((v) => v.vehicleId === vehicleId);
}

export const PLACE_BY_ID: Record<string, PlaceDef> = Object.fromEntries(PLACES.map((p) => [p.id, p]));

export function getPlace(id: string): PlaceDef {
  const place = PLACE_BY_ID[id];
  if (!place) throw new Error(`Unknown place ${id}`);
  return place;
}

/** Codex level of a place from its lifetime haul count. */
export const CODEX_LEVELS = [0, 5, 20, 60, 150] as const;

export function codexLevel(count: number): number {
  let level = 0;
  for (let i = 0; i < CODEX_LEVELS.length; i++) if (count >= CODEX_LEVELS[i]) level = i;
  return level;
}
