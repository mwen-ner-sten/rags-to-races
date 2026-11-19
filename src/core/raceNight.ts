import { VENUE_BY_ID } from "./content/events";
import { vehicleBusy } from "./garage";
import { dispatch, jobBlocker } from "./jobs";
import type { GameState, JobSpec, RaceCall } from "./types";

export const RACE_NIGHT_STARTS = 3;
export type RaceNightMove = { type: "plan"; vehicleUid: string; venueId: string; call: RaceCall } | { type: "cancel" };

export function nextRaceNightSpec(state: GameState, plan = state.run.raceNight): Extract<JobSpec, { kind: "race" }> | null {
  if (!plan || state.era || state.run.featureWins.county_fair !== undefined) return null;
  if (plan.stopOnFeature && state.run.featureWins[plan.venueId] !== undefined) return null;
  const event = state.run.ladder[plan.venueId]?.at(-1);
  return event ? { kind: "race", vehicleUid: plan.vehicleUid, venueId: plan.venueId, event, call: plan.call } : null;
}

export function raceNightBlocker(state: GameState, car: string, venue: string, call: RaceCall): string | null {
  if (state.run.raceNight) return "Cancel the current Race Night to plan another";
  if (call !== "push" && call !== "nurse") return "Choose a race pace";
  if (!Object.hasOwn(VENUE_BY_ID, venue)) return "Choose a venue";
  const plan = { vehicleUid: car, venueId: venue, call, startsLeft: RACE_NIGHT_STARTS, stopOnFeature: false };
  const spec = nextRaceNightSpec(state, plan);
  if (!spec) return "Choose an open venue before winning the Fair Feature";
  if (vehicleBusy(state, car) || state.run.queue.some((job) => job.kind === "race" && job.vehicleUid === car)) return "Finish or remove this vehicle's race sign-ups first";
  return jobBlocker(state, spec, true);
}

export function applyRaceNight(state: GameState, move: RaceNightMove): string | null {
  if (move.type === "cancel") {
    if (!state.run.raceNight) return "No Race Night is planned";
    delete state.run.raceNight;
    dispatch(state);
    return null;
  }
  const problem = raceNightBlocker(state, move.vehicleUid, move.venueId, move.call);
  if (problem) return problem;
  state.run.raceNight = {
    vehicleUid: move.vehicleUid, venueId: move.venueId, call: move.call,
    startsLeft: RACE_NIGHT_STARTS, stopOnFeature: state.run.featureWins[move.venueId] === undefined,
  };
  dispatch(state);
  return null;
}
