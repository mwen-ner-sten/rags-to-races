/**
 * Reset layers as data. A layer declares its gate, what it awards, which
 * scopes it clears, and which choices the player makes. performReset() is
 * the only reset function; adding a layer is adding an entry here.
 */
import { channel } from "./channels";
import { countyChoiceBlocker } from "./counties";
import { batonChoicesBlocker, freightBlocker, FREIGHT_COST, type BatonChoice } from "./countyBaton";
import type { CountyRivalId } from "./countyRivals";
import { CREW, BASE_CREW_CAP, TEAM_ORGANIZATIONS, crewLevel, type TeamOrganization } from "./content/team";
import { crewTravelBlocker, teamOrganization } from "./crew";
import { acceptHandover, APPRENTICE_JOBS, applyCrewHandover, crewCanApprentice, crewHandoverOffers, handoverId, HANDOVER_COST, type CrewHandoverChoice } from "./crewLegacy";
import { DARE_BY_ID, HARDSHIP_BY_ID, PERK_BY_ID, isSeasonChallenge, seasonObjectiveConflict } from "./content/modifiers";
import { VENUES, getVenue } from "./content/events";
import { getVehicle } from "./content/vehicles";
import { syncHabitSlots, templateBase } from "./habits";
import { afterChange, dispatch } from "./jobs";
import { STORY, addJournal } from "./journal";
import { learn } from "./knowhowEngine";
import { allDaresCompleted, perkUnlocked, refreshPerkUnlocks } from "./perks";
import { forfeitOwnerTour } from "./ownership";
import { disciplineBlocker } from "./content/events";
import { archiveClubSeason, clubChoicesBlocker, startClubSeason, type ClubCharter } from "./club";
import type { ClubCourseId } from "./clubTrack";
import { archiveWorks, worksPlanBlocker, type WorksFamily } from "./manufacturer";
import { nextUid } from "./rng";
import { hasPerk } from "./rules";
import { salvageCarryBlocker, salvageCarryCandidates } from "./salvageCarry";
import { initialConfig, initialRun, initialScrap } from "./state";
import { archiveVehicle } from "./vehicleArchive";
import type { DisciplineId, EraState, GameState, HomeCounty, PartInstance, RunConfig, Scope, SkillId } from "./types";

import { sameShopLegacy, depotCharter, workshopCharterOnly, shopFoundingReady, shopMoveReady, transferBlocker, type ShopLegacy } from "./serviceShop";

export type LayerId = "scrap" | "team" | "shop";

export interface ScrapChoices {
  shopLegacy?: ShopLegacy;
  /** Perk ranks to buy with Legacy Points before equipping (repeat an id to buy several ranks). */
  buy?: string[];
  perks: string[];
  tuneUp: Record<SkillId, number>;
  dare: string | null;
  hardships: string[];
  retainedPartUid?: string;
  homeCounty?: HomeCounty;
  countyBaton?: BatonChoice;
  countyFreight?: true;
  club?: ClubCharter;
  clubCourse?: ClubCourseId;
  clubLoan?: ClubCourseId;
  clubVisitor?: CountyRivalId;
  worksPlan?: WorksFamily;
}

export interface TeamChoices extends ScrapChoices {
  organization?: TeamOrganization;
  handover?: CrewHandoverChoice;
  discipline: DisciplineId;
  teamName: string;
  colors: [string, string];
  keepCrewId?: string | null;
}

export interface GateStatus {
  ok: boolean;
  reason: string | null;
}

export interface LayerDef<C> {
  id: LayerId;
  name: string;
  clears: Scope[];
  gate: (state: GameState) => GateStatus;
  /** Points this reset would award right now. */
  award: (state: GameState) => number;
  validate: (state: GameState, choices: C) => string | null;
  /** Runs after scopes are cleared: grant the award, apply choices. */
  apply: (state: GameState, award: number, choices: C, before: GameState) => void;
}

const SKILLS: SkillId[] = ["haul", "wrench", "build", "race"];

