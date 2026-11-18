import { z } from "zod";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { MOTOR_ROUTES, MOTOR_ROUTE_IDS, motorDuration, motorModel, motorOrigin, motorOwnStock } from "@/core/motorPool";
import type { GameState, PartInstance, Vehicle } from "@/core/types";

const route = z.enum(MOTOR_ROUTE_IDS);
const season = z.number().int().positive();
const time = z.number().positive();

export function motorPoolSchema(vehicle: z.ZodType<Vehicle>, part: z.ZodType<PartInstance>) {
  const pickup = z.object({ route, part });
  return z.object({
    lastLodgedSeason: season,
    ledger: z.object({ season, booked: z.array(route).max(MOTOR_ROUTE_IDS.length) }),
    custody: z.object({ rig: vehicle, completed: z.array(route).max(MOTOR_ROUTE_IDS.length) }).nullable(),
    job: pickup.extend({ tender: part, duration: time, remaining: time }).nullable(),
    claim: pickup.nullable(),
  });
}

export function motorPoolReferencesValid(game: GameState): boolean {
  const pool = game.motorPool;
  if (!pool) return true;
  const season = game.meta.seasonsPlayed + 1;
  if (!game.meta.serviceReferences?.equipment || !game.meta.serviceReferences.referral || pool.lastLodgedSeason > season || pool.ledger.season > season) return false;
  if (new Set(pool.ledger.booked).size !== pool.ledger.booked.length || (pool.job && pool.claim)) return false;
  if (!pool.custody) return !pool.job && !pool.claim;
  const { rig, completed } = pool.custody;
  if (!motorModel(rig) || new Set(completed).size !== completed.length) return false;
  if (game.run.vehicles.some(({ uid }) => uid === rig.uid) || game.meta.hallOfFame.some(({ retirement }) => retirement?.vehicleUid === rig.uid)) return false;
  if (game.manufacturer?.active?.vehicleUid === rig.uid || game.promoter?.meet?.guest.uid === rig.uid
    || (game.owner?.tour.status === "active" && game.owner.tour.rounds.some((result) => result?.vehicleUid === rig.uid))) return false;
  if (game.run.raceNight?.vehicleUid === rig.uid || [...game.run.queue, ...game.run.jobs.map(({ spec }) => spec)].some((spec) => spec.kind === "race" && spec.vehicleUid === rig.uid)) return false;

  const slots = getVehicle(rig.vehicleId).slots;
  if (slots.some(({ slot, required }) => required && !rig.parts[slot])) return false;
  const rigParts = Object.entries(rig.parts);
  if (rigParts.some(([slot, part]) => !part || !motorOwnStock(part) || !slots.some((entry) => entry.slot === slot && entry.accepts.includes(part.partId)))) return false;
  const garage = new Set([...game.run.inventory, ...game.run.driveway, ...game.run.vehicles.flatMap(({ parts }) => Object.values(parts))].map((part) => part?.uid));
  const outOfGarage = [...rigParts.map(([, part]) => part), ...(pool.job ? [pool.job.part, pool.job.tender] : []), ...(pool.claim ? [pool.claim.part] : [])];
  if (outOfGarage.some((part) => !part || garage.has(part.uid) || (part.provenance && part.provenance.season > season))
    || new Set(outOfGarage.map((part) => part?.uid)).size !== outOfGarage.length) return false;

  const pickup = pool.job ?? pool.claim;
  if (pickup) {
    if (pool.ledger.season < pool.lastLodgedSeason || !pool.ledger.booked.includes(pickup.route)) return false;
    const { part, route } = pickup;
    if (part.partId !== MOTOR_ROUTES[route].reward || part.condition !== 2 || part.origin !== motorOrigin(route) || part.inherited || part.provenance || part.referral) return false;
  }
  if (pool.claim && !completed.includes(pool.claim.route)) return false;
  if (!pool.job) return true;
  const { tender, route, duration, remaining } = pool.job;
  return motorOwnStock(tender) && tender.condition >= 2 && getPart(tender.partId).category === MOTOR_ROUTES[route].tender
    && remaining <= duration && duration === motorDuration(rig, route) && (rig.parts[MOTOR_ROUTES[route].wear]?.condition ?? 0) >= 2;
}
