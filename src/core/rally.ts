import { vehicleStats } from "./garage";
import { rand, randNormal } from "./rng";
import type { EventKind, GameState, JobSpec, RaceBeat, Vehicle } from "./types";
import type { Opponent } from "./race";
import { STAGE_COUNT, totalTime, tripmeterAvailable, type RallyPace } from "./timecards";
import type { CourseSurface } from "./clubTrack";

const SURFACES = ["fast lane", "switchbacks", "loose gravel", "broken road"] as const;
type Surface = typeof SURFACES[number];
export { STAGE_COUNT } from "./timecards";
const FIRST: Record<string, number> = { backyard: 0, dirt: 2, county_fair: 1, regional: 3, state: 2 };
export function rallyRoute(venueId: string, event: EventKind, stages?: readonly CourseSurface[]): Surface[] {
  if (stages) return stages.slice(0, STAGE_COUNT[event]);
  return Array.from({ length: STAGE_COUNT[event] }, (_, index) => SURFACES[((FIRST[venueId] ?? 0) + index) % SURFACES.length]);
}
type RallySpec = Extract<JobSpec, { kind: "race" }>;
const CUT_CHANCE = 0.22;
const CUT_COST = 0.14;

function surfaceModifiers(vehicle: Vehicle): Record<Surface, number> {
  const { power, handling, traction, reliability } = vehicleStats(vehicle);
  const mean = Math.max(1, (power + handling + traction * 3 + reliability) / 4);
  const factor = (stat: number) => 0.84 + 0.16 * Math.min(2, stat / mean);
  return { "fast lane": factor(power), switchbacks: factor(handling), "loose gravel": factor(traction * 3), "broken road": factor(reliability) };
}

export function rallyExpectedPace(vehicle: Vehicle, venueId: string, event: EventKind, call: RallySpec["call2"], stages?: readonly CourseSurface[]): number {
  const route = rallyRoute(venueId, event, stages);
  const modifiers = surfaceModifiers(vehicle);
  const time = route.reduce((sum, surface) => sum + 1 / modifiers[surface], 0);
  return (route.length / time) * (call === "recce" ? 1.015 : call === "cut" ? 1.027 : 1);
}

/** Integrate over the player's shared finishing time, then compare each independent rival clock. */
export function rallyWinForecast(car: Vehicle, venue: string, event: EventKind, call: RallySpec["call2"], pace: number, field: number, opponents: readonly Opponent[], cdf: (n: number) => number, stages?: readonly CourseSurface[]): number {
  const route = rallyRoute(venue, event, stages);
  const factors = surfaceModifiers(car);
  const cut = call === "cut";
  const speed = call === "recce" ? 1.015 : cut ? 1.06 : 1;
  const variation = call === "recce" ? 0.035 : 0.085;
  let ownTime = 0, ownVariance = 0, length = 0, squaredLength = 0;
  for (const [i, surface] of route.entries()) {
    const segment = 50 + i * 7;
    length += segment;
    squaredLength += segment ** 2;
    const time = segment * field / (pace * speed * factors[surface]);
    ownTime += time * (1 + variation ** 2) + (cut ? segment * CUT_COST * CUT_CHANCE : 0);
    ownVariance += (time * variation) ** 2 + (cut ? (segment * CUT_COST) ** 2 * CUT_CHANCE * (1 - CUT_CHANCE) : 0);
  }
  const clocks = opponents.map((opp) => {
    const scale = field / Math.max(.1, opp.score);
    const deviation = 0.085 * opp.variation;
    return { mean: length * scale * (1 + deviation ** 2), sd: Math.max(.0001, Math.sqrt(squaredLength) * scale * deviation), out: opp.out };
  });
  // Equal-mass standard-normal bins, sampled at each bin's midpoint.
  const samples = [-1.863,-1.318,-1.01,-.776,-.579,-.402,-.237,-.078,.078,.237,.402,.579,.776,1.01,1.318,1.863];
  const sd = Math.sqrt(ownVariance);
  return samples.reduce((sum, z) => sum + clocks.reduce((p, clock) =>
    p * (clock.out + (1 - clock.out) * cdf((clock.mean - ownTime - z * sd) / clock.sd)), 1), 0) / samples.length;
}