/** LP for the Season so far: Feature milestones plus record bonuses. */
export function scrapAward(state: GameState): number {
  let total = 0;
  for (const venue of VENUES) {
    const at = state.run.featureWins[venue.id];
    if (at === undefined) {
      if (state.run.regularityFeatures?.[venue.id] !== undefined) total += Math.ceil(venue.lp / 2);
      continue;
    }
    let lp = venue.lp;
    const best = state.meta.records[venue.id];
    if (best !== undefined && at < best) lp *= 1.25;
    total += lp;
  }
  return Math.round(total * channel(state, "legacy_gain"));
}

export function teamAward(state: GameState): number {
  const depotCredit = depotCharter(state) ? 4 : 0;
  if (!state.era) return depotCredit + 10 + Math.floor((state.scrap.lifetimeLp + scrapAward(state)) / 20);
  const milestones = new Set([...state.era.milestones, ...Object.keys(state.run.featureWins)]);
  let tp = 0;
  for (const venueId of milestones) tp += getVenue(venueId).tp;
  const legends = new Set([...state.era.legends, ...state.era.crew.filter((c) => crewLevel(c.jobsDone) >= 5).map((c) => c.id)]);
  return depotCredit + tp + 5 * state.era.hardshipsCompleted + 10 * legends.size;
}

export function perkSlots(state: GameState): number {
  return Math.floor(channel(state, "perk_slots")) - (state.config.salvageSlot ? 1 : 0);
}

/** Perk slots the next Season will have after a Scrap Reset (counts this Season's deep wins). */
export function nextSeasonPerkSlots(state: GameState, retainingPart = false): number {
  const fresh = ["regional", "state"].filter((v) => state.run.featureWins[v] !== undefined && !state.scrap.milestonesThisEra.includes(v)).length;
  return Math.floor(channel(state, "perk_slots")) + fresh - (retainingPart ? 1 : 0);
}

/** Deep-run slots restart with the team; the once-ever Dare reward is permanent. */
export function nextTeamPerkSlots(state: GameState): number {
  return 2 + (state.team.upgrades.legacy_ledger ?? 0) + ((state.meta.hardshipMastery.rookie_plates ?? 0) > 0 ? 1 : 0) + (allDaresCompleted(state) ? 1 : 0);
}

/** Tune-up points available after a Scrap Reset. */
export function nextSeasonTuneUpPoints(state: GameState): number {
  return state.scrap.tuneUpPoints + firstEverMilestones(state).length + (state.scrap.resets === 0 && !state.era ? 5 : 0);
}

export function hardshipCap(state: GameState): number {
  const done = Object.values(state.meta.hardshipMastery).reduce((a, b) => a + b, 0);
  return Math.min(4, 2 + Math.floor(done / 3));
}

/** Simulates perk purchases; returns the resulting ranks or an error. */
export function planPurchases(state: GameState, buy: string[], lpAvailable: number): { ranks: Record<string, number>; lpLeft: number } | string {
  const ranks = { ...state.meta.perks };
  let lp = lpAvailable;
  for (const id of buy) {
    const perk = PERK_BY_ID[id];
    if (!perk) return `Unknown perk ${id}`;
    if (!perkUnlocked(state, perk)) return `${perk.name} isn't on the shelf yet`;
    const rank = ranks[id] ?? 0;
    if (rank >= perk.maxRank) return `${perk.name} is already at max rank`;
    const cost = perk.cost[rank];
    if (lp < cost) return `Not enough Legacy Points for ${perk.name}`;
    lp -= cost;
    ranks[id] = rank + 1;
  }
  return { ranks, lpLeft: lp };
}

export const BUILDER_LOADOUTS = {
  salvage: { name: "Salvage runs", note: "Tow earlier and bring back bigger loads. Bench work gets no tune-up points.", perks: ["borrowed_trailer", "tow_hitch"], primary: "haul", secondary: "build" },
  workshop: { name: "Workshop nights", note: "Repair rusted parts directly and work faster on the bench while away. Trips keep their usual speed.", perks: ["shade_tree", "night_owl"], primary: "wrench", secondary: "build" },
  kart: { name: "Go-Kart first", note: "Open Dirt and the trailer yard before a race. Fund trip fees, Welding and assembly by selling and stripping finds.", perks: ["dirt_track_pass", "borrowed_trailer"], primary: "haul", secondary: "wrench" },
} as const;

