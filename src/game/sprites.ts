/** Maps core ids onto the existing WebP sprite set in public/sprites. */
const PART_SPRITE: Record<string, string> = {
  wheel_kart: "wheel_basic",
  junk_misc: "misc_junk",
  junk_seat: "misc_seat",
  engine_tiller: "engine_lawn",
  engine_twin: "engine_v4",
  engine_turbo4: "engine_turbo_v6",
  engine_six: "engine_v6",
  wheel_knobby: "wheel_basic",
  wheel_dirt: "wheel_basic",
  wheel_at: "wheel_sport",
  wheel_slick: "wheel_racing",
  wheel_groove: "wheel_racing",
  frame_wagon: "frame_scrap",
  frame_tube: "frame_steel",
  frame_cage: "misc_roll_cage",
  fuel_cell: "fuel_tank_large",
  elec_ignition: "elec_racing",
  drive_auto: "drive_manual",
  drive_race: "drive_sequential",
  exhaust_glasspack: "exhaust_straight",
};

/** Vehicles whose image file has a different name. */
const VEHICLE_SPRITE: Record<string, string> = {
  street_stock: "stock_car",
};

export function partSprite(partId: string): string {
  if (partId === "beater_shell") return "/sprites/vehicles/beater_car.webp";
  return `/sprites/parts/${PART_SPRITE[partId] ?? partId}.webp`;
}

export function vehicleSprite(vehicleId: string): string {
  return `/sprites/vehicles/${VEHICLE_SPRITE[vehicleId] ?? vehicleId}.webp`;
}

const PLACE_SPRITE: Record<string, string> = {
  curb: "curbside",
  yards: "neighborhood_yards",
  junkyard: "local_junkyard",
  auction: "salvage_auction",
  long_haul: "industrial_surplus",
};

export function placeSprite(placeId: string): string {
  return `/sprites/locations/${PLACE_SPRITE[placeId] ?? placeId}.webp`;
}

const VENUE_SPRITE: Record<string, string> = {
  backyard: "backyard_derby",
  dirt: "dirt_track",
  county_fair: "regional_circuit",
  regional: "national_circuit",
  state: "continental_grand_prix",
};

export function venueSprite(venueId: string): string {
  return `/sprites/circuits/${VENUE_SPRITE[venueId] ?? venueId}.webp`;
}
