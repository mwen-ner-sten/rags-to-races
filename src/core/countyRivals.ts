import { homeCounty } from "./counties";
import { enqueue, jobBlocker } from "./jobs";
import { logSeason } from "./journal";
import type { GameState, JobSpec, PartProvenance, RaceCall, RaceResult, Vehicle } from "./types";

export const COUNTY_RIVALS = {
  inez: { name: "Inez Marsh", county: "river", workshop: "floodplain", part: "wheel_river", pace: 1.12, variation: 0.65, out: 0.06,
    brief: "Inez keeps her speed through the wet corners. Her pace is steady and she rarely drops out." },
  wade: { name: "Wade Slater", county: "quarry", workshop: "quarry_breakers", part: "engine_quarry", pace: 1.24, variation: 1.25, out: 0.14,
    brief: "Wade hits the straight hard. Look after your own engine and build enough speed to beat him when his car holds together." },
} as const;

export type CountyRivalId = keyof typeof COUNTY_RIVALS;
export const COUNTY_RIVAL_IDS = Object.keys(COUNTY_RIVALS) as CountyRivalId[];
type RaceSpec = Extract<JobSpec, { kind: "race" }>;

export interface CountyProof {
  raceId: string;
  season: number;
  car: string;
  position: number;
  beaten: boolean;
  dnf: boolean;
  rivalOut: boolean;
}

export interface CountyContact {
  attempts: number;
  latest: CountyProof;
  earned?: CountyProof;
}

export interface CountyMatchResult {
  rival: CountyRivalId;
  beaten: boolean;
  rivalOut: boolean;
}

export type CountyMatchMove = { type: "enter"; vehicleUid: string; call: RaceCall };

export function localRival(state: GameState): CountyRivalId | undefined {
  return COUNTY_RIVAL_IDS.find((id) => COUNTY_RIVALS[id].county === homeCounty(state));
}

export function countyLoanOrigin(id: CountyRivalId): string {
  return `${COUNTY_RIVALS[id].name} Club Loan`;
}

export function countyLoanProvenance(state: GameState, id: CountyRivalId): PartProvenance {
  const rival = COUNTY_RIVALS[id];
  return { county: rival.county, placeId: rival.workshop, season: state.countyRivals![id]!.earned!.season };
}

export function countyVisitorLoanBlocker(state: GameState, id?: CountyRivalId): string | null {
  if (id === undefined) return null;
  if (!Object.hasOwn(COUNTY_RIVALS, id) || !state.countyRivals?.[id]?.earned) return "Beat that county rival before borrowing their part.";
  return null;
}

export function countyBuildReady(state: GameState, vehicle: Vehicle, id: CountyRivalId): boolean {
  return vehicle.vehicleId === "push_mower" && Object.values(vehicle.parts).some((part) => part?.provenance?.county === COUNTY_RIVALS[id].county
    && part.provenance.season === state.meta.seasonsPlayed + 1 && !part.inherited);
}

export function countySpecMatches(state: GameState, spec: RaceSpec, checkReady = true): boolean {
  const id = spec.countyMatch;
  if (!id || id !== localRival(state) || spec.venueId !== "backyard" || spec.event !== "sprint"
    || spec.tourRound || spec.tourReserve !== undefined || spec.clubRound || spec.worksRound || spec.regularity || spec.useLastPace || spec.call2 || state.countyRivals?.[id]?.earned) return false;
  const car = state.run.vehicles.find(({ uid }) => uid === spec.vehicleUid);
  return !!car && car.vehicleId === "push_mower" && (!checkReady || countyBuildReady(state, car, id));
}

export function countyEntryStatus(state: GameState): "queued" | "racing" | null {
  const id = localRival(state);
  if (!id) return null;
  const matches = (spec: JobSpec) => spec.kind === "race" && spec.countyMatch === id;
  if (state.run.jobs.some(({ spec }) => matches(spec))) return "racing";
  return state.run.queue.some(matches) ? "queued" : null;
}

export function countyMatchBlocker(state: GameState, vehicleUid: string, call: RaceCall): string | null {
  const id = localRival(state);
  if (!id) return "Move to River or Quarry County to meet a local rival.";
  if (state.countyRivals?.[id]?.earned) return "You already earned this visitor’s support.";
  if (countyEntryStatus(state)) return "A county match is already booked.";
  if (state.run.raceNight?.vehicleUid === vehicleUid) return "Stop Race Night for this car before signing up.";
  if (call !== "push" && call !== "nurse") return "Choose a race pace.";
  const spec: RaceSpec = { kind: "race", vehicleUid, venueId: "backyard", event: "sprint", call, countyMatch: id };
  if (!countySpecMatches(state, spec)) return "Fit a Push Mower with a part hauled in this county during this Season.";
  return jobBlocker(state, spec, true);
}

export function applyCountyMatch(state: GameState, move: CountyMatchMove): string | null {
  const issue = countyMatchBlocker(state, move.vehicleUid, move.call);
  if (issue) return issue;
  return enqueue(state, { kind: "race", vehicleUid: move.vehicleUid, venueId: "backyard", event: "sprint", call: move.call, countyMatch: localRival(state)! });
}

export function recordCountyMatch(state: GameState, spec: RaceSpec, result: RaceResult): void {
  if (!spec.countyMatch || !countySpecMatches(state, spec) || result.countyMeeting?.rival !== spec.countyMatch || result.vehicleUid !== spec.vehicleUid) return;
  const id = spec.countyMatch;
  const car = state.run.vehicles.find(({ uid }) => uid === result.vehicleUid)!;
  const matches = state.countyRivals ??= {};
  const old = matches[id];
  const proof = { raceId: result.id, season: state.meta.seasonsPlayed + 1, car: car.name, position: result.position, dnf: result.dnf,
    beaten: result.countyMeeting.beaten, rivalOut: result.countyMeeting.rivalOut };
  const earned = proof.beaten && !proof.dnf && !proof.rivalOut;
  matches[id] = { attempts: (old?.attempts ?? 0) + 1, latest: proof, ...(earned && { earned: proof }) };
  if (earned) logSeason(state, `county:${id}`, `${car.name} beat ${COUNTY_RIVALS[id].name}. Their workshop can lend a named part when you found a future Club Season.`);
}