/** Every competitor has a separate clock. Classification uses the sum of the actual timed sections. */
export function rallySplits(state: GameState, spec: RallySpec, car: Vehicle, dnf: boolean, base: number, field: number, rivals: readonly Opponent[], durationMs: number, stages?: readonly CourseSurface[], reference?: RallyPace) {
  const route = rallyRoute(spec.venueId, spec.event, stages);
  const modifiers = surfaceModifiers(car);
  const useTripmeter = spec.regularity && spec.holdMarks && reference && tripmeterAvailable(car);
  const runners = rivals.map((driver) => ({ driver, time: 0, out: driver.out > 0 && rand(state) < driver.out }));
  const beats: RaceBeat[] = [{ at: 0, position: 1, kind: "start", text: "The marshal starts your clock. The other cars leave at intervals." }];
  const failedStage = dnf ? Math.floor(rand(state) * route.length) : -1;
  let time = 0;
  const splitsMs: number[] = [];
  let previousTime = 0;
  const fieldSize = runners.length + 1;
  for (const [index, surface] of route.entries()) {
    const nominal = 50 + index * 7;
    for (const runner of runners) {
      const pace = Math.max(0.1, runner.driver.score * (1 + 0.085 * runner.driver.variation * randNormal(state)));
      runner.time += nominal * field / pace;
    }
    if (dnf && index > failedStage) continue;
    const at = durationMs * (index + 1) / route.length;
    if (index === failedStage) {
      beats.push({ at, position: fieldSize, kind: "dnf", text: `Retired on stage ${index + 1}, ${surface}.` });
      continue;
    }
    const cut = spec.call2 === "cut";
    const notes = spec.call2 === "recce";
    const penalty = cut && rand(state) < CUT_CHANCE ? nominal * CUT_COST : 0;
    const pace = base * modifiers[surface] * (notes ? 1.015 : cut ? 1.06 : 1) * (1 + (notes ? 0.035 : 0.085) * randNormal(state));
    const flatOut = nominal * field / Math.max(0.1, pace) + penalty;
    // A tripmeter lets the driver lift before a control. It can never recover time already lost.
    const target = useTripmeter ? reference.splitsMs[index] / 1000 : 0;
    const split = Math.max(flatOut, target * 0.99);
    const lifted = split - flatOut;
    time += split;
    splitsMs.push(Math.max(1, Math.round(split * 1000)));
    previousTime += (reference?.splitsMs[index] ?? 0) / 1000;
    const delta = time - previousTime;
    const ghost = reference ? ` ${Math.abs(delta).toFixed(1)}s ${delta > 0 ? "behind" : "ahead of"} ${reference.carName}’s card.` : "";
    const position = 1 + runners.filter((r) => !r.out && r.time < time).length;
    beats.push({ at, position, kind: "hold", text: `Stage ${index + 1}, ${surface} · ${split.toFixed(1)}s${penalty ? " including a corner-cut penalty" : ""}.${lifted > 0.05 ? " Lifted for " + lifted.toFixed(1) + "s at the time control." : ""} Overall P${position}.${ghost}` });
  }
  const finishers = runners.filter((r) => !r.out);
  const times = [...finishers.map((r) => r.time), ...(dnf ? [] : [time])].sort((a, b) => a - b);
  const position = dnf ? fieldSize : times.indexOf(time) + 1;
  const referenceTime = position === 1 ? times[1] : times[position - 2];
  const margin = !dnf && referenceTime ? (referenceTime - time) / referenceTime : 0;
  if (!dnf) beats.push({ at: durationMs, kind: "finish", position, text: `Time control · ${time.toFixed(1)}s across ${route.length} stages. Finished P${position}.` });
  const rival = runners.find((r) => r.driver.rival);
  return { beats, position, margin, fieldSize, laps: route.length, rallyClock: { splitsMs, ...(reference && { previousMs: totalTime(reference.splitsMs), previousCar: reference.carName, referenceSplitsMs: [...reference.splitsMs], referenceSeason: reference.season }) }, rivalFaced: !!rival, rivalOut: !!rival?.out,
    rivalBeaten: !!rival && !dnf && (rival.out || time < rival.time),
    places: runners.map((r) => ({ position: r.out ? fieldSize : times.indexOf(r.time) + 1, dnf: r.out })),
    winningGap: times.length >= 2 ? (times[1] - times[0]) / times[1] : null };
}
