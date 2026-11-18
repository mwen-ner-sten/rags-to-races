import { countyForSource, homeCounty, HOME_COUNTIES } from "./counties";
import { PLACE_BY_ID, PLACES } from "./content/places";
import type { GameState, PartInstance, PartProvenance } from "./types";

const LEGACY_PLACES = new Map(PLACES.filter((place) => countyForSource(place.id) === "home").map((place) => [place.name, place.id]));

export function findProvenance(state: GameState, placeId: string): PartProvenance {
  return { placeId, county: placeId === "curb" ? homeCounty(state) : countyForSource(placeId), season: state.meta.seasonsPlayed + 1 };
}

export function partOriginLabel(part: Pick<PartInstance, "origin" | "provenance">): string {
  const source = part.provenance;
  if (!source) return part.origin;
  const place = PLACE_BY_ID[source.placeId]?.name;
  if (!place) return part.origin;
  const label = `${place} · ${HOME_COUNTIES[source.county].name}`;
  return part.origin === place ? label : `${part.origin} · sourced at ${label}`;
}

export function hauledSource(part: PartInstance, season?: number): string | undefined {
  // Shells purchased at the auction share a display name with the haul source.
  if (part.partId === "beater_shell") return undefined;
  if (!part.provenance) return LEGACY_PLACES.get(part.origin);
  return season === undefined || season === part.provenance.season ? part.provenance.placeId : undefined;
}
