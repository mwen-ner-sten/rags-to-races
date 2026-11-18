import { getVenue, venueName } from "./content/events";
import { getVehicle } from "./content/vehicles";
import { pushFeed } from "./feed";
import { enqueue, jobBlocker, QUEUE_LIMIT, rungPending, signedUp } from "./jobs";
import { addJournal, logSeason } from "./journal";
import { dnfChance, effectiveScore, winChance } from "./race";
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
export const SPONSOR_IDS = ["reliable", "front_row"] as const;
type SponsorId = typeof SPONSOR_IDS[number];

export const TOUR_SPONSORS = {
  reliable: { name: "Reliable Parts", term: "Score in all five rounds", stake: 150, bonus: 450 },
  front_row: { name: "Front Row Fuel", term: "Win three rounds", stake: 450, bonus: 1100 },
} satisfies Record<SponsorId, { name: string; term: string; stake: number; bonus: number }>;

export interface OwnerFinish {
  raceId: string;
  vehicleUid: string;
  carName: string;
  position: number;
  dnf: boolean;
  finance?: { entry: number; prize: number };
  setup?: { engine?: string; tires?: string; tune: Vehicle["tune"]; call: RaceSpec["call"] };
}

export interface OwnerTour {
  id: string;
  charter: OwnerCharter;
  discipline: DisciplineId;
  /** One scored result or skipped round per calendar stop already resolved. */
  rounds: (OwnerFinish | null)[];
  status: "active" | "champion" | "finished" | "retired";
  sponsor?: SponsorId;
  itinerary?: "reverse" | "endurance";
  entryPlan?: EntryPlan;
}

interface EntryPlanSettings {
  leadUid: string;
  reserveUid?: string;
  call: RaceSpec["call"];
  cashFloor: number;
}

interface EntryPlan extends EntryPlanSettings {
  enabled: boolean;
}

export interface OwnerState {
  tour: OwnerTour;
  history: OwnerTour[];
  titles: number;
  charterTitles: Record<OwnerCharter, number>;
  records?: OwnerRecords;
}

type OwnerRecords = Record<DisciplineId, Partial<Record<OwnerCharter, { points: number; titles: number }>>>;

export function ownerRecords(owner: OwnerState): OwnerRecords {
  if (owner.records) return owner.records;
  const records: OwnerRecords = { dirt: {}, drag: {}, rally: {} };
  for (const tour of [owner.tour, ...owner.history]) creditOwnerRecord(records, tour);
  return records;
}

function creditOwnerRecord(records: OwnerRecords, tour: OwnerTour): void {
  if (tour.status !== "champion" && tour.status !== "finished") return;
  const previous = records[tour.discipline][tour.charter];
  records[tour.discipline][tour.charter] = {
    points: Math.max(previous?.points ?? 0, tourScore(tour).points),
    titles: (previous?.titles ?? 0) + Number(tour.status === "champion"),
  };
}

export type OwnerMove =
  | { type: "found" | "start"; charter: OwnerCharter; sponsor?: SponsorId; itinerary?: OwnerTour["itinerary"] }
  | { type: "enter"; vehicleUid: string; call: RaceSpec["call"]; call2?: RaceSpec["call2"] }
  | { type: "plan_entries"; settings: EntryPlanSettings }
  | { type: "skip" | "withdraw" | "retire" | "pause_plan" };

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

export function reverseTourUnlocked(state: GameState, charter: OwnerCharter): boolean {
  return !!(state.owner && state.era && ownerRecords(state.owner)[state.era.discipline][charter]?.titles);
}

export function enduranceTourUnlocked(state: GameState, charter: OwnerCharter): boolean {
  if (!state.owner) return false;
  const records = ownerRecords(state.owner);
  return Object.values(records).filter((disc) => (disc[charter]?.titles ?? 0) > 0).length >= 2;
}

export function tourCalendar(tour: OwnerTour): readonly TourStop[] {
  const stops = CHARTERS[tour.charter].calendar;
  if (tour.itinerary === "reverse") return [...stops].reverse();
  if (tour.itinerary === "endurance") return stops.map((stop) => ({ ...stop, event: "feature" }));
  return stops;
}

export function sponsorshipBlocker(state: GameState, sponsor: SponsorId): string | null {
  if (!Object.hasOwn(TOUR_SPONSORS, sponsor)) return "Choose a valid sponsor.";
  if (!state.owner?.titles) return "Win a championship to pitch sponsors.";
  const { stake } = TOUR_SPONSORS[sponsor];
  return state.run.cash < stake ? `The sponsor requires a ${stake} Scrap Bucks stake.` : null;
}

