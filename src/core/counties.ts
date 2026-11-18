import type { GameState, HomeCounty } from "./types";

export const HOME_COUNTIES = {
  home: { name: "Mill County", source: null, replaces: null, summary: "The familiar start with Neighbourhood Yards and Marisol's Junkyard." },
  river: { name: "River County", source: "floodplain", replaces: "yards", summary: "Floodplain Lots replace Neighbourhood Yards. Opens at 5 Rep, with free 3-minute trips for chassis and River Tires. The wet lots have poorer condition and few engines." },
  quarry: { name: "Quarry County", source: "quarry_breakers", replaces: "junkyard", summary: "Quarry Breakers replaces Marisol's Junkyard. Opens at 20 Rep with a trailer and charges 14 Scrap Bucks per trip. Hard parts and the Quarry Four are common; useful tires are scarcer." },
} as const;

export const HOME_COUNTY_IDS = Object.keys(HOME_COUNTIES) as HomeCounty[];
export const COUNTY_PARTS: Readonly<Record<string, HomeCounty>> = { wheel_river: "river", engine_quarry: "quarry" };

export function homeCounty(state: GameState): HomeCounty {
  return state.config.homeCounty ?? "home";
}

export function countyPassport(state: GameState) {
  const scouting = state.run.learned.includes("tech:scouting") || !!state.meta.knowhow["tech:scouting"];
  const visited = Object.values(state.meta.codex.places).filter((trips) => trips > 0).length;
  return { scouting, visited, earned: scouting && visited >= 3 };
}

export function countyChoiceBlocker(state: GameState, county: HomeCounty | undefined): string | null {
  if (county === undefined || county === "home") return null;
  if (!Object.hasOwn(HOME_COUNTIES, county)) return "Choose a home county";
  return countyPassport(state).earned ? null : "Learn Scouting and haul from three different sources";
}

export function countyPlaceBlocker(state: GameState, placeId: string): string | null {
  const county = homeCounty(state);
  if (HOME_COUNTIES[county].replaces === placeId) return `Unavailable in ${HOME_COUNTIES[county].name}`;
  const owner = countyForSource(placeId);
  return owner !== "home" && owner !== county ? `Only available in ${HOME_COUNTIES[owner].name}` : null;
}

export function countyForSource(placeId: string): HomeCounty {
  return HOME_COUNTY_IDS.find((id) => HOME_COUNTIES[id].source === placeId) ?? "home";
}