export function planBuilderLoadout(state: GameState, route: keyof typeof BUILDER_LOADOUTS, slots: number, points: number, lpAvailable: number, pending: string[]) {
  const draft = BUILDER_LOADOUTS[route];
  if (draft.perks.length > slots) return `Needs ${draft.perks.length} perk slots`;
  const current = planPurchases(state, pending, lpAvailable);
  if (typeof current === "string") return current;
  const buy = [...pending, ...draft.perks.filter((id) => !(current.ranks[id] > 0))];
  const purchase = planPurchases(state, buy, lpAvailable);
  if (typeof purchase === "string") return purchase;
  const tuneUp: Record<SkillId, number> = { haul: 0, wrench: 0, build: 0, race: 0 };
  tuneUp[draft.secondary] = Math.floor(points / 3);
  tuneUp[draft.primary] = points - tuneUp[draft.secondary];
  return { buy, perks: [...draft.perks], tuneUp, lpCost: current.lpLeft - purchase.lpLeft };
}

export function teamResetLegacyBudget(state: GameState): number {
  return state.scrap.lp + scrapAward(state);
}

export function scrapResetLegacyBudget(state: GameState, freight = false): number {
  return state.scrap.lp + scrapAward(state) - (freight ? FREIGHT_COST : 0);
}

function validateScrapChoices(state: GameState, choices: ScrapChoices, slots: number, tuneUpPoints: number, teamEra: boolean, lpAvailable: number, discipline: DisciplineId): string | null {
  const plan = planPurchases(state, choices.buy ?? [], lpAvailable);
  if (typeof plan === "string") return plan;
  const unique = new Set(choices.perks);
  if (unique.size !== choices.perks.length) return "A perk is equipped twice";
  if (choices.perks.length > slots) return `Only ${slots} perk slot${slots === 1 ? "" : "s"}`;
  for (const id of choices.perks) {
    if (!PERK_BY_ID[id]) return `Unknown perk ${id}`;
    if ((plan.ranks[id] ?? 0) < 1) return `You don't own ${PERK_BY_ID[id].name}`;
  }
  for (const k of SKILLS) {
    const v = choices.tuneUp[k] ?? 0;
    if (!Number.isInteger(v) || v < 0) return "Tune-up points are whole numbers";
  }
  const spent = SKILLS.reduce((sum, k) => sum + (choices.tuneUp[k] ?? 0), 0);
  if (spent > tuneUpPoints) return `Only ${tuneUpPoints} tune-up points`;
  if (choices.dare && !isSeasonChallenge(choices.dare)) {
    if (!Object.hasOwn(DARE_BY_ID, choices.dare)) return "Unknown Season objective";
    if (state.meta.daresCompleted.includes(choices.dare)) return "You've already done that dare";
  }
  if (choices.hardships.length > 0 && !teamEra) return "Hardships open up once you found a team";
  if (choices.hardships.length > hardshipCap(state)) return `Up to ${hardshipCap(state)} hardships`;
  for (const id of choices.hardships) if (!HARDSHIP_BY_ID[id]) return `Unknown hardship ${id}`;
  if (new Set(choices.hardships).size !== choices.hardships.length) return "A hardship is picked twice";
  return seasonObjectiveConflict(choices.hardships, choices.dare, discipline);
}

function toConfig(choices: ScrapChoices): RunConfig {
  return {
    perks: [...choices.perks],
    tuneUp: { haul: choices.tuneUp.haul ?? 0, wrench: choices.tuneUp.wrench ?? 0, build: choices.tuneUp.build ?? 0, race: choices.tuneUp.race ?? 0 },
    dare: choices.dare,
    hardships: [...choices.hardships],
    ...(choices.retainedPartUid && !choices.countyFreight ? { salvageSlot: true } : {}),
    ...(choices.countyFreight ? { countyFreight: true } : {}),
    ...(choices.homeCounty && choices.homeCounty !== "home" && { homeCounty: choices.homeCounty }),
    ...(choices.club && { club: choices.club }),
    ...(choices.clubCourse && { clubCourse: choices.clubCourse }),
    ...(choices.clubLoan && { clubLoan: choices.clubLoan }),
    ...(choices.clubVisitor && { clubVisitor: choices.clubVisitor }),
    ...(choices.worksPlan && { worksPlan: choices.worksPlan }),
  };
}

