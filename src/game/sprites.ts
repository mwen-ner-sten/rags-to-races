/**
 * Sprite paths. File names are content ids, so new content needs only a
 * render (see docs/art/art-bible.md), not a mapping here.
 */

export function partSprite(partId: string): string {
  return `/sprites/parts/${partId}.webp`;
}

export function vehicleSprite(vehicleId: string): string {
  return `/sprites/vehicles/${vehicleId}.webp`;
}

export function placeSprite(placeId: string): string {
  return `/sprites/places/${placeId}.webp`;
}

export function venueSprite(venueId: string): string {
  return `/sprites/venues/${venueId}.webp`;
}

export function stageSprite(layout: string): string {
  return `/sprites/stages/${layout}.webp`;
}

export type RallyMarker = "kart" | "mower" | "saloon";

export function rallyMarker(vehicleId: string): RallyMarker {
  if (vehicleId === "go_kart") return "kart";
  return vehicleId.endsWith("mower") ? "mower" : "saloon";
}

export function rallySprite(vehicleId: string): string {
  return `/sprites/rally/${rallyMarker(vehicleId)}.webp`;
}

export function organizationSprite(organizationId: string): string {
  return `/sprites/organizations/${organizationId}.webp`;
}
