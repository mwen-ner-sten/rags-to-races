import { countyPassport, homeCounty, HOME_COUNTIES } from "./counties";
import { getPart } from "./content/parts";
import { logSeason } from "./journal";
import { salvageCarryCandidates } from "./salvageCarry";
import type { GameState, HomeCounty, NeighborCounty, PartInstance, Vehicle } from "./types";

export const FREIGHT_COST = 8;
export const BATON_PART = { river: "wheel_river", quarry: "engine_quarry" } as const;
export type BatonChoice = "start" | "carry";

export function otherCounty(county: NeighborCounty): NeighborCounty {
  return county === "river" ? "quarry" : "river";
}

export function batonUnlocked(state: GameState): boolean {
  return countyPassport(state).earned && (state.meta.challengeRecords.parts_with_a_past?.completions ?? 0) >= 2;
}

export function batonChoicesBlocker(state: GameState, choice: BatonChoice | undefined, county: HomeCounty, retainedPartUid: string | undefined, dare: string | null, freight: boolean): string | null {
  if (!choice) return null;
  if (!batonUnlocked(state)) return "Complete Parts With a Past twice and earn your county permit";
  if (dare) return "Choose County Baton or another Season objective";
  if (choice === "start") return county === "home" ? "Start County Baton in River or Quarry County" : null;
  const progress = state.run.countyBaton;
  if (choice !== "carry" || progress?.leg !== "qualify" || !progress.qualified) return "Win the Dirt Feature with the county component first";
  if (county !== otherCounty(progress.from)) return `Deliver the baton in ${HOME_COUNTIES[otherCounty(progress.from)].name}`;
  if (freight) return "Transfer the baton in the ordinary one-slot crate";
  if (retainedPartUid !== progress.qualified.uid) return "Carry the same physical part from the qualifying kart";
  return null;
}

export function freightEligible(state: GameState, county: HomeCounty, part: Pick<PartInstance, "partId" | "provenance"> | undefined): boolean {
  if (county === "home" || !state.meta.countyFreight?.[county] || !part) return false;
  const origin = otherCounty(county);
  return part.partId === BATON_PART[origin] && part.provenance?.county === origin && part.provenance.placeId === HOME_COUNTIES[origin].source;
}

export function freightBlocker(state: GameState, county: HomeCounty, retainedPartUid: string | undefined): string | null {
  const part = salvageCarryCandidates(state).find(({ part }) => part.uid === retainedPartUid)?.part;
  return freightEligible(state, county, part) ? null : "Choose a foreign county component covered by your freight permit";
}

export function batonPartOn(state: GameState, venueId: string, vehicle: Vehicle): PartInstance | undefined {
  const progress = state.run.countyBaton;
  if (!progress) return;
  const partId = BATON_PART[progress.from];
  const part = Object.values(vehicle.parts).find((part) => part?.partId === partId);
  if (!part || part.provenance?.county !== progress.from || part.provenance.placeId !== HOME_COUNTIES[progress.from].source) return;
  if (progress.leg === "qualify" && venueId === "dirt" && vehicle.vehicleId === "go_kart" && !part.inherited && part.provenance.season === state.meta.seasonsPlayed + 1) return part;
  if (progress.leg === "deliver" && venueId === "county_fair" && vehicle.vehicleId === "beater_car" && part.uid === progress.qualified.uid && part.inherited) return part;
}

export function recordBatonWin(state: GameState, venueId: string, vehicle: Vehicle): void {
  const progress = state.run.countyBaton;
  if (!progress) return;
  const part = batonPartOn(state, venueId, vehicle);
  if (!part) return;
  if (progress.leg === "qualify") {
    if (progress.qualified?.uid === part.uid) return;
    progress.qualified = { uid: part.uid, at: state.run.seasonMs };
    logSeason(state, "county-baton-qualified", `${getPart(part.partId).name} qualified for County Baton. Carry this exact part to ${HOME_COUNTIES[otherCounty(progress.from)].name} at Scrap Reset.`);
    return;
  }
  if (progress.completedAt !== undefined) return;
  const county = otherCounty(progress.from);
  if (homeCounty(state) !== county) return;
  progress.completedAt = state.run.seasonMs;
  state.meta.countyFreight ??= {};
  state.meta.countyFreight[county] = (state.meta.countyFreight[county] ?? 0) + 1;
  logSeason(state, "county-baton-delivered", `${vehicle.name} won the Fair with the baton. ${HOME_COUNTIES[county].name} has opened its freight permit.`);
}
