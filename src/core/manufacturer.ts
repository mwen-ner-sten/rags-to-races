import { earn, spend } from "./stats";
import { CLUB_COURSES, clubLoanOrigin, type ClubCourseId } from "./clubTrack";
import { getVenue } from "./content/events";
import { reservedPartUids, vehicleBusy } from "./garage";
import { enqueue, jobBlocker } from "./jobs";
import { logSeason } from "./journal";
import { nextUid } from "./rng";
import type { EventKind, GameState, JobSpec, PartInstance, RaceCall, RaceResult, Vehicle } from "./types";
import { EXPERIMENTAL_OFF, experimentalCareers } from "./features";

export interface WorksTest {
  venue: string;
  event: EventKind;
  call: RaceCall;
  place?: number;
  wearLimit?: number;
}

interface WorksDefinition {
  name: string;
  principles: string;
  parts: readonly string[];
  fee: number;
  budget: number;
  tests: readonly WorksTest[];
  grant: number;
  drawing: { input: string; output: string; material: "metal" | "rubber"; units: number; cash: number };
}

export const WORKS_FAMILIES = {
  redwheel: {
    name: "Redwheel Works", principles: "Power and low weight. Prove that this combination can reach the podium on two different courses.",
    parts: ["engine_v4", "engine_twin", "engine_turbo4", "wheel_kart", "wheel_sport", "frame_tube", "drive_chain", "drive_manual", "exhaust_glasspack", "exhaust_straight"],
    fee: 15, budget: 50,
    tests: [{ venue: "dirt", event: "heat", call: "push", place: 3 }, { venue: "county_fair", event: "sprint", call: "push", place: 3 }],
    grant: 35, drawing: { input: "engine_small", output: "engine_lawn", material: "metal", units: 2, cash: 8 },
  },
  longhaul: {
    name: "Longhaul Engineering", principles: "Durable components and mechanical sympathy. Finish the longer card and keep wear under control at the Fair.",
    parts: ["engine_tiller", "engine_v4", "engine_v6", "wheel_dirt", "wheel_knobby", "wheel_at", "frame_kart", "frame_steel", "fuel_tank_large", "drive_auto", "elec_basic"],
    fee: 20, budget: 60,
    tests: [{ venue: "dirt", event: "feature", call: "nurse" }, { venue: "county_fair", event: "sprint", call: "nurse", wearLimit: 1 }],
    grant: 45, drawing: { input: "wheel_basic", output: "wheel_knobby", material: "rubber", units: 1, cash: 5 },
  },
} as const satisfies Record<string, WorksDefinition>;

export type WorksFamily = keyof typeof WORKS_FAMILIES;
export const WORKS_HISTORY_LIMIT = 20;
export const WORKS_MAX_ATTEMPTS = 3;
export const WORKS_FAMILY_IDS = Object.keys(WORKS_FAMILIES) as WorksFamily[];
type RaceSpec = Extract<JobSpec, { kind: "race" }>;
const LOAN_ORIGINS = new Set((Object.keys(CLUB_COURSES) as ClubCourseId[]).map(clubLoanOrigin));

export interface WorksAttempt {
  raceId: string;
  step: number;
  spent: number;
  position: number;
  dnf: boolean;
  wear: number;
  passed: boolean;
}

export interface WorksDeal {
  id: string;
  season: number;
  family: WorksFamily;
  vehicleUid: string;
  article: string;
  engineUid: string;
  attempts: WorksAttempt[];
}

export interface ManufacturerState {
  invites: WorksFamily[];
  drawings: WorksFamily[];
  active: WorksDeal | null;
  history: (WorksDeal & { status: "homologated" | "failed" | "retired" })[];
  usedDrawingSeason?: number;
}

export type WorksMove =
  | { type: "sign"; family: WorksFamily; vehicleUid: string }
  | { type: "enter" }
  | { type: "archive" }
  | { type: "recast"; partUid: string };

export function worksFit(vehicle: Vehicle, family: WorksFamily): number {
  return Object.values(vehicle.parts).filter((part) => part && WORKS_FAMILIES[family].parts.some((id) => id === part.partId)).length;
}

function worksClass(vehicle: Vehicle): boolean {
  return vehicle.vehicleId === "go_kart" || vehicle.vehicleId === "beater_car";
}

function eligibleArticle(vehicle: Vehicle, family: WorksFamily): boolean {
  return vehicle.vehicleId === "go_kart" && !!vehicle.parts.engine && worksFit(vehicle, family) >= 3;
}

export function trialEntry(trial: WorksTest): number {
  return getVenue(trial.venue).events[trial.event].entry;
}

