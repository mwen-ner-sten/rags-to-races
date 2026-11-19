import { countyPassport, homeCounty, HOME_COUNTIES } from "./counties";
import { getPart } from "./content/parts";
import { getPlace } from "./content/places";
import { reservedPartUids, vehicleBusy } from "./garage";
import { logSeason } from "./journal";
import { salvageCarryCandidates } from "./salvageCarry";
import type { GameState, HomeCounty, NeighborCounty, PartInstance, Vehicle } from "./types";

export const FREIGHT_COST = 8;
export const BATON_PART = { river: "wheel_river", quarry: "engine_quarry" } as const;
export type BatonChoice = "start" | "carry";
export const BATON_RELEASE_REQUIRED = "Release County Baton protection first.";

export function otherCounty(county: NeighborCounty): NeighborCounty {
  return county === "river" ? "quarry" : "river";
}

export function batonUnlocked(state: GameState): boolean {
  return countyPassport(state).earned && (state.meta.challengeRecords.parts_with_a_past?.completions ?? 0) >= 2;
}

function isNativePart(part: Pick<PartInstance, "partId" | "provenance">, county: NeighborCounty): boolean {
  return part.partId === BATON_PART[county] && part.provenance?.county === county && part.provenance.placeId === HOME_COUNTIES[county].source;
}

export function batonPartTag(state: GameState, part: PartInstance): string | undefined {
  const progress = state.run.countyBaton;
  if (!progress || !isNativePart(part, progress.from)) return;
  if (part.uid === progress.qualified?.uid) return progress.leg === "qualify" ? "Qualifying baton" : "Transferred baton";
  if (progress.leg === "qualify" && !part.inherited && part.provenance?.season === state.meta.seasonsPlayed + 1) return "Eligible baton candidate";
}

export function locateBatonPart(state: GameState, uid: string) {
  const vehicle = state.run.vehicles.find((car) => Object.values(car.parts).some((part) => part?.uid === uid));
  const fitted = vehicle && Object.values(vehicle.parts).find((part) => part?.uid === uid);
  const driveway = state.run.driveway.find((part) => part.uid === uid);
  const part = fitted ?? driveway ?? state.run.inventory.find((part) => part.uid === uid);
  return { part, vehicle, driveway: !!driveway };
}

export function changeBatonGuard(state: GameState, uid: string, keep: boolean): string | null {
  const { part } = locateBatonPart(state, uid);
  if (!part) return "Find the physical baton in the garage first";
  if (!keep) {
    delete part.batonGuard;
    return null;
  }
  if (state.run.countyBaton?.qualified?.uid !== uid || !batonPartTag(state, part)) return "Win a qualifying Feature with this part before safeguarding it";
  if (state.run.queue.some((spec) => spec.kind === "strip" && spec.partUid === uid)
    || [...state.run.jobs, ...(state.run.pausedJobs ?? [])].some(({ spec }) => spec.kind === "strip" && spec.partUid === uid)) return "Cancel the strip job before safeguarding the baton";
  part.batonGuard = true;
  return null;
}

export function batonTransferBlocker(state: GameState, uid: string): string | null {
  const { part, vehicle } = locateBatonPart(state, uid);
  const progress = state.run.countyBaton;
  if (!part || !progress || !isNativePart(part, progress.from)) return "The qualifying part is missing. Win the qualifying Feature again with another newly hauled local part.";
  if (vehicle && vehicleBusy(state, vehicle.uid)) return `Wait for ${vehicle.name} to return from the race before transferring its baton.`;
  if (reservedPartUids(state).has(uid)) return "Finish or cancel the baton’s queued work before transferring it.";
  if (!salvageCarryCandidates(state).some(({ part }) => part.uid === uid)) return "This part no longer meets the salvage carryover rules.";
  return null;
}

