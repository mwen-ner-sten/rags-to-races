import { spend } from "./stats";
import { CLUB_COURSES, clubLoanOrigin, type ClubCourseId } from "./clubTrack";
import { COUNTY_RIVAL_IDS, countyLoanOrigin } from "./countyRivals";
import { getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import { garageSpace, reservedPartUids, vehicleBusy, vehicleStats } from "./garage";
import { logSeason } from "./journal";
import { WORKS_FAMILIES, WORKS_FAMILY_IDS } from "./manufacturer";
import { nextUid } from "./rng";
import { hasServiceReference } from "./serviceShop";
import { detachGarageVehicle } from "./vehicleArchive";
import type { Condition, GameState, PartInstance, Vehicle } from "./types";
import { EXPERIMENTAL_OFF, experimentalCareers } from "./features";

const MINUTE = 60_000;

export const MOTOR_ROUTES = {
  ramp: { name: "Ramp depot", tender: "wheel", reward: "frame_kart", cost: 5, minutes: 28, wear: "wheel" },
  pump: { name: "Pump station", tender: "engine", reward: "engine_tiller", cost: 10, minutes: 42, wear: "engine" },
} as const;

export type MotorRouteId = keyof typeof MOTOR_ROUTES;
export const MOTOR_ROUTE_IDS = Object.keys(MOTOR_ROUTES) as MotorRouteId[];
const TEMPORARY_ORIGINS = new Set([
  ...(Object.keys(CLUB_COURSES) as ClubCourseId[]).map(clubLoanOrigin),
  ...COUNTY_RIVAL_IDS.map(countyLoanOrigin),
  ...WORKS_FAMILY_IDS.map((family) => `${WORKS_FAMILIES[family].name} drawing`),
]);

interface MotorCustody {
  rig: Vehicle;
  completed: MotorRouteId[];
}

interface MotorClaim {
  route: MotorRouteId;
  part: PartInstance;
}

interface MotorJob extends MotorClaim {
  tender: PartInstance;
  remaining: number;
  duration: number;
}

export interface MotorPoolState {
  lastLodgedSeason: number;
  ledger: { season: number; booked: MotorRouteId[] };
  custody: MotorCustody | null;
  job: MotorJob | null;
  claim: MotorClaim | null;
}

export type MotorPoolMove =
  | { type: "lodge"; vehicleUid: string }
  | { type: "book"; route: MotorRouteId; tenderUid: string }
  | { type: "fit"; slot: string; partUid: string }
  | { type: "claim" }
  | { type: "reclaim" };

export function motorPoolVisible(game: GameState): boolean {
  return experimentalCareers() && (!!game.motorPool || (hasServiceReference(game) && game.run.vehicles.some(motorModel)));
}

export function motorModel(vehicle: Vehicle): boolean {
  return vehicle.vehicleId === "riding_mower" || vehicle.vehicleId === "service_runabout" || vehicle.vehicleId === "beater_car";
}

export function motorWearSlot(rig: Vehicle, route: MotorRouteId): string {
  return route === "ramp" && rig.vehicleId === "service_runabout" ? "rear_wheel" : MOTOR_ROUTES[route].wear;
}

export function motorOwnStock(part: PartInstance): boolean {
  return !part.inherited && !part.batonGuard && !TEMPORARY_ORIGINS.has(part.origin);
}

function roadworthy(rig: Vehicle): boolean {
  return getVehicle(rig.vehicleId).slots.every(({ slot, required }) => !required || (rig.parts[slot]?.condition ?? 0) > 0);
}

export function motorLodgeBlocker(game: GameState, vehicleUid: string): string | null {
  if (!motorPoolVisible(game)) return "Earn a customer reference in a relocated shop and build a depot rig.";
  if (game.motorPool?.custody) return "The depot already holds a rig.";
  if (game.motorPool?.lastLodgedSeason === game.meta.seasonsPlayed + 1) return "The depot takes one rig per Season.";
  const rig = game.run.vehicles.find(({ uid }) => uid === vehicleUid);
  if (!rig || !motorModel(rig) || !roadworthy(rig)) return "Choose a roadworthy Riding Mower, Service Runabout, or Beater.";
  if (vehicleBusy(game, vehicleUid) || game.run.raceNight?.vehicleUid === vehicleUid
    || game.run.queue.some((spec) => spec.kind === "race" && spec.vehicleUid === vehicleUid)) return "Clear this rig’s race bookings before lodging it.";
  if (game.owner?.tour.status === "active" && game.owner.tour.rounds.some((result) => result?.vehicleUid === vehicleUid)) return "Finish this rig’s active Owner tour first.";
  if (game.manufacturer?.active?.vehicleUid === vehicleUid) return "File the rig’s works deal before lodging it.";
  if (game.promoter?.meet?.guest.uid === vehicleUid) return "Close the Circuit calendar using this guest first.";
  if (Object.values(rig.parts).some((part) => part?.batonGuard)) return "Pull the safeguarded County Baton part before lodging the rig.";
  if (Object.values(rig.parts).some((part) => part && !motorOwnStock(part))) return "Remove inherited, drawing, or loaned parts first. Only wholly owned stock can cross through the depot.";
  return null;
}

export function motorTenderCandidates(game: GameState, route: MotorRouteId): PartInstance[] {
  const reserved = reservedPartUids(game);
  return game.run.inventory.filter((part) => motorOwnStock(part) && part.condition >= 2 && getPart(part.partId).category === MOTOR_ROUTES[route].tender
    && !reserved.has(part.uid) && part.uid !== game.run.serviceBook?.ticket?.partUid);
}

export function motorOrigin(route: MotorRouteId): string {
  return `County Motor Pool · ${MOTOR_ROUTES[route].name}`;
}

export function motorDuration(rig: Vehicle, route: MotorRouteId): number {
  const stats = vehicleStats(rig);
  const relevant = route === "ramp" ? stats.handling + stats.traction * 3 : stats.power + stats.reliability;
  const equipment = getVehicle(rig.vehicleId).carry / 35 + relevant / (route === "ramp" ? 60 : 145);
  return Math.round(MOTOR_ROUTES[route].minutes * MINUTE / (1 + Math.min(1.5, equipment)));
}

export function motorBookBlocker(game: GameState, route: MotorRouteId, tenderUid?: string): string | null {
  const pool = game.motorPool;
  const rig = pool?.custody?.rig;
  if (!pool || !rig) return "Lodge a rig at the depot first.";
  if (!Object.hasOwn(MOTOR_ROUTES, route)) return "Choose a depot route.";
  if (pool.job || pool.claim) return "Finish the active run and collect its stock before booking again.";
  if (pool.ledger.season === game.meta.seasonsPlayed + 1 && pool.ledger.booked.includes(route)) return "This route has a booking this Season.";
  if (!roadworthy(rig)) return "Fit usable equipment to every required slot.";
  const definition = MOTOR_ROUTES[route];
  const wearSlot = motorWearSlot(rig, route);
  if ((rig.parts[wearSlot]?.condition ?? 0) < 2) return `Fit a Worn or better ${wearSlot.replace("_", " ")} to the rig for this route.`;
  if (!motorTenderCandidates(game, route).some(({ uid }) => uid === tenderUid)) return `Provide an unreserved loose ${definition.tender} in Worn or better condition.`;
  if (game.run.cash < definition.cost) return `The depot route costs ${definition.cost} Scrap Bucks.`;
  return null;
}

export function motorFitCandidates(game: GameState, slot: string): PartInstance[] {
  const rig = game.motorPool?.custody?.rig;
  const compatible = rig && getVehicle(rig.vehicleId).slots.find((entry) => entry.slot === slot);
  if (!compatible) return [];
  const reserved = reservedPartUids(game);
  return game.run.inventory.filter((part) => motorOwnStock(part) && compatible.accepts.includes(part.partId) && part.condition >= (compatible.minCondition ?? 1)
    && !reserved.has(part.uid) && part.uid !== game.run.serviceBook?.ticket?.partUid);
}

export function motorReclaimBlocker(game: GameState): string | null {
  const pool = game.motorPool;
  if (!pool?.custody) return "There is no rig to reclaim.";
  if (pool.job || pool.claim) return "Finish the current run and collect its stock first.";
  if (pool.lastLodgedSeason !== game.meta.seasonsPlayed + 1 && !MOTOR_ROUTE_IDS.every((route) => pool.custody!.completed.includes(route))) return "Complete both depot routes before reclaiming the rig.";
  return null;
}

export function applyMotorPool(game: GameState, move: MotorPoolMove): string | null {
  if (!experimentalCareers()) return EXPERIMENTAL_OFF;
  if (move.type === "lodge") {
    const issue = motorLodgeBlocker(game, move.vehicleUid);
    if (issue) return issue;
    const rig = game.run.vehicles.find(({ uid }) => uid === move.vehicleUid)!;
    const season = game.meta.seasonsPlayed + 1;
    const pool = game.motorPool ??= { lastLodgedSeason: season, ledger: { season, booked: [] }, custody: null, job: null, claim: null };
    pool.lastLodgedSeason = season;
    pool.custody = { rig, completed: [] };
    detachGarageVehicle(game, rig.uid);
    logSeason(game, `motor-pool:lodge:${rig.uid}`, `${rig.name} entered County Motor Pool custody.`);
    return null;
  }
  const pool = game.motorPool;
  if (!pool?.custody) return "Lodge a rig at the depot first.";
  const { rig } = pool.custody;
  switch (move.type) {
    case "book": {
      const issue = motorBookBlocker(game, move.route, move.tenderUid);
      if (issue) return issue;
      const tender = game.run.inventory.find(({ uid }) => uid === move.tenderUid)!;
      const definition = MOTOR_ROUTES[move.route];
      const duration = motorDuration(rig, move.route);
      const season = game.meta.seasonsPlayed + 1;
      if (pool.ledger.season !== season) pool.ledger = { season, booked: [] };
      pool.ledger.booked.push(move.route);
      game.run.inventory = game.run.inventory.filter(({ uid }) => uid !== tender.uid);
      spend(game, definition.cost);
      pool.job = { route: move.route, tender, duration, remaining: duration,
        part: { uid: nextUid(game, "p"), partId: definition.reward, condition: 2, origin: motorOrigin(move.route) } };
      return null;
    }
    case "fit": {
      if (pool.job) return "The crew cannot swap parts on the road.";
      const part = motorFitCandidates(game, move.slot).find(({ uid }) => uid === move.partUid);
      if (!part) return "Choose a compatible loose part that is available to the depot.";
      const previous = rig.parts[move.slot];
      game.run.inventory = game.run.inventory.filter(({ uid }) => uid !== part.uid);
      rig.parts[move.slot] = part;
      if (previous) game.run.inventory.push(previous);
      return null;
    }
    case "claim": {
      if (!pool.claim) return "There is no stock waiting at the depot.";
      if (game.run.inventory.length >= garageSpace(game)) return "Free a garage slot for the depot stock.";
      const { part, route } = pool.claim;
      const receipts = game.run.depotReceipts ??= [];
      if (!receipts.includes(route)) receipts.push(route);
      game.run.inventory.push(part);
      game.meta.codex.parts[part.partId] = (game.meta.codex.parts[part.partId] ?? 0) + 1;
      pool.claim = null;
      return null;
    }
    case "reclaim": {
      const issue = motorReclaimBlocker(game);
      if (issue) return issue;
      game.run.vehicles.push(rig);
      pool.custody = null;
      logSeason(game, `motor-pool:reclaim:${rig.uid}`, `${rig.name} returned from the County Motor Pool with its service wear.`);
      return null;
    }
  }
}

export function advanceMotorPool(game: GameState, elapsed: number): void {
  const pool = game.motorPool;
  if (!experimentalCareers() || !pool?.job || !pool.custody || !Number.isFinite(elapsed) || elapsed <= 0) return;
  const job = pool.job;
  if (elapsed < job.remaining) {
    job.remaining -= elapsed;
    return;
  }
  const slot = motorWearSlot(pool.custody.rig, job.route);
  const part = pool.custody.rig.parts[slot]!;
  part.condition = Math.max(0, part.condition - 1) as Condition;
  if (!pool.custody.completed.includes(job.route)) pool.custody.completed.push(job.route);
  pool.claim = { route: job.route, part: job.part };
  pool.job = null;
}