export const SCRAP_LAYER: LayerDef<ScrapChoices> = {
  id: "scrap",
  name: "Scrap Reset",
  clears: ["run", "config"],
  gate: (s) => ((s.run.featureWins.county_fair !== undefined || s.run.regularityFeatures?.county_fair !== undefined) ? { ok: true, reason: null } : { ok: false, reason: s.era?.discipline === "rally" ? "Win or earn a regularity certificate at the County Forest Feature" : "Win the County Fair Feature" }),
  award: scrapAward,
  validate: (s, c) => {
    if (c.shopLegacy && !sameShopLegacy(c.shopLegacy, s.config.shopLegacy)) return "Transfer your business through a Shop Move.";
    const county = c.homeCounty ?? s.config.homeCounty ?? "home";
    const baton = batonChoicesBlocker(s, c.countyBaton, county, c.retainedPartUid, c.dare, !!c.countyFreight);
    if (baton) return baton;
    const budget = scrapResetLegacyBudget(s, !!c.countyFreight);
    if (c.countyFreight) {
      const freight = freightBlocker(s, county, c.retainedPartUid);
      if (freight) return freight;
      if (budget < 0) return `County freight costs ${FREIGHT_COST} Legacy Points`;
    }
    const branchBlocked = countyChoiceBlocker(s, c.homeCounty) ?? clubChoicesBlocker(s, c.club, c.clubCourse, c.clubLoan, c.clubVisitor) ?? worksPlanBlocker(s, c.worksPlan);
    if (branchBlocked) return branchBlocked;
    if (c.retainedPartUid) {
      const blocked = salvageCarryBlocker(s, c.retainedPartUid, c.hardships);
      if (blocked) return blocked;
    }
    return validateScrapChoices(s, c, nextSeasonPerkSlots(s, !!c.retainedPartUid && !c.countyFreight), nextSeasonTuneUpPoints(s), s.era !== null, budget, s.era?.discipline ?? "dirt");
  },
  apply: (s, award, choices, before) => {
    s.scrap.lp += award - (choices.countyFreight ? FREIGHT_COST : 0);
    s.scrap.lifetimeLp += award;
    s.scrap.resets += 1;
    buyPerks(s, choices.buy ?? []);
    s.config = toConfig({ ...choices, homeCounty: choices.homeCounty ?? before.config.homeCounty });
    if (choices.countyBaton === "start" && s.config.homeCounty && s.config.homeCounty !== "home") s.run.countyBaton = { leg: "qualify", from: s.config.homeCounty };
    if (choices.countyBaton === "carry" && before.run.countyBaton?.leg === "qualify" && before.run.countyBaton.qualified) {
      const { from, qualified } = before.run.countyBaton;
      s.run.countyBaton = { leg: "deliver", from, qualified: { ...qualified } };
    }
    if (choices.retainedPartUid) {
      const retained = salvageCarryCandidates(before).find(({ part }) => part.uid === choices.retainedPartUid)!.part;
      s.config.donor = { partId: retained.partId, condition: retained.condition, origin: retained.origin, ...(retained.provenance && { provenance: { ...retained.provenance } }) };
      s.run.inventory.push({ ...retained, inherited: true });
    }
  },
};