export function worksOutcome(test: WorksTest, result: Pick<WorksAttempt, "dnf" | "position" | "wear">): boolean {
  return !result.dnf && (test.place === undefined || result.position <= test.place) && (test.wearLimit === undefined || result.wear <= test.wearLimit);
}

export function worksReport(deal: WorksDeal) {
  const family = WORKS_FAMILIES[deal.family];
  const step = deal.attempts.filter(({ passed }) => passed).length;
  const spent = deal.attempts.reduce((sum, attempt) => sum + attempt.spent, 0);
  const next: WorksTest | undefined = family.tests[step];
  const homologated = !next;
  const failed = !!next && (deal.attempts.length >= WORKS_MAX_ATTEMPTS || spent + trialEntry(next) > family.budget);
  return { step, spent, next, homologated, failed };
}

function worksToken(deal: WorksDeal): string {
  return `${deal.id}:${deal.attempts.length}`;
}

export function worksEntryStatus(state: GameState): "queued" | "racing" | null {
  const deal = state.manufacturer?.active;
  if (!deal) return null;
  const token = worksToken(deal);
  const matches = (spec: JobSpec) => spec.kind === "race" && spec.worksRound === token;
  if (state.run.jobs.some(({ spec }) => matches(spec))) return "racing";
  return state.run.queue.some(matches) ? "queued" : null;
}

export function worksSpecMatches(state: GameState, spec: RaceSpec, car?: Vehicle, checkFittedArticle = true): boolean {
  const deal = state.manufacturer?.active;
  if (!deal || spec.worksRound !== worksToken(deal) || spec.tourRound || spec.tourReserve !== undefined || spec.clubRound || spec.countyMatch || spec.regularity || spec.useLastPace || spec.call2) return false;
  const report = worksReport(deal);
  const vehicle = car ?? state.run.vehicles.find(({ uid }) => uid === spec.vehicleUid);
  return Boolean(!report.failed && report.next && vehicle?.vehicleId === "go_kart" && vehicle.uid === deal.vehicleUid
    && (!checkFittedArticle || (vehicle.parts.engine?.uid === deal.engineUid && eligibleArticle(vehicle, deal.family)))
    && spec.venueId === report.next.venue && spec.event === report.next.event && spec.call === report.next.call);
}

export function worksPlanBlocker(state: GameState, plan?: WorksFamily): string | null {
  if (plan === undefined) return null;
  if (!experimentalCareers()) return EXPERIMENTAL_OFF;
  return state.manufacturer?.drawings.includes(plan) ? null : "Homologate that manufacturer’s article to use its drawing.";
}

export function worksSignBlocker(state: GameState, family: WorksFamily, vehicle?: Vehicle): string | null {
  if (!state.manufacturer?.invites.includes(family)) return "Earn this invitation with a County Fair Feature podium and two family parts.";
  if (state.manufacturer.active) return "File your current works deal before signing another.";
  if (!vehicle || !eligibleArticle(vehicle, family)) return "Choose a Go-Kart with an engine and three fitted family parts.";
  if (vehicleBusy(state, vehicle.uid)) return "Wait for this car’s current race to finish.";
  if (state.run.cash < WORKS_FAMILIES[family].fee) return `Inspection costs ${WORKS_FAMILIES[family].fee} Scrap Bucks.`;
  return null;
}

function officialSpec(deal: WorksDeal, next: WorksTest): RaceSpec {
  return { kind: "race", venueId: next.venue, event: next.event, call: next.call, vehicleUid: deal.vehicleUid, worksRound: worksToken(deal) };
}

export function worksEnterBlocker(state: GameState): string | null {
  const deal = state.manufacturer?.active;
  if (!deal) return "Sign a works deal first.";
  const { next, failed } = worksReport(deal);
  if (!next || failed) return "The deal has finished. File the report.";
  if (worksEntryStatus(state)) return "An official works start is already booked.";
  const spec = officialSpec(deal, next);
  if (!worksSpecMatches(state, spec)) return "Fit the signed engine and three family parts to this article.";
  return jobBlocker(state, spec, true);
}

export function archiveWorks(state: GameState): void {
  const works = state.manufacturer;
  const deal = works?.active;
  if (!works || !deal) return;
  const report = worksReport(deal);
  works.history.unshift({ ...deal, status: report.homologated ? "homologated" : report.failed ? "failed" : "retired" });
  works.history.splice(WORKS_HISTORY_LIMIT);
  works.active = null;
}

export function worksStock(part: PartInstance, family: WorksFamily): boolean {
  return part.partId === WORKS_FAMILIES[family].drawing.input && part.condition > 0 && !part.inherited && !LOAN_ORIGINS.has(part.origin);
}

