import type { ClubCourseId } from "./clubTrack";
import type { EventKind, GameState, Vehicle } from "./types";
import { VENUES, venueName } from "./content/events";
import { logSeason } from "./journal";
import { pushFeed } from "./feed";

export interface RallyClock {
  splitsMs: number[];
  previousMs?: number;
  referenceSplitsMs?: number[];
  referenceSeason?: number;
  previousCar?: string;
  regularity?: { matched: number; required: number; passed: boolean };
}
export interface RallyPace {
  splitsMs: number[];
  carName: string;
  season: number;
}
export interface RallyCard extends RallyPace {
  lastRun?: RallyPace;
  venueId: string;
  event: EventKind;
  vehicleId: string;
  course?: ClubCourseId;
}

export const totalTime = (splitsMs: readonly number[]) => splitsMs.reduce((a, b) => a + b, 0);

/** Wall-clock replay time uses equal segments. Compare the two cars at the same simulated stage time. */
export function referencePosition(clock: RallyClock, stages: number, progress: number): number | undefined {
  const reference = clock.referenceSplitsMs;
  if (!reference || reference.length !== stages) return;
  const distance = Math.max(0, Math.min(clock.splitsMs.length, progress * stages));
  const stage = Math.floor(distance);
  let elapsed = totalTime(clock.splitsMs.slice(0,stage)) + (clock.splitsMs[stage] ?? 0) * (distance-stage);
  for (const [index, split] of reference.entries()) {
    if (elapsed <= split) return (index + elapsed/split)/stages;
    elapsed -= split;
  }
  return 1;
}

export function cardFor(game: GameState, venueId: string, event: EventKind, vehicleId: string, course?: ClubCourseId): RallyCard | undefined {
  return game.meta.rallyCards?.find((card) => card.venueId === venueId && card.event === event && card.vehicleId === vehicleId && card.course === course);
}

/** Only complete, faster official attempts replace a class time. Circuit exhibitions run on a separate clock. */
export function bankRallyTime(game: GameState, car: Vehicle, venueId: string, event: EventKind, course: ClubCourseId | undefined, splitsMs: number[]) {
  const previous = cardFor(game, venueId, event, car.vehicleId, course);
  if (previous && totalTime(previous.splitsMs) < totalTime(splitsMs)) {
    previous.lastRun = { splitsMs: [...splitsMs], carName: car.name, season: game.meta.seasonsPlayed + 1 };
    return;
  }
  if (previous) delete previous.lastRun;
  const record = { venueId, event, vehicleId: car.vehicleId, course, splitsMs: [...splitsMs], carName: car.name, season: game.meta.seasonsPlayed + 1 };
  if (previous) Object.assign(previous, record);
  else (game.meta.rallyCards ??= []).push(record);
}

export function judgeRegularity(splits: readonly number[], reference: RallyPace, dnf: boolean) {
  const matched = splits.filter((ms, i) => Math.abs(ms - reference.splitsMs[i]) <= reference.splitsMs[i] * 0.08).length;
  const required = reference.splitsMs.length;
  return { matched, required, passed: !dnf && matched === required };
}

export function stampRallyFeature(game: GameState, venueId: string) {
  const earned = game.run.regularityFeatures ??= {};
  if (earned[venueId] !== undefined) return;
  earned[venueId] = game.run.seasonMs;
  const licences = game.meta.rallyLicences ??= {};
  const season = game.meta.seasonsPlayed + 1;
  const priorSeason = licences[venueId] ?? season;
  licences[venueId] = priorSeason;
  logSeason(game, `regularity:${venueId}`, `Matched every stage at ${venueName(venueId, "rally")}. The stewards stamped your regularity licence.`);
  for (const next of VENUES) {
    if (next.opens.type !== "feature" || next.opens.venueId !== venueId || game.run.venuesOpen.includes(next.id)) continue;
    if (next.opens.invitation && priorSeason === season && game.meta.records[venueId] === undefined) {
      pushFeed(game, "race", "Repeat this certificate in another Season to take the State Forest invitation.");
      continue;
    }
    game.run.venuesOpen.push(next.id);
    game.run.ladder[next.id] ??= ["sprint"];
    pushFeed(game, "race", `Regularity licence accepted at ${venueName(next.id, "rally")}.`);
  }
}

export function rallyReferencesValid(game: GameState): boolean {
  const season = game.meta.seasonsPlayed + 1;
  const cards = game.meta.rallyCards ?? [];
  const keys = cards.map((card) => [card.venueId, card.event, card.vehicleId, card.course ?? ""].join("/"));
  if (new Set(keys).size !== keys.length || cards.some((card) => card.season > season || (card.lastRun && card.lastRun.season > season))) return false;
  if (Object.values(game.meta.rallyLicences ?? {}).some((first) => first > season)) return false;
  if (Object.keys(game.run.regularityFeatures ?? {}).some((venue) => game.era?.discipline !== "rally" || !game.meta.rallyLicences?.[venue])) return false;
  for (const spec of [...game.run.queue, ...game.run.jobs.map((job) => job.spec)]) {
    if (spec.kind !== "race") continue;
    if (spec.useLastPace && !spec.regularity) return false;
    if (!spec.regularity) continue;
    const car = game.run.vehicles.find((vehicle) => vehicle.uid === spec.vehicleUid);
    if (!car || game.era?.discipline !== "rally" || spec.clubRound || spec.tourRound || spec.worksRound || !cardFor(game, spec.venueId, spec.event, car.vehicleId)) return false;
  }
  return game.run.jobs.every((job) => job.spec.kind !== "race" || !job.race ||
    Boolean(job.spec.regularity) === Boolean(job.race.rallyClock?.regularity));
}