export const TEAM_LAYER: LayerDef<TeamChoices> = {
  id: "team",
  name: "Team Reset",
  clears: ["run", "config", "scrap", "era"],
  gate: (s) => {
    if (depotCharter(s)) return { ok: true, reason: null };
    if (!s.era) return (s.meta.stateWonEver || shopFoundingReady(s)) ? { ok: true, reason: null } : { ok: false, reason: "Win the State Invitational Feature or qualify for a Workshop Collective through the service counter" };
    return (s.run.featureWins.county_fair !== undefined || s.run.regularityFeatures?.county_fair !== undefined) ? { ok: true, reason: null } : { ok: false, reason: s.era?.discipline === "rally" ? "Win or certify the County Forest Feature this Season" : "Win the County Fair Feature this Season" };
  },
  award: teamAward,
  validate: (s, c) => {
    if (c.countyBaton || c.countyFreight) return "County Baton and freight are available at Scrap Reset";
    if (c.shopLegacy && !sameShopLegacy(c.shopLegacy, s.config.shopLegacy)) return "Transfer your business through a Shop Move.";
    if (workshopCharterOnly(s) && c.organization !== "collective") return "The service counter charter founds a Workshop Collective.";
    if (c.organization !== undefined && !Object.hasOwn(TEAM_ORGANIZATIONS, c.organization)) return "Pick a team organization";
    if (c.retainedPartUid) return "Salvage carryover is only available on Scrap Reset";
    if (c.homeCounty !== undefined) return "Choose a home county on Scrap Reset";
    if (c.club !== undefined || c.clubCourse !== undefined || c.clubLoan !== undefined || c.clubVisitor !== undefined) return "Found a club on Scrap Reset to keep your team.";
    if (c.worksPlan !== undefined) return "Select your works drawing on Scrap Reset.";
    if (c.discipline !== "dirt" && c.discipline !== "drag" && c.discipline !== "rally") return "Pick a discipline";
    const locked = disciplineBlocker(s, c.discipline);
    if (locked) return locked;
    if (!c.teamName.trim()) return "Name your team";
    if (c.keepCrewId && !(s.team.upgrades.old_hands ?? 0)) return "You need Old Hands to keep a crew member";
    const handover = c.handover;
    if (handover) {
      if (c.keepCrewId === handover.mentorId) return "Choose whether this crew member leaves a handover or stays with Old Hands.";
      if (!crewHandoverOffers(s, c.discipline).some((offer) => handoverId(offer) === handoverId(handover))) {
        return "Choose a handover earned by your current crew for this discipline.";
      }
      if (s.team.tp + teamAward(s) < HANDOVER_COST) return `A crew handover costs ${HANDOVER_COST} Team Points.`;
    }
    // After a Team Reset the Scrap layer starts over: 2 base slots (+ team upgrades), 5 tune-up points.
    const slots = nextTeamPerkSlots(s);
    return validateScrapChoices(s, c, slots, 5, true, teamResetLegacyBudget(s), c.discipline);
  },
  apply: (s, award, choices, before) => {
    // Bank the ending Season once so players can spend its LP before the era balance clears.
    s.scrap.lp = teamResetLegacyBudget(before);
    s.scrap.lifetimeLp += scrapAward(before);
    buyPerks(s, choices.buy ?? []);
    s.scrap.lp = 0;
    s.team.tp += award;
    if (choices.handover) s.team.tp -= HANDOVER_COST;
    s.team.lifetimeTp += award;
    s.team.resets += 1;
    s.meta.totalTeamResets += 1;
    s.scrap.tuneUpPoints = 5;
    const kept = choices.keepCrewId ? before.era?.crew.find((c) => c.id === choices.keepCrewId) : undefined;
    const era: EraState = {
      organization: choices.organization ?? before.era?.organization ?? "independent",
      handover: choices.handover ? acceptHandover(choices.handover, choices.discipline) : undefined,
      discipline: choices.discipline,
      teamName: choices.teamName.trim().slice(0, 40),
      colors: choices.colors,
      crew: kept ? [{ ...kept, assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0 }] : [],
      milestones: [],
      hardshipsCompleted: 0,
      legends: [],
      seasonIndex: 0,
    };
    s.era = era;
    s.config = toConfig({ ...choices, homeCounty: before.config.homeCounty });
    addJournal(s, "founding", STORY.founding);
  },
};

function buyPerks(state: GameState, buy: string[]): void {
  const plan = planPurchases(state, buy, state.scrap.lp);
  if (typeof plan === "string") return;
  state.meta.perks = plan.ranks;
  state.scrap.lp = plan.lpLeft;
}