export function sponsorProgress(tour: OwnerTour): { completed: number; target: number; payout: number } | null {
  if (!tour.sponsor) return null;
  const sponsor = TOUR_SPONSORS[tour.sponsor];
  const target = tour.sponsor === "reliable" ? CHARTERS[tour.charter].calendar.length : 3;
  const completed = tour.rounds.filter((finish) => {
    const score = finishPoints(finish);
    return tour.sponsor === "reliable" ? score > 0 : score === TOUR_POINTS[0];
  }).length;
  const payout = completed >= target && (tour.status === "champion" || tour.status === "finished")
    ? sponsor.stake + sponsor.bonus : 0;
  return { completed, target, payout };
}

export function tourCash(tour: OwnerTour): { entries: number; prizes: number; stake: number; sponsor: number; title: number; net: number } | null {
  const stake = tour.sponsor ? TOUR_SPONSORS[tour.sponsor].stake : 0;
  const sponsor = sponsorProgress(tour)?.payout ?? 0;
  const title = tour.status === "champion" ? CHARTERS[tour.charter].purse : 0;
  let entries = 0;
  let prizes = 0;
  for (const finish of tour.rounds) {
    if (!finish) continue;
    if (!finish.finance) return null;
    entries += finish.finance.entry;
    prizes += finish.finance.prize;
  }
  return { entries, prizes, stake, sponsor, title, net: prizes + sponsor + title - entries - stake };
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

export function queuedTourProblem(state: GameState, tour: OwnerTour): string | null {
  const spec = state.run.queue.find((job) => job.kind === "race" && job.tourRound === tourRoundToken(tour));
  return spec ? jobBlocker(state, spec, true) : null;
}

export function finishPoints(finish: OwnerFinish | null): number {
  return finish && !finish.dnf ? TOUR_POINTS[finish.position - 1] ?? 0 : 0;
}

export function tourRoundStandings(tour: OwnerTour): { points: number; counts: boolean }[] {
  const points = tour.rounds.map(finishPoints);
  const counting = new Set(points.map((score, index) => ({ score, index }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4).map(({ index }) => index));
  return points.map((score, index) => ({ points: score, counts: counting.has(index) }));
}

export function tourScore(tour: OwnerTour): { points: number; cars: number; champion: boolean } {
  const points = tourRoundStandings(tour).reduce((sum, round) => sum + (round.counts ? round.points : 0), 0);
  const cars = scoringCarIds(tour).size;
  const charter = CHARTERS[tour.charter];
  return { points, cars, champion: points >= charter.target && cars >= charter.minCars };
}

function scoringCarIds(tour: OwnerTour): Set<string> {
  return new Set(tour.rounds.flatMap((finish) => finish && finishPoints(finish) > 0 ? [finish.vehicleUid] : []));
}

export function needsNewScoringCar(tour: OwnerTour): boolean {
  const missing = CHARTERS[tour.charter].minCars - scoringCarIds(tour).size;
  const remaining = tourCalendar(tour).length - tour.rounds.length;
  return missing > 0 && remaining === missing && titleForecast(tour).status === "possible";
}

export function titleForecast(tour: OwnerTour): { maximum: number; maximumAfterSkip: number; status: "secured" | "possible" | "out" } {
  const charter = CHARTERS[tour.charter];
  const remaining = tourCalendar(tour).length - tour.rounds.length;
  const banked = tour.rounds.map(finishPoints);
  const ceiling = (wins: number) => [...banked, ...Array<number>(wins).fill(TOUR_POINTS[0])]
    .sort((a, b) => b - a).slice(0, 4).reduce((total, points) => total + points, 0);
  const maximum = ceiling(remaining);
  const current = tourScore(tour);
  const status = current.champion ? "secured"
    : maximum < charter.target || current.cars + remaining < charter.minCars ? "out" : "possible";
  return { maximum, maximumAfterSkip: ceiling(Math.max(0, remaining - 1)), status };
}

export function ownerClassBlocker(tour: OwnerTour, car: Vehicle): string | null {
  const charter = CHARTERS[tour.charter];
  const vehicleId = tourCalendar(tour)[tour.rounds.length]?.vehicleId;
  if (vehicleId && car.vehicleId !== vehicleId) return `This round requires a ${getVehicle(vehicleId).name}.`;
  if (charter.tier !== null && getVehicle(car.vehicleId).tier !== charter.tier) return "Only Go-Karts can enter this cup.";
  return null;
}

export function tourGarage(state: GameState, tour: OwnerTour, call: RaceSpec["call"], call2?: RaceSpec["call2"]): Vehicle[] {
  const stop = tourCalendar(tour)[tour.rounds.length];
  if (!stop) return [];
  const [minimum, maximum] = getVenue(stop.venueId).tiers;
  const needReserve = needsNewScoringCar(tour);
  const scoringCars = scoringCarIds(tour);
  return state.run.vehicles.flatMap((car) => {
    const tier = getVehicle(car.vehicleId).tier;
    if (tier < minimum || tier > maximum || ownerClassBlocker(tour, car)) return [];
    const ready = Number(!ownerEntryBlocker(state, tour, car.uid, call, call2));
    return [{
      car, ready, fulfillsLineup: Number(needReserve && !scoringCars.has(car.uid)),
      odds: winChance(state, car, stop.venueId, stop.event, call, call2),
      dnf: dnfChance(state, car, stop.venueId, stop.event, call, call2),
      score: effectiveScore(state, car, stop.venueId, call, call2, stop.event),
    }];
  }).sort((a, b) => b.ready - a.ready || b.fulfillsLineup - a.fulfillsLineup || b.odds - a.odds || a.dnf - b.dnf || b.score - a.score)
    .map(({ car }) => car);
}

export function ownerEntryBlocker(state: GameState, tour: OwnerTour, vehicleUid: string, call: RaceSpec["call"], call2?: RaceSpec["call2"]): string | null {
  const stop = tourCalendar(tour)[tour.rounds.length];
  if (tour.status !== "active" || !stop) return "Start a championship first.";
  if (currentTourEntry(state)) return "This round already has an entry.";
  const car = state.run.vehicles.find((vehicle) => vehicle.uid === vehicleUid);
  if (!car) return "Choose a car.";
  const eligibility = ownerClassBlocker(tour, car)
    ?? jobBlocker(state, { kind: "race", venueId: stop.venueId, event: stop.event, vehicleUid, call, call2 }, true);
  if (eligibility) return eligibility;
  if (signedUp(state, stop.venueId, stop.event)) return "An ordinary entry already uses this race. Finish or withdraw it first.";
  if (state.run.queue.some((job) => job.kind === "race" && job.vehicleUid === vehicleUid) && !rungPending(state, stop.venueId, stop.event, vehicleUid)) {
    return "This car already has a race sign-up.";
  }
  return null;
}

function plannedEntry(state: GameState, tour: OwnerTour): { spec: RaceSpec | null; reason: string | null } {
  const plan = tour.entryPlan;
  if (!plan?.enabled || tour.status !== "active" || currentTourEntry(state)) return { spec: null, reason: null };
  if (state.run.queue.length >= QUEUE_LIMIT) return { spec: null, reason: "The queue is full. Waiting for a free slot." };
  const stop = tourCalendar(tour)[tour.rounds.length];
  if (!stop) return { spec: null, reason: null };
  const entry = getVenue(stop.venueId).events[stop.event].entry;
  if (state.run.cash - entry < plan.cashFloor) {
    return { spec: null, reason: `The ${entry} Scrap Bucks entry would leave less than your ${plan.cashFloor} Scrap Bucks reserve.` };
  }
  const reasons: string[] = [];
  for (const vehicleUid of [plan.leadUid, plan.reserveUid]) {
    if (!vehicleUid) continue;
    const reason = ownerEntryBlocker(state, tour, vehicleUid, plan.call);
    if (!reason) return {
      spec: { kind: "race", venueId: stop.venueId, event: stop.event, vehicleUid, call: plan.call, tourRound: tourRoundToken(tour), tourReserve: plan.cashFloor },
      reason: null,
    };
    const car = state.run.vehicles.find((candidate) => candidate.uid === vehicleUid);
    reasons.push(car ? `${car.name}: ${reason}` : "One planned car is no longer available.");
  }
  return { spec: null, reason: reasons.join(" ") };
}

export function entryPlanStatus(state: GameState, tour: OwnerTour): string | null {
  return queuedTourProblem(state, tour) ?? plannedEntry(state, tour).reason;
}

export function queueTourPlan(state: GameState): void {
  const tour = state.owner?.tour;
  if (!tour?.entryPlan?.enabled) return;
  const { spec } = plannedEntry(state, tour);
  if (spec) enqueue(state, spec);
}

export function pauseTourPlanOnCancellation(state: GameState, spec: JobSpec): void {
  const tour = state.owner?.tour;
  if (tour?.entryPlan && spec.kind === "race" && spec.tourReserve !== undefined && spec.tourRound === tourRoundToken(tour)) {
    tour.entryPlan.enabled = false;
  }
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
      const sponsorBlocked = move.sponsor && sponsorshipBlocker(state, move.sponsor);
      if (sponsorBlocked) return sponsorBlocked;
      if (move.itinerary === "reverse" && !reverseTourUnlocked(state, move.charter)) {
        return "Win this charter in your current discipline to race it in reverse.";
      }
      if (move.itinerary === "endurance" && !enduranceTourUnlocked(state, move.charter)) {
        return "Win this charter in two disciplines to run the all-Feature tour.";
      }
      if (move.itinerary !== undefined && move.itinerary !== "reverse" && move.itinerary !== "endurance") return "Choose an available itinerary.";
      const newTour: OwnerTour = {
        id: nextUid(state, "tour"),
        charter: move.charter,
        discipline: state.era!.discipline,
        rounds: [],
        status: "active",
        sponsor: move.sponsor,
        itinerary: move.itinerary,
      };
      if (move.sponsor) state.run.cash -= TOUR_SPONSORS[move.sponsor].stake;
      if (owner) {
        owner.records ??= ownerRecords(owner);
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
      const stop = tourCalendar(tour)[tour.rounds.length];
      return enqueue(state, {
        kind: "race", venueId: stop.venueId, event: stop.event, vehicleUid: move.vehicleUid, call: move.call, call2: move.call2,
        tourRound: tourRoundToken(tour),
      });
    }
    case "plan_entries": {
      if (!tour || tour.status !== "active") return "Start a championship first.";
      if (!reverseTourUnlocked(state, tour.charter)) return "Win this charter in your current discipline before saving an entry plan.";
      const { leadUid, reserveUid, call, cashFloor } = move.settings;
      if (!Number.isSafeInteger(cashFloor) || cashFloor < 0) return "Choose a nonnegative, whole Scrap Bucks reserve.";
      if (call !== "push" && call !== "nurse") return "Choose a race call.";
      if (!state.run.vehicles.some((car) => car.uid === leadUid)) return "Choose a lead car from the garage.";
      if (reserveUid === leadUid || (reserveUid && !state.run.vehicles.some((car) => car.uid === reserveUid))) {
        return "Choose a different reserve car from the garage.";
      }
      tour.entryPlan = { leadUid, reserveUid, call, cashFloor, enabled: true };
      queueTourPlan(state);
      return null;
    }
    case "pause_plan": {
      if (!tour || tour.status !== "active" || !tour.entryPlan) return "There is no entry plan to pause.";
      tour.entryPlan.enabled = false;
      const token = tourRoundToken(tour);
      state.run.queue = state.run.queue.filter((job) => job.kind !== "race" || job.tourRound !== token || job.tourReserve === undefined);
      return null;
    }
    case "skip":
      if (!tour || tour.status !== "active") return "There is no round to skip.";
      if (currentTourEntry(state)) return "Withdraw your entry before skipping.";
      pushFeed(state, "race", `Skipped round ${tour.rounds.length + 1}. It scores zero points.`);
      completeRound(state, null);
      return null;
    case "withdraw":
      if (!tour || currentTourEntry(state) !== "queued") return "Only a queued entry can be withdrawn.";
      if (tour.entryPlan) tour.entryPlan.enabled = false;
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
  if (tour.entryPlan) tour.entryPlan.enabled = false;
  logSeason(state, `retired:${tour.id}`, `Retired from the ${CHARTERS[tour.charter].name}.`);
}

export function recordOwnerFinish(state: GameState, spec: RaceSpec, result: RaceResult, entry: number): void {
  if (state.era && result.venueId === "state" && result.event === "feature" && result.position === 1 && !result.dnf) {
    state.meta.teamStateWon = true;
  }
  const tour = state.owner?.tour;
  if (!tour || tour.status !== "active" || spec.tourRound !== tourRoundToken(tour)) return;
  const stop = tourCalendar(tour)[tour.rounds.length];
  if (!stop || stop.venueId !== result.venueId || stop.event !== result.event || spec.vehicleUid !== result.vehicleUid) return;
  const car = state.run.vehicles.find((vehicle) => vehicle.uid === result.vehicleUid);
  if (!car || ownerClassBlocker(tour, car)) return;
  const finish = {
    raceId: result.id,
    vehicleUid: result.vehicleUid,
    carName: car.name,
    position: result.position,
    dnf: result.dnf,
    finance: { entry, prize: result.prize },
    setup: { engine: car.parts.engine?.partId, tires: car.parts.wheel?.partId, tune: car.tune, call: result.call },
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
  if (tour.entryPlan) tour.entryPlan.enabled = false;
  if (owner.records) creditOwnerRecord(owner.records, tour);
  else owner.records = ownerRecords(owner);
  const sponsorship = sponsorProgress(tour);
  if (tour.sponsor && sponsorship) {
    const sponsor = TOUR_SPONSORS[tour.sponsor];
    state.run.cash += sponsorship.payout;
    pushFeed(state, "race", sponsorship.payout
      ? `${sponsor.name} paid ${sponsorship.payout} Scrap Bucks, including your returned stake.`
      : `${sponsor.name}'s target was missed. Your stake was forfeited.`, { key: `championship-sponsor:${tour.id}` });
  }
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
