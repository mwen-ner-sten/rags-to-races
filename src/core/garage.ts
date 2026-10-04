import { channel } from "./channels";
import { CONDITION_STAT, CONDITION_VALUE, getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import type { GameState, PartInstance, TuneSetting, Vehicle } from "./types";

export interface Stats {
  power: number;
  handling: number;
  reliability: number;
  weight: number;
}

const TUNE: Record<TuneSetting, { power: number; reliability: number }> = {
  balanced: { power: 1, reliability: 1 },
  power: { power: 1.12, reliability: 0.85 },
  reliable: { power: 0.95, reliability: 1.2 },
};

export function vehicleStats(vehicle: Vehicle): Stats {
  const def = getVehicle(vehicle.vehicleId);
  const stats: Stats = { ...def.base };
  for (const part of Object.values(vehicle.parts)) {
    if (!part) continue;
    const p = getPart(part.partId);
    const m = CONDITION_STAT[part.condition];
    stats.power += p.power * m;
    stats.handling += p.handling * m;
    stats.reliability += p.reliability * m;
    stats.weight += p.weight;
  }
  const tune = TUNE[vehicle.tune];
  stats.power *= tune.power;
  stats.reliability *= tune.reliability;
  return stats;
}

const HOUR = 3_600_000;

/** How saturated the dealer is with this part right now (decays 1 per hour). */
export function saturation(state: GameState, partId: string): number {
  const entry = state.run.saleSat[partId];
  if (!entry) return 0;
  return Math.max(0, entry.n - (state.run.seasonMs - entry.at) / HOUR);
}

/** The dealer pays less for a part they've just bought a pile of. */
export function partSellValue(state: GameState, part: PartInstance): number {
  const def = getPart(part.partId);
  const glut = 1 / (1 + 0.15 * saturation(state, part.partId));
  return Math.max(1, Math.round(def.value * CONDITION_VALUE[part.condition] * channel(state, "sell_value") * glut));
}

/** Sells parts one at a time so saturation applies within a batch. Returns Scrap Bucks earned. */
export function sellParts(state: GameState, parts: PartInstance[]): number {
  let earned = 0;
  for (const part of parts) {
    earned += partSellValue(state, part);
    state.run.saleSat[part.partId] = { n: saturation(state, part.partId) + 1, at: state.run.seasonMs };
  }
  const uids = new Set(parts.map((p) => p.uid));
  state.run.inventory = state.run.inventory.filter((p) => !uids.has(p.uid));
  state.run.cash += earned;
  return earned;
}

/** Parts Counter price: three times Good value. */
export function counterPrice(partId: string): number {
  return getPart(partId).value * 3;
}

/** Parts reserved by running jobs (being cleaned, repaired, stripped or assembled). */
export function reservedPartUids(state: GameState): Set<string> {
  const reserved = new Set<string>();
  for (const job of state.run.jobs) {
    const spec = job.spec;
    if ((spec.kind === "clean" || spec.kind === "repair" || spec.kind === "restore" || spec.kind === "strip") && spec.partUid) reserved.add(spec.partUid);
    if (spec.kind === "assemble") for (const uid of Object.values(spec.partUids)) reserved.add(uid);
  }
  for (const spec of state.run.queue) {
    if ((spec.kind === "clean" || spec.kind === "repair" || spec.kind === "restore" || spec.kind === "strip") && spec.partUid) reserved.add(spec.partUid);
    if (spec.kind === "assemble") for (const uid of Object.values(spec.partUids)) reserved.add(uid);
  }
  return reserved;
}

export function vehicleBusy(state: GameState, vehicleUid: string): boolean {
  return state.run.jobs.some((j) => j.spec.kind === "race" && j.spec.vehicleUid === vehicleUid);
}

export function storageUsed(state: GameState): number {
  return state.run.inventory.length;
}

/** Sells the lowest-value parts until inventory fits storage. Returns Scrap Bucks earned. */
export function enforceStorage(state: GameState): number {
  const cap = Math.floor(channel(state, "storage"));
  if (state.run.inventory.length <= cap) return 0;
  const reserved = reservedPartUids(state);
  const sellable = state.run.inventory.filter((p) => !reserved.has(p.uid)).sort((a, b) => partSellValue(state, a) - partSellValue(state, b));
  const over = state.run.inventory.length - cap;
  const toSell = sellable.slice(0, over);
  const earned = sellParts(state, toSell);
  if (toSell.length > 0) state.run.notices.push(`Garage full: sold ${toSell.length} part${toSell.length > 1 ? "s" : ""} off the top of the pile for ${earned} Scrap Bucks.`);
  return earned;
}
