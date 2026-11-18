import { venueName } from "./content/events";
import { getVehicle } from "./content/vehicles";
import { pushFeed } from "./feed";
import { enqueue, jobBlocker } from "./jobs";
import { addJournal, logSeason } from "./journal";
import { nextUid } from "./rng";
import type { DisciplineId, EventKind, GameState, JobSpec, RaceResult, Vehicle } from "./types";

export const OWNER_CHARTERS = ["privateer", "club", "works", "county_to_state"] as const;
export type OwnerCharter = typeof OWNER_CHARTERS[number];
type RaceSpec = Extract<JobSpec, { kind: "race" }>;

interface TourStop {
  venueId: string;
  event: EventKind;
  vehicleId?: string;
}

interface CharterDef {
  name: string;
  description: string;
  calendar: readonly TourStop[];
  target: number;
  minCars: number;
  tier: number | null;
  purse: number;
  teamPoints: number;
}

export const CHARTERS: Record<OwnerCharter, CharterDef> = {
  privateer: {
    name: "Independent Tour",
    description: "Take one proven car on the road. The calendar mixes shorter Heats with longer Features.",
    calendar: [
      { venueId: "county_fair", event: "feature" },
      { venueId: "regional", event: "heat" },
      { venueId: "state", event: "heat" },
      { venueId: "regional", event: "feature" },
      { venueId: "state", event: "feature" },
    ],
    target: 31, minCars: 1, tier: null, purse: 1600, teamPoints: 6,
  },
  club: {
    name: "Homegrown Cup",
    description: "Karts only. Build for the rough local track, then change your setup for the Fair.",
    calendar: [
      { venueId: "dirt", event: "heat" },
      { venueId: "county_fair", event: "heat" },
      { venueId: "dirt", event: "feature" },
      { venueId: "county_fair", event: "feature" },
      { venueId: "dirt", event: "feature" },
    ],
    target: 28, minCars: 1, tier: 2, purse: 1450, teamPoints: 8,
  },
  works: {
    name: "Two-Car Works Trophy",
    description: "Field two scoring cars across the Invitationals. Keep a backup ready and choose which car gets the hard rounds.",
    calendar: [
      { venueId: "regional", event: "feature" },
      { venueId: "state", event: "heat" },
      { venueId: "regional", event: "feature" },
      { venueId: "state", event: "feature" },
      { venueId: "state", event: "feature" },
    ],
    target: 36, minCars: 2, tier: null, purse: 3400, teamPoints: 14,
  },
  county_to_state: {
    name: "County-to-State Cup",
    description: "Start with a Go-Kart and finish in Street Stock. Even three Stock wins need a scoring kart result.",
    calendar: [
      { venueId: "dirt", event: "heat", vehicleId: "go_kart" },
      { venueId: "county_fair", event: "feature", vehicleId: "go_kart" },
      { venueId: "regional", event: "heat", vehicleId: "street_stock" },
      { venueId: "regional", event: "feature", vehicleId: "street_stock" },
      { venueId: "state", event: "feature", vehicleId: "street_stock" },
    ],
    target: 37, minCars: 2, tier: null, purse: 4000, teamPoints: 16,
  },
};

export const TOUR_POINTS = [12, 9, 7, 5, 3, 1] as const;
export const OWNER_HISTORY_LIMIT = 20;

export interface OwnerFinish {
  raceId: string;
  vehicleUid: string;
  carName: string;
  position: number;
  dnf: boolean;
}

export interface OwnerTour {
  id: string;
  charter: OwnerCharter;
  discipline: DisciplineId;
  /** One scored result or skipped round per calendar stop already resolved. */
  rounds: (OwnerFinish | null)[];
  status: "active" | "champion" | "finished" | "retired";
}

export interface OwnerState {
  tour: OwnerTour;
  history: OwnerTour[];
  titles: number;
  charterTitles: Record<OwnerCharter, number>;
}

export type OwnerMove =
  | { type: "found" | "start"; charter: OwnerCharter }
  | { type: "enter"; vehicleUid: string; call: RaceSpec["call"]; call2?: RaceSpec["call2"] }
  | { type: "skip" | "withdraw" | "retire" };

export function ownerGate(state: GameState): { ok: boolean; reason: string | null } {
  const ok = Boolean(state.era && (
    state.meta.teamStateWon || state.run.featureWins.state !== undefined || state.era.milestones.includes("state")
  ));
  return { ok, reason: ok ? null : "Win the State Invitational Feature with a founded team." };
}