export function worksRecastBlocker(state: GameState, partUid?: string): string | null {
  const plan = state.config.worksPlan;
  if (!plan || !state.manufacturer?.drawings.includes(plan)) return "Select an earned drawing at Scrap Reset.";
  if (state.manufacturer.usedDrawingSeason === state.meta.seasonsPlayed + 1) return "This Season’s drawing has been used.";
  const recipe = WORKS_FAMILIES[plan].drawing;
  const part = state.run.inventory.find(({ uid }) => uid === partUid);
  if (!part || !worksStock(part, plan)) return "Choose an uninstalled, usable workshop part of the specified type.";
  if (reservedPartUids(state).has(part.uid)) return "This part is reserved by another job.";
  if (state.run.cash < recipe.cash || state.run.materials[recipe.material] < recipe.units) return `Needs ${recipe.cash} Scrap Bucks and ${recipe.units} ${recipe.material}.`;
  return null;
}

export function applyWorks(state: GameState, move: WorksMove): string | null {
  if (!experimentalCareers()) return EXPERIMENTAL_OFF;
  const works = state.manufacturer;
  switch (move.type) {
    case "sign": {
      const vehicle = state.run.vehicles.find(({ uid }) => uid === move.vehicleUid);
      const reason = worksSignBlocker(state, move.family, vehicle);
      if (reason) return reason;
      const manufacturer = WORKS_FAMILIES[move.family];
      spend(state, manufacturer.fee);
      works!.active = { id: nextUid(state, "works"), season: state.meta.seasonsPlayed + 1, family: move.family, vehicleUid: vehicle!.uid, article: vehicle!.name, engineUid: vehicle!.parts.engine!.uid, attempts: [] };
      return null;
    }
    case "enter": {
      const reason = worksEnterBlocker(state);
      if (reason) return reason;
      const deal = works!.active!;
      return enqueue(state, officialSpec(deal, worksReport(deal).next!));
    }
    case "archive":
      if (worksEntryStatus(state)) return "Withdraw the queued sign-up or wait for the flag before filing the report.";
      if (!works?.active) return "No current works deal.";
      archiveWorks(state);
      return null;
    case "recast": {
      const reason = worksRecastBlocker(state, move.partUid);
      if (reason) return reason;
      const family = WORKS_FAMILIES[state.config.worksPlan!];
      const { drawing } = family;
      const part = state.run.inventory.find(({ uid }) => uid === move.partUid)!;
      spend(state, drawing.cash);
      state.run.materials[drawing.material] -= drawing.units;
      part.partId = drawing.output;
      part.origin = `${family.name} drawing`;
      works!.usedDrawingSeason = state.meta.seasonsPlayed + 1;
      state.meta.codex.parts[part.partId] = (state.meta.codex.parts[part.partId] ?? 0) + 1;
      return null;
    }
  }
}

export function recordWorksRace(state: GameState, spec: RaceSpec, result: RaceResult, paidEntry: number): void {
  if (!experimentalCareers()) return;
  const vehicle = state.run.vehicles.find(({ uid }) => uid === result.vehicleUid);
  if (!vehicle || spec.vehicleUid !== result.vehicleUid) return;
  if (!spec.worksRound) {
    if (!spec.clubRound && !spec.tourRound && !spec.regularity && worksClass(vehicle) && result.venueId === "county_fair" && result.event === "feature" && !result.dnf && result.position <= 3) {
      for (const family of WORKS_FAMILY_IDS) {
        if (worksFit(vehicle, family) < 2 || state.manufacturer?.invites.includes(family)) continue;
        const works = state.manufacturer ??= { active: null, invites: [], drawings: [], history: [] };
        works.invites.push(family);
        logSeason(state, `works:invite:${family}`, `${WORKS_FAMILIES[family].name} invited ${vehicle.name} to commission a proof article. Open Manufacturer to see the contract.`);
      }
    }
    return;
  }
  const works = state.manufacturer;
  const deal = works?.active;
  if (!works || !deal || !worksSpecMatches(state, spec, vehicle)) return;
  const { next, step } = worksReport(deal);
  const proof = { position: result.position, dnf: result.dnf, wear: result.wear.reduce((sum, wear) => sum + wear.from - wear.to, 0) };
  deal.attempts.push({ raceId: result.id, step, spent: paidEntry, ...proof, passed: worksOutcome(next!, proof) });
  if (!worksReport(deal).homologated) return;
  const maker = WORKS_FAMILIES[deal.family];
  earn(state, maker.grant);
  if (!works.drawings.includes(deal.family)) works.drawings.push(deal.family);
  const key = `works:honors:${deal.id}`;
  logSeason(state, key, `${maker.name} homologated ${deal.article}. Its drawing is available in a future Scrap Reset.`, key);
}