export const SHOP_LAYER: LayerDef<ScrapChoices> = {
  id: "shop",
  name: "Shop Move",
  clears: ["run", "config"],
  gate: (game) => shopMoveReady(game) ? { ok: true, reason: null } : { ok: false, reason: "Fill the three service invoices and build a Riding Mower or larger hauler." },
  award: () => 0,
  validate: (game, choices) => choices.countyBaton || choices.countyFreight
    ? "County Baton and freight are available at Scrap Reset"
    : transferBlocker(game, choices.shopLegacy),
  apply: (game, _award, choices, before) => {
    const legacy = choices.shopLegacy!;
    game.config = { ...initialConfig(), shopLegacy: legacy, homeCounty: before.config.homeCounty };
    if (legacy.type === "tool") game.run.tools[legacy.tool] = 1;
  },
};

export const LAYERS = { scrap: SCRAP_LAYER, team: TEAM_LAYER, shop: SHOP_LAYER } as const;

function firstEverMilestones(state: GameState): string[] {
  return Object.keys(state.run.featureWins).filter((v) => !state.scrap.milestonesThisEra.includes(v));
}

/** Banks everything a Season earned into longer-lived scopes. Shared by every reset. */
function commitSeason(state: GameState, layer: LayerId): void {
  const meta = state.meta;
  for (const id of state.run.learned) meta.knowhow[id] = (meta.knowhow[id] ?? 0) + 1;
  for (const template of state.run.habitsKnown) {
    if ((state.run.reps[template] ?? 0) > 0) meta.habitMemory[template] = (meta.habitMemory[template] ?? 0) + 1;
  }
  const top = Object.entries(state.run.reps).filter(([t]) => state.run.habitsKnown.includes(t)).sort((a, b) => b[1] - a[1])[0];
  meta.lastTopHabit = top ? top[0] : meta.lastTopHabit;
  for (const vehicle of state.run.vehicles) archiveVehicle(state, vehicle);
  const newThisEra = firstEverMilestones(state);
  for (const [venueId, at] of Object.entries(state.run.featureWins)) {
    meta.records[venueId] = Math.min(meta.records[venueId] ?? Infinity, at);
    if (!meta.milestonesEver.includes(venueId)) meta.milestonesEver.push(venueId);
  }
  state.scrap.tuneUpPoints += newThisEra.length + (layer !== "shop" && state.scrap.resets === 0 && !state.era ? 5 : 0);
  state.scrap.milestonesThisEra.push(...newThisEra);
  if (state.era) {
    for (const venueId of Object.keys(state.run.featureWins)) if (!state.era.milestones.includes(venueId)) state.era.milestones.push(venueId);
    if (state.run.featureWins.county_fair !== undefined) {
      const d = state.era.discipline;
      meta.disciplineMastery[d] = (meta.disciplineMastery[d] ?? 0) + 1 + (state.run.featureWins.state !== undefined ? 1 : 0);
    }
    for (const member of state.era.crew) if (crewLevel(member.jobsDone) >= 5 && !state.era.legends.includes(member.id)) state.era.legends.push(member.id);
    state.era.seasonIndex += 1;
  }
  meta.seasonsPlayed += 1;
  refreshPerkUnlocks(state);
}