export function batonRaceSetup(state: GameState, venueId: string, car: Vehicle, regularity = false): { ready: boolean; text: string } | undefined {
  const progress = state.run.countyBaton;
  if (!progress || (progress.leg === "qualify" && (venueId !== "dirt" || progress.qualified))
    || (progress.leg === "deliver" && (venueId !== "county_fair" || progress.completedAt !== undefined))) return;
  if (regularity) return { ready: false, text: "Enter the standard Feature and win to count this leg." };
  const model = progress.leg === "qualify" ? "Go-Kart" : "Beater";
  if (car.vehicleId !== (progress.leg === "qualify" ? "go_kart" : "beater_car")) return { ready: false, text: `Choose a ${model} for this leg.` };
  const fitted = batonPartOn(state, venueId, car);
  if (fitted) return fitted.condition > 0 ? { ready: true, text: `${getPart(fitted.partId).name} fitted. A Feature win counts.` }
    : { ready: false, text: "The fitted baton is Scrap. Pull it and clean it in the garage." };
  if (progress.leg === "qualify") {
    const county = HOME_COUNTIES[progress.from];
    return { ready: false, text: `Fit a ${getPart(BATON_PART[progress.from]).name} from ${county.name} hauled this Season. Look for labelled parts in the Garage or haul from ${getPlace(county.source).name}.` };
  }
  const { part, vehicle, driveway } = locateBatonPart(state, progress.qualified.uid);
  if (!part) return { ready: false, text: "The transferred part is missing. Start a new attempt at Scrap Reset." };
  if (vehicle) return { ready: false, text: `Pull the baton from ${vehicle.name}, then fit it to this Beater in Build.` };
  if (reservedPartUids(state).has(part.uid)) return { ready: false, text: "Finish or cancel the baton’s queued work before fitting it." };
  if (driveway) return { ready: false, text: "Swap the transferred baton in from the driveway, then fit it to this Beater." };
  if (part.condition === 0) return { ready: false, text: "Clean the transferred baton in the Garage, then fit it to this Beater." };
  return { ready: false, text: `Fit the labelled ${getPart(part.partId).name} from your Garage to this Beater.` };
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
  return batonTransferBlocker(state, retainedPartUid);
}

export function freightEligible(state: GameState, county: HomeCounty, part: Pick<PartInstance, "partId" | "provenance"> | undefined): boolean {
  return county !== "home" && !!state.meta.countyFreight?.[county] && !!part && isNativePart(part, otherCounty(county));
}

export function freightBlocker(state: GameState, county: HomeCounty, retainedPartUid: string | undefined): string | null {
  const part = salvageCarryCandidates(state).find(({ part }) => part.uid === retainedPartUid)?.part;
  return freightEligible(state, county, part) ? null : "Choose a foreign county component covered by your freight permit";
}

export function batonPartOn(state: GameState, venueId: string, vehicle: Vehicle): PartInstance | undefined {
  const progress = state.run.countyBaton;
  if (!progress) return;
  const part = Object.values(vehicle.parts).find((part) => part && isNativePart(part, progress.from));
  if (!part) return;
  if (progress.leg === "qualify" && venueId === "dirt" && vehicle.vehicleId === "go_kart" && !part.inherited && part.provenance?.season === state.meta.seasonsPlayed + 1) return part;
  if (progress.leg === "deliver" && venueId === "county_fair" && vehicle.vehicleId === "beater_car" && part.uid === progress.qualified.uid && part.inherited) return part;
}

export function recordBatonWin(state: GameState, venueId: string, vehicle: Vehicle): void {
  const progress = state.run.countyBaton;
  if (!progress) return;
  const part = batonPartOn(state, venueId, vehicle);
  if (!part) return;
  if (progress.leg === "qualify") {
    if (progress.qualified?.uid === part.uid) return;
    if (progress.qualified && locateBatonPart(state, progress.qualified.uid).part?.batonGuard) return;
    progress.qualified = { uid: part.uid, at: state.run.seasonMs };
    logSeason(state, "county-baton-qualified", `${getPart(part.partId).name} qualified for County Baton. Carry this exact part to ${HOME_COUNTIES[otherCounty(progress.from)].name} at Scrap Reset.`, "county-baton-qualified");
    return;
  }
  if (progress.completedAt !== undefined) return;
  const county = otherCounty(progress.from);
  if (homeCounty(state) !== county) return;
  progress.completedAt = state.run.seasonMs;
  state.meta.countyFreight ??= {};
  state.meta.countyFreight[county] = (state.meta.countyFreight[county] ?? 0) + 1;
  logSeason(state, "county-baton-delivered", `${vehicle.name} won the Fair with the baton. ${HOME_COUNTIES[county].name} has opened its freight permit.`, "county-baton-delivered");
}
