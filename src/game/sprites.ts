/** Maps core ids onto the existing WebP sprite set in public/sprites. */
const GARAGE_ART = new Set([
  "wheel_river", "engine_quarry",
  "wheel_at", "wheel_dirt", "wheel_groove", "wheel_kart", "wheel_knobby", "wheel_slick",
  "engine_six", "engine_tiller", "engine_turbo4", "engine_twin",
  "drive_auto", "drive_race",
  "frame_cage", "frame_tube", "frame_wagon",
  "fuel_cell",
  "elec_ignition",
  "exhaust_glasspack",
  "beater_shell",
]);

const PART_SPRITE: Record<string, string> = { junk_misc: "misc_junk", junk_seat: "misc_seat" };

/** Vehicles whose image file has a different name. */
const VEHICLE_SPRITE: Record<string, string> = {
  roadbook_special: "rally_car",
  street_stock: "stock_car",
};

export function partSprite(partId: string): string {
  if (GARAGE_ART.has(partId)) return `/sprites/garage/${partId}.webp`;
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