export function ownerCharterBlocker(state: GameState, charter: OwnerCharter): string | null {
  if (charter !== "county_to_state") return null;
  const titles = state.owner?.charterTitles;
  return titles?.club && (titles.privateer || titles.works)
    ? null
    : "Win the Homegrown Cup and either the Independent Tour or Two-Car Works Trophy.";
}

export function ownerTourActive(state: GameState): boolean {
  return state.owner?.tour.status === "active";
}

export function tourRoundToken(tour: OwnerTour): string {
  return `${tour.id}:${tour.rounds.length}`;
}

export function currentTourEntry(state: GameState): "queued" | "racing" | null {
  const tour = state.owner?.tour;
  if (!tour || tour.status !== "active") return null;
  const token = tourRoundToken(tour);
  const matches = (spec: JobSpec) => spec.kind === "race" && spec.tourRound === token;
  if (state.run.jobs.some((job) => matches(job.spec))) return "racing";
  return state.run.queue.some(matches) ? "queued" : null;
}

export function finishPoints(finish: OwnerFinish | null): number {
  return finish && !finish.dnf ? TOUR_POINTS[finish.position - 1] ?? 0 : 0;
}

export function tourScore(tour: OwnerTour): { points: number; cars: number; champion: boolean } {
  const scoring = tour.rounds.filter((finish): finish is OwnerFinish => finishPoints(finish) > 0)
    .sort((a, b) => finishPoints(b) - finishPoints(a));
  const points = scoring.slice(0, 4).reduce((sum, finish) => sum + finishPoints(finish), 0);
  const cars = new Set(scoring.map((finish) => finish.vehicleUid)).size;
  const charter = CHARTERS[tour.charter];
  return { points, cars, champion: points >= charter.target && cars >= charter.minCars };
}

export function ownerClassBlocker(tour: OwnerTour, car: Vehicle): string | null {
  const charter = CHARTERS[tour.charter];
  const vehicleId = charter.calendar[tour.rounds.length]?.vehicleId;
  if (vehicleId && car.vehicleId !== vehicleId) return `This round requires a ${getVehicle(vehicleId).name}.`;
  if (charter.tier !== null && getVehicle(car.vehicleId).tier !== charter.tier) return "Only Go-Karts can enter this cup.";
  return null;
}

export function ownerEntryBlocker(state: GameState, tour: OwnerTour, vehicleUid: string, call: RaceSpec["call"], call2?: RaceSpec["call2"]): string | null {
  const stop = CHARTERS[tour.charter].calendar[tour.rounds.length];
  if (tour.status !== "active" || !stop) return "Start a championship first.";
  if (currentTourEntry(state)) return "This round already has an entry.";
  const car = state.run.vehicles.find((vehicle) => vehicle.uid === vehicleUid);
  if (!car) return "Choose a car.";
  return ownerClassBlocker(tour, car)
    ?? jobBlocker(state, { kind: "race", venueId: stop.venueId, event: stop.event, vehicleUid, call, call2 }, true);
}

