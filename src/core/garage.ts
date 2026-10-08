import { channel } from "./channels";
import { CONDITION_STAT, CONDITION_VALUE, REPAIR_COST, STRIP_YIELD, getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import type { Condition, DrivewayRule, GameState, MaterialId, PartInstance, TuneSetting, Vehicle } from "./types";

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

type SaleSat = GameState["run"]["saleSat"];

function satFrom(state: GameState, sat: SaleSat, partId: string): number {
  const entry = sat[partId];
  if (!entry) return 0;
  return Math.max(0, entry.n - (state.run.seasonMs - entry.at) / HOUR);
}

/** How saturated the dealer is with this part right now (decays 1 per hour). */
export function saturation(state: GameState, partId: string): number {
  return satFrom(state, state.run.saleSat, partId);
}

function sellValueAt(state: GameState, part: PartInstance, sat: number): number {
  const def = getPart(part.partId);
  const glut = 1 / (1 + 0.15 * sat);
  return Math.max(1, Math.round(def.value * CONDITION_VALUE[part.condition] * channel(state, "sell_value") * glut));
}

/** The dealer pays less for a part they've just bought a pile of. */
export function partSellValue(state: GameState, part: PartInstance): number {
  return sellValueAt(state, part, saturation(state, part.partId));
}

/** Prices a batch sale one part at a time, as `sellParts` does, writing the dealer's new saturation into `sat`. */
function priceBatch(state: GameState, parts: PartInstance[], sat: SaleSat): number {
  let earned = 0;
  for (const part of parts) {
    const n = satFrom(state, sat, part.partId);
    earned += sellValueAt(state, part, n);
    sat[part.partId] = { n: n + 1, at: state.run.seasonMs };
  }
  return earned;
}

/** What selling these parts together would pay, without selling them. */
export function saleQuote(state: GameState, parts: PartInstance[]): number {
  return priceBatch(state, parts, { ...state.run.saleSat });
}

/** Sells parts one at a time so saturation applies within a batch. Returns Scrap Bucks earned. */
export function sellParts(state: GameState, parts: PartInstance[]): number {
  const earned = priceBatch(state, parts, state.run.saleSat);
  const uids = new Set(parts.map((p) => p.uid));
  state.run.inventory = state.run.inventory.filter((p) => !uids.has(p.uid));
  state.run.driveway = state.run.driveway.filter((p) => !uids.has(p.uid));
  state.run.cash += earned;
  return earned;
}

/** Parts Counter price: three times Good value. */
export function counterPrice(partId: string): number {
  return getPart(partId).value * 3;
}

export type BenchKind = "clean" | "repair" | "restore" | "strip";
type Materials = Partial<Record<MaterialId, number>>;

/** Materials stripping this part gives back (Scrap parts give half, at least 1 each). */
export function stripYield(part: PartInstance): Materials {
  const mult = part.condition === 0 ? 0.5 : 1;
  const out: Materials = {};
  for (const [m, n] of Object.entries(STRIP_YIELD[getPart(part.partId).category])) out[m as MaterialId] = Math.max(1, Math.round((n ?? 0) * mult));
  return out;
}

/** Materials a repair or restore uses up when it starts (Restore costs double). */
export function benchCost(part: PartInstance, kind: BenchKind): Materials {
  if (kind !== "repair" && kind !== "restore") return {};
  const mult = kind === "restore" ? 2 : 1;
  return Object.fromEntries(Object.entries(REPAIR_COST[getPart(part.partId).category]).map(([m, n]) => [m, (n ?? 0) * mult]));
}

/** The condition a bench job leaves the part in (null = it doesn't change it, or the part is gone). */
export function conditionAfter(kind: BenchKind, condition: Condition): Condition | null {
  if (kind === "clean") return condition <= 1 ? ((condition + 1) as Condition) : null;
  if (kind === "repair") return condition <= 2 ? 3 : null;
  if (kind === "restore") return condition === 3 ? 4 : null;
  return null;
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

/** How many finds can wait on the driveway before the driveway rule deals with the rest. */
export const DRIVEWAY_SPACE = 6;

export const DRIVEWAY_RULES: readonly { id: DrivewayRule; name: string; text: string }[] = [
  { id: "strip_sell", name: "Strip junk, then sell", text: "junk is stripped for materials, then the cheapest parts are sold" },
  { id: "sell", name: "Sell the cheapest", text: "the cheapest parts are sold" },
  { id: "strip", name: "Strip everything", text: "the cheapest parts are stripped for materials" },
  { id: "leave", name: "Leave them at the curb", text: "the newest finds are left at the curb" },
];

/** The driveway rule in force: the default until Sorting is learned, then the player's pick. */
export function drivewayRule(state: GameState): DrivewayRule {
  return state.run.learned.includes("tech:sorting") ? (state.meta.drivewayRule ?? "strip_sell") : "strip_sell";
}

export function garageSpace(state: GameState): number {
  return Math.floor(channel(state, "storage"));
}

/** Puts finds in the garage while there's room (best first), the rest on the driveway; clears an overflowing driveway by the rule. */
export function stowFinds(state: GameState, finds: PartInstance[]): void {
  state.run.driveway.push(...finds);
  fillFromDriveway(state);
  clearDriveway(state);
}

/** Moves waiting finds into the garage whenever there's room, most valuable first. */
export function fillFromDriveway(state: GameState): void {
  const room = garageSpace(state) - state.run.inventory.length;
  if (room <= 0 || state.run.driveway.length === 0) return;
  const reserved = reservedPartUids(state);
  const moving = state.run.driveway
    .filter((p) => !reserved.has(p.uid))
    .sort((a, b) => partSellValue(state, b) - partSellValue(state, a))
    .slice(0, room);
  const uids = new Set(moving.map((p) => p.uid));
  state.run.driveway = state.run.driveway.filter((p) => !uids.has(p.uid));
  state.run.inventory.push(...moving);
}

/** The garage part a swap would send out to the driveway: the cheapest one not on the bench. */
export function swapOutCandidate(state: GameState): PartInstance | null {
  const reserved = reservedPartUids(state);
  return state.run.inventory.filter((p) => !reserved.has(p.uid)).sort((a, b) => partSellValue(state, a) - partSellValue(state, b))[0] ?? null;
}

function partNames(parts: PartInstance[]): string {
  return parts.map((p) => getPart(p.partId).name).join(", ");
}

/** Applies the driveway rule to whatever the driveway can't hold, and leaves a notice saying what went. */
function clearDriveway(state: GameState): void {
  const over = state.run.driveway.length - DRIVEWAY_SPACE;
  if (over <= 0) return;
  state.run.stats.drivewayOverflows = (state.run.stats.drivewayOverflows ?? 0) + 1;
  const rule = drivewayRule(state);
  if (rule === "leave") {
    const left = state.run.driveway.splice(state.run.driveway.length - over, over);
    state.run.notices.push(`Driveway full: left ${partNames(left)} at the curb.`);
    return;
  }
  const reserved = reservedPartUids(state);
  const junkFirst = (p: PartInstance) => (rule === "strip_sell" && getPart(p.partId).category === "junk" ? 0 : 1);
  const picked = state.run.driveway
    .filter((p) => !reserved.has(p.uid))
    .sort((a, b) => junkFirst(a) - junkFirst(b) || partSellValue(state, a) - partSellValue(state, b))
    .slice(0, over);
  const strip = picked.filter((p) => rule === "strip" || junkFirst(p) === 0);
  const sell = picked.filter((p) => !strip.includes(p));
  const said: string[] = [];
  if (strip.length > 0) {
    const got: Partial<Record<MaterialId, number>> = {};
    for (const part of strip) for (const [m, n] of Object.entries(stripYield(part))) got[m as MaterialId] = (got[m as MaterialId] ?? 0) + (n ?? 0);
    for (const [m, n] of Object.entries(got)) state.run.materials[m as MaterialId] += n ?? 0;
    const uids = new Set(strip.map((p) => p.uid));
    state.run.driveway = state.run.driveway.filter((p) => !uids.has(p.uid));
    said.push(`stripped ${partNames(strip)} for ${Object.entries(got).map(([m, n]) => `${n} ${m}`).join(", ")}`);
  }
  if (sell.length > 0) said.push(`sold ${partNames(sell)} for ${sellParts(state, sell)} Scrap Bucks`);
  if (said.length > 0) state.run.notices.push(`Driveway full: ${said.join("; ")}.`);
}
