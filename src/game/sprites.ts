/** Maps core ids onto the existing WebP sprite set in public/sprites. */
const PART_SPRITE: Record<string, string> = {
  wheel_kart: "wheel_basic",
  junk_misc: "misc_junk",
  junk_seat: "misc_seat",
};

export function partSprite(partId: string): string {
  if (partId === "beater_shell") return "/sprites/vehicles/beater_car.webp";
  return `/sprites/parts/${PART_SPRITE[partId] ?? partId}.webp`;
}

export function vehicleSprite(vehicleId: string): string {
  return `/sprites/vehicles/${vehicleId}.webp`;
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