export function applyOwner(state: GameState, move: OwnerMove): string | null {
  const owner = state.owner;
  const tour = owner?.tour;
  switch (move.type) {
    case "found":
    case "start": {
      if (!Object.hasOwn(CHARTERS, move.charter)) return "Choose a championship charter.";
      if (move.type === "found") {
        if (owner) return "Your team already has an Owner charter.";
        const gate = ownerGate(state);
        if (!gate.ok) return gate.reason;
      } else if (!owner || !state.era) {
        return "Sign an Owner charter first.";
      }
      if (tour?.status === "active") return "Finish or retire from your current championship first.";
      const blocked = ownerCharterBlocker(state, move.charter);
      if (blocked) return blocked;
      const newTour: OwnerTour = {
        id: nextUid(state, "tour"),
        charter: move.charter,
        discipline: state.era!.discipline,
        rounds: [],
        status: "active",
      };
      if (owner) {
        owner.history.unshift(owner.tour);
        if (owner.history.length > OWNER_HISTORY_LIMIT) owner.history.length = OWNER_HISTORY_LIMIT;
        owner.tour = newTour;
      } else {
        state.owner = { tour: newTour, history: [], titles: 0, charterTitles: { privateer: 0, club: 0, works: 0, county_to_state: 0 } };
        addJournal(state, "owner_charter", "The team signs its first touring charter. Lou helps you load the trailer.");
      }
      logSeason(state, newTour.id, `Entered the ${CHARTERS[move.charter].name}.`);
      return null;
    }
    case "enter": {
      if (!tour) return "Start a championship first.";
      if (move.call !== "push" && move.call !== "nurse") return "Choose a race call.";
      const blocker = ownerEntryBlocker(state, tour, move.vehicleUid, move.call, move.call2);
      if (blocker) return blocker;
      const stop = CHARTERS[tour.charter].calendar[tour.rounds.length];
      return enqueue(state, {
        kind: "race", venueId: stop.venueId, event: stop.event, vehicleUid: move.vehicleUid, call: move.call, call2: move.call2,
        tourRound: tourRoundToken(tour),
      });
    }
    case "skip":
      if (!tour || tour.status !== "active") return "There is no round to skip.";
      if (currentTourEntry(state)) return "Withdraw your entry before skipping.";
      pushFeed(state, "race", `Skipped round ${tour.rounds.length + 1}. It scores zero points.`);
      completeRound(state, null);
      return null;
    case "withdraw":
      if (!tour || currentTourEntry(state) !== "queued") return "Only a queued entry can be withdrawn.";
      removeQueuedEntry(state, tour);
      return null;
    case "retire":
      if (!tour || tour.status !== "active") return "There is no active championship.";
      if (currentTourEntry(state) === "racing") return "Wait for the current round to finish.";
      forfeitOwnerTour(state);
      return null;
  }
}

function removeQueuedEntry(state: GameState, tour: OwnerTour): void {
  const token = tourRoundToken(tour);
  state.run.queue = state.run.queue.filter((spec) => spec.kind !== "race" || spec.tourRound !== token);
}

export function forfeitOwnerTour(state: GameState): void {
  const tour = state.owner?.tour;
  if (!tour || tour.status !== "active") return;
  removeQueuedEntry(state, tour);
  tour.status = "retired";
  logSeason(state, `retired:${tour.id}`, `Retired from the ${CHARTERS[tour.charter].name}.`);
}

export function recordOwnerFinish(state: GameState, spec: RaceSpec, result: RaceResult): void {
  if (state.era && result.venueId === "state" && result.event === "feature" && result.position === 1 && !result.dnf) {
    state.meta.teamStateWon = true;
  }
  const tour = state.owner?.tour;
  if (!tour || tour.status !== "active" || spec.tourRound !== tourRoundToken(tour)) return;
  const stop = CHARTERS[tour.charter].calendar[tour.rounds.length];
  if (!stop || stop.venueId !== result.venueId || stop.event !== result.event || spec.vehicleUid !== result.vehicleUid) return;
  const car = state.run.vehicles.find((vehicle) => vehicle.uid === result.vehicleUid);
  if (!car || ownerClassBlocker(tour, car)) return;
  const finish = {
    raceId: result.id,
    vehicleUid: result.vehicleUid,
    carName: car.name,
    position: result.position,
    dnf: result.dnf,
  };
  const venue = venueName(stop.venueId, tour.discipline);
  pushFeed(state, "race", `${venue} scored ${finishPoints(finish)} championship points for ${finish.carName}.`, { key: `championship-round:${finish.raceId}` });
  completeRound(state, finish);
}

function completeRound(state: GameState, finish: OwnerFinish | null): void {
  const owner = state.owner!;
  const tour = owner.tour;
  tour.rounds.push(finish);
  const charter = CHARTERS[tour.charter];
  if (tour.rounds.length < charter.calendar.length) return;
  const score = tourScore(tour);
  tour.status = score.champion ? "champion" : "finished";
  if (score.champion) {
    owner.titles += 1;
    owner.charterTitles[tour.charter] += 1;
    state.run.cash += charter.purse;
    state.team.tp += charter.teamPoints;
    state.team.lifetimeTp += charter.teamPoints;
    if (!ownerCharterBlocker(state, "county_to_state")) {
      addJournal(state, "county_to_state_invite", "The County-to-State Cup invites your team. Pack the kart and a Street Stock.", true, "championship-unlock:county_to_state");
    }
  }
  logSeason(state, `finished:${tour.id}`, score.champion
    ? `Won the ${charter.name} with ${score.points} points. The title pays ${charter.purse} Scrap Bucks and ${charter.teamPoints} Team Points.`
    : `Finished the ${charter.name} with ${score.points} points from ${score.cars} scoring cars.`, `championship-result:${tour.id}`);
}