/** Sets up a fresh Season from the config and long-lived scopes. */
export function startSeason(state: GameState): void {
  const { run, config, meta } = state;
  if (hasPerk(state, "dirt_track_pass")) learn(state, "place:dirt");
  if (config.perks.includes("scavengers_map") && !config.hardships.includes("rookie_plates")) learn(state, "place:long_haul");
  if (config.perks.includes("kid_brother") && meta.lastTopHabit && !config.hardships.includes("rookie_plates") && !config.hardships.includes("hand_tools")) {
    run.habitsKnown.push(templateBase(meta.lastTopHabit));
  }
  if (config.perks.includes("barn_find") && !config.hardships.includes("rookie_plates")) {
    learn(state, "blueprint:riding_mower");
    const def = getVehicle("riding_mower");
    const parts: Record<string, PartInstance> = {
      engine: { uid: nextUid(state, "p"), partId: "engine_lawn", condition: 1, origin: "The barn" },
      wheel: { uid: nextUid(state, "p"), partId: "wheel_basic", condition: 1, origin: "The barn" },
      frame: { uid: nextUid(state, "p"), partId: "frame_mower", condition: 1, origin: "The barn" },
    };
    run.vehicles.push({ uid: nextUid(state, "v"), vehicleId: def.id, name: "Barn Find", parts, tune: "balanced", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 });
  }
  applyCrewHandover(state);
  if (state.era) {
    for (const member of state.era.crew) {
      member.windowStartMs = 0;
      member.workedInWindowMs = 0;
      member.morale = 100;
      if (member.assignment.type === "habit" && (
        !run.habitsKnown.includes(templateBase(member.assignment.template)) || crewTravelBlocker(state, member.assignment.template)
      )) member.assignment = { type: "queue" };
    }
  }
  if (state.era && !config.hardships.includes("solo")) {
    const hired = new Set(state.era.crew.map((c) => c.id));
    const handover = state.era.handover;
    const training = handover?.type === "apprenticeship" && handover.completed < APPRENTICE_JOBS ? handover : undefined;
    const pool = CREW.filter((c) => !hired.has(c.id) && c.id !== training?.mentorId);
    const start = (state.era.seasonIndex * 3 + meta.totalTeamResets) % Math.max(1, pool.length);
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    const candidates = rotated.slice(0, 3);
    const availableMechanic = (candidate: typeof CREW[number]) => candidate.role === "wrench"
      && (!training || crewCanApprentice(state, candidate.id, training.routine));
    if (teamOrganization(state) === "collective" && !candidates.some(availableMechanic)) {
      const mechanic = rotated.find(availableMechanic) ?? rotated.find((candidate) => candidate.role === "wrench");
      if (mechanic) candidates[2] = mechanic;
    }
    if (training && ![...state.era.crew, ...candidates].some((member) => crewCanApprentice(state, member.id, training.routine))) {
      const successor = rotated.find((candidate) => crewCanApprentice(state, candidate.id, training.routine));
      if (successor) candidates[0] = successor;
    }
    run.candidates = candidates.map(({ id }) => id);
  }
  if (meta.seasonsPlayed > 0) addJournal(state, "new_season", STORY.new_season);
  syncHabitSlots(state);
  afterChange(state);
  dispatch(state);
}

/** The one reset function. Returns an error message, or null on success (state mutated). */
export function performReset(state: GameState, layerId: LayerId, choices: ScrapChoices | TeamChoices): string | null {
  const layer = LAYERS[layerId] as LayerDef<ScrapChoices | TeamChoices>;
  const gate = layer.gate(state);
  if (!gate.ok) return gate.reason;
  const invalid = layer.validate(state, choices);
  if (invalid) return invalid;
  const before = structuredClone(state);
  const award = layer.award(state);
  const log = state.meta.seasonLog ??= [];
  log.push({
    season: state.meta.seasonsPlayed + 1, endedBy: layerId,
    teamName: state.era?.teamName ?? null, discipline: state.era?.discipline ?? "dirt",
    organization: state.era ? state.era.organization ?? "independent" : undefined,
    setup: before.config, durationMs: state.run.seasonMs, featureWins: { ...state.run.featureWins },
    regularityFeatures: before.run.regularityFeatures,
    serviceInvoices: before.run.serviceBook?.invoices,
    depotReceipts: before.run.depotReceipts,
    builds: state.run.vehicles.length, hauls: state.run.stats.hauls,
  });
  if (log.length > 100) log.shift();
  forfeitOwnerTour(state);
  archiveClubSeason(state);
  archiveWorks(state);
  commitSeason(state, layerId);
  for (const scope of layer.clears) clearScope(state, scope);
  layer.apply(state, award, choices, before);
  startClubSeason(state);
  startSeason(state);
  return null;
}

function clearScope(state: GameState, scope: Scope): void {
  switch (scope) {
    case "run":
      state.run = initialRun();
      break;
    case "config":
      state.config = initialConfig();
      break;
    case "scrap": {
      const lifetime = state.scrap.lifetimeLp;
      state.scrap = { ...initialScrap(), lifetimeLp: lifetime };
      break;
    }
    case "era":
      state.era = null;
      break;
  }
}

export function crewCap(state: GameState): number {
  return state.era ? Math.floor(channel(state, "crew_cap")) : 0;
}

export { BASE_CREW_CAP };
