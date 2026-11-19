import { spend } from "./stats";
import { evaluateAchievements } from "./achievements";
/**
 * The single entry point for changing game state. Every action clones the
 * state, applies the change to the clone and returns it, so callers never see
 * a half-applied update.
 */
import { applyOwner, pauseTourPlanOnCancellation, type OwnerMove } from "./ownership";
import { applyHeritage, type HeritageMove } from "./heritage";
import { applyPromoter, type PromoterMove } from "./promoter";
import { applyClub, type ClubMove } from "./club";
import { applyWorks, type WorksMove } from "./manufacturer";
import { applyCountyMatch, type CountyMatchMove } from "./countyRivals";
import { applyMotorPool, type MotorPoolMove } from "./motorPool";
import { channel } from "./channels";
import { COUNTY_PARTS, HOME_COUNTIES } from "./counties";
import { BATON_RELEASE_REQUIRED, changeBatonGuard } from "./countyBaton";
import { CONDITION_NAMES, getPart } from "./content/parts";
import { PERK_BY_ID } from "./content/modifiers";
import { CREW_BY_ID, TEAM_UPGRADE_BY_ID } from "./content/team";
import { TOOL_BY_ID } from "./content/tools";
import { SHELL_PRICE, getVehicle } from "./content/vehicles";
import { DRIVEWAY_RULES, counterPrice, fillFromDriveway, garageSpace, reservedPartUids, sellParts, swapOutCandidate, vehicleBusy } from "./garage";
import { templateBase } from "./habits";
import { advance, afterChange, cancelJob, dispatch, dropJob, dropOrphanSignUps, enqueue, jobBlocker } from "./jobs";
import { canOpenPlace, isLearned, learn, placeRepCost } from "./knowhowEngine";
import { crewCap, performReset, type LayerId, type ScrapChoices, type TeamChoices } from "./layers";
import { nextUid } from "./rng";
import { TIP_BY_ID } from "./content/tips";
import { resolveFlags } from "./rules";
import { retireVehicle, type RetirementMove } from "./retirement";
import { applyRaceNight, type RaceNightMove } from "./raceNight";
import { perkUnlocked } from "./perks";
import { crewBusyRacing, crewTravelBlocker } from "./crew";
import { releaseApprentice } from "./crewLegacy";
import type { CrewMember, DrivewayRule, GameState, JobSpec, JobTemplate, MaterialId, TuneSetting } from "./types";

import { applyShopOrder, type ShopMove } from "./serviceShop";

import { possiblePins, type CareerPin } from "./careerPin";
import { batonGuarded, experimentalCareers } from "./features";

export type Action =
  | { type: "pinCareer"; pin: CareerPin | null }
  | { type: "service"; move: ShopMove }
  | { type: "heritage"; move: HeritageMove }
  | { type: "owner"; move: OwnerMove }
  | { type: "promoter"; move: PromoterMove }
  | { type: "club"; move: ClubMove }
  | { type: "works"; move: WorksMove }
  | { type: "countyMatch"; move: CountyMatchMove }
  | { type: "motorPool"; move: MotorPoolMove }
  | { type: "advance"; ms: number; away?: boolean }
  | { type: "enqueue"; spec: JobSpec }
  | { type: "batchClean"; partUids: string[] }
  | { type: "serviceInstalled"; vehicleUid: string; slot: string }
  | { type: "retireVehicle"; vehicleUid: string; move: RetirementMove }
  | { type: "raceNight"; move: RaceNightMove }
  | { type: "cancelQueued"; index: number }
  | { type: "prioritizeQueued"; index: number }
  | { type: "cancelJob"; jobId: string }
  | { type: "sell"; partUids: string[] }
  | { type: "protectPart"; partUid: string; keep: boolean }
  | { type: "guardBaton"; partUid: string; keep: boolean }
  | { type: "swapIn"; partUid: string }
  | { type: "setDrivewayRule"; rule: DrivewayRule }
  | { type: "openPlace"; knowhowId: string }
  | { type: "buyTool"; toolId: string }
  | { type: "buyShell" }
  | { type: "buyPart"; partId: string }
  | { type: "install"; vehicleUid: string; slot: string; partUid: string }
  | { type: "uninstall"; vehicleUid: string; slot: string }
  | { type: "setTune"; vehicleUid: string; tune: TuneSetting }
  | { type: "renameVehicle"; vehicleUid: string; name: string }
  | { type: "setHabit"; slot: number; template: JobTemplate | null }
  | { type: "buyPerk"; perkId: string }
  | { type: "buyTeamUpgrade"; upgradeId: string }
  | { type: "hire"; crewId: string }
  | { type: "dismiss"; crewId: string }
  | { type: "assignCrew"; crewId: string; assignment: CrewMember["assignment"] }
  | { type: "swapMeet"; partUids: string[]; partId: string }
  | { type: "reset"; layer: LayerId; choices: ScrapChoices | TeamChoices }
  | { type: "dismissNotices" }
  | { type: "dismissTip"; tipId: string }
  | { type: "showTipsAgain" }
  | { type: "setGuide"; on: boolean };

export interface ActionResult {
  state: GameState;
  error: string | null;
}

export function apply(state: GameState, action: Action): ActionResult {
  const next = structuredClone(state);
  const error = applyMut(next, action);
  if (error) return { state, error };
  dropOrphanSignUps(next);
  fillFromDriveway(next);
  evaluateAchievements(next);
  return { state: next, error: null };
}

function applyMut(s: GameState, action: Action): string | null {
  switch (action.type) {
    case "pinCareer":
      if (action.pin === null) { delete s.meta.careerPin; return null; }
      if (!possiblePins(s).includes(action.pin)) return "Discover this career first.";
      s.meta.careerPin = action.pin;
      return null;
    case "service": {
      const error = applyShopOrder(s, action.move);
      if (!error) { afterChange(s); dispatch(s); }
      return error;
    }
    case "heritage":
      return applyHeritage(s, action.move);
    case "owner":
      return applyOwner(s, action.move);
    case "promoter":
      return applyPromoter(s, action.move);
    case "club":
      return applyClub(s, action.move);
    case "works":
      return applyWorks(s, action.move);
    case "countyMatch":
      return applyCountyMatch(s, action.move);
    case "motorPool": {
      const issue = applyMotorPool(s, action.move);
      if (!issue) afterChange(s);
      return issue;
    }
    case "advance":
      if (!(action.ms > 0)) return null;
      advance(s, action.ms, action.away ?? false);
      return null;
    case "retireVehicle":
      return retireVehicle(s, action.vehicleUid, action.move);
    case "raceNight":
      return applyRaceNight(s, action.move);
    case "enqueue":
      if (action.spec.kind === "race" && (action.spec.tourRound !== undefined || action.spec.tourReserve !== undefined || action.spec.ownerDrive !== undefined)) {
        return "Enter touring rounds from the Owner calendar";
      }
      if (action.spec.kind === "race" && action.spec.clubRound !== undefined) return "Enter club rounds from the Club calendar";
      if (action.spec.kind === "race" && action.spec.worksRound !== undefined) return "Enter works trials from the Manufacturer desk";
      if (action.spec.kind === "race" && action.spec.countyMatch !== undefined) return "Enter the county matchup from the Race screen";
      return enqueue(s, action.spec);
    case "batchClean": {
      if (action.partUids.length < 2 || action.partUids.length > 3 || new Set(action.partUids).size !== action.partUids.length) return "Choose two or three different parts";
      for (const partUid of action.partUids) {
        const issue = enqueue(s, { kind: "clean", partUid });
        if (issue) return issue;
      }
      return null;
    }
    case "serviceInstalled": {
      const staged = installedService(s, action.vehicleUid, action.slot);
      if (typeof staged === "string") return staged;
      const issue = applyMut(s, { type: "uninstall", vehicleUid: action.vehicleUid, slot: action.slot });
      return issue ?? enqueue(s, staged);
    }
    case "cancelQueued": {
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= s.run.queue.length) return "Nothing there";
      const [cancelled] = s.run.queue.splice(action.index, 1);
      pauseTourPlanOnCancellation(s, cancelled);
      return null;
    }
    case "prioritizeQueued": {
      if (!Number.isInteger(action.index) || action.index < 1 || action.index >= s.run.queue.length) return "Pick a queued job with a job ahead of it";
      const job = s.run.queue[action.index];
      if (job.kind === "race" || s.run.queue[action.index - 1].kind === "race") return "Race sign-ups keep their event order";
      s.run.queue[action.index] = s.run.queue[action.index - 1];
      s.run.queue[action.index - 1] = job;
      dispatch(s);
      return null;
    }
    case "cancelJob": {
      const job = s.run.jobs.find((j) => j.id === action.jobId);
      if (job?.spec.kind === "race") return "You're already on the track";
      cancelJob(s, action.jobId);
      return null;
    }
    case "sell": {
      const reserved = reservedPartUids(s);
      const uids = new Set(action.partUids);
      const parts = [...s.run.inventory, ...s.run.driveway].filter((p) => uids.has(p.uid));
      if (parts.length === 0) return "Nothing to sell";
      if (parts.some(batonGuarded)) return BATON_RELEASE_REQUIRED;
      if (parts.some((p) => reserved.has(p.uid))) return "A part is being worked on";
      sellParts(s, parts);
      afterChange(s);
      return null;
    }
    case "guardBaton":
      return changeBatonGuard(s, action.partUid, action.keep);
    case "protectPart": {
      const part = s.run.inventory.find((candidate) => candidate.uid === action.partUid)
        ?? s.run.driveway.find((candidate) => candidate.uid === action.partUid);
      if (!part) return "Pick a loose part";
      part.protected = action.keep;
      return null;
    }
    case "swapIn": {
      const part = s.run.driveway.find((p) => p.uid === action.partUid);
      if (!part) return "That part isn't on the driveway";
      if (reservedPartUids(s).has(part.uid)) return "That part is being stripped";
      const out = swapOutCandidate(s);
      if (!out) return "Everything in the garage is on the bench";
      s.run.inventory = [...s.run.inventory.filter((p) => p.uid !== out.uid), part];
      s.run.driveway = [...s.run.driveway.filter((p) => p.uid !== part.uid), out];
      afterChange(s);
      return null;
    }
    case "setDrivewayRule":
      if (!s.run.learned.includes("tech:sorting")) return "Learn Sorting first";
      if (!DRIVEWAY_RULES.some((r) => r.id === action.rule)) return "Unknown rule";
      s.meta.drivewayRule = action.rule;
      return null;
    case "openPlace": {
      const blocker = canOpenPlace(s, action.knowhowId);
      if (blocker) return blocker;
      s.run.rep -= placeRepCost(s, action.knowhowId);
      learn(s, action.knowhowId);
      afterChange(s);
      dispatch(s);
      return null;
    }
    case "buyTool": {
      const tool = TOOL_BY_ID[action.toolId];
      if (!tool) return "Unknown tool";
      const owned = s.run.tools[tool.id] ?? 0;
      if (owned >= tool.max) return "You already have that";
      if (!toolStocked(s, tool.id)) return "The counter doesn't stock that for you yet";
      if (s.run.cash < tool.cash) return `Needs ${tool.cash} Scrap Bucks`;
      for (const [m, n] of Object.entries(tool.materials)) if (s.run.materials[m as MaterialId] < (n ?? 0)) return "Not enough materials";
      spend(s, tool.cash);
      for (const [m, n] of Object.entries(tool.materials)) s.run.materials[m as MaterialId] -= n ?? 0;
      s.run.tools[tool.id] = owned + 1;
      afterChange(s);
      dispatch(s);
      return null;
    }
    case "buyShell": {
      if (!s.run.placesOpen.includes("auction")) return "The Salvage Auction sells shells";
      if (s.run.cash < SHELL_PRICE) return `Needs ${SHELL_PRICE} Scrap Bucks`;
      spend(s, SHELL_PRICE);
      s.run.shellsBought += 1;
      s.run.inventory.push({ uid: nextUid(s, "p"), partId: "beater_shell", condition: 1, origin: "Salvage Auction" });
      afterChange(s);
      return null;
    }
    case "buyPart": {
      const blocker = counterBlocker(s, action.partId);
      if (blocker) return blocker;
      spend(s, counterPrice(s, action.partId));
      s.run.stats.counterBuys = (s.run.stats.counterBuys ?? 0) + 1;
      s.run.inventory.push({ uid: nextUid(s, "p"), partId: action.partId, condition: 3, origin: "Parts counter" });
      afterChange(s);
      return null;
    }
    case "install": {
      const vehicle = s.run.vehicles.find((v) => v.uid === action.vehicleUid);
      if (!vehicle) return "No such vehicle";
      if (vehicleBusy(s, vehicle.uid)) return "It's out racing";
      const slot = getVehicle(vehicle.vehicleId).slots.find((sl) => sl.slot === action.slot);
      if (!slot) return "No such slot";
      const part = s.run.inventory.find((p) => p.uid === action.partUid);
      if (!part) return "No such part";
      if (reservedPartUids(s).has(part.uid)) return "That part is being worked on";
      if (!slot.accepts.includes(part.partId)) return `${getPart(part.partId).name} doesn't fit`;
      if (slot.minCondition !== undefined && part.condition < slot.minCondition) return "It must be at least " + CONDITION_NAMES[slot.minCondition];
      const old = vehicle.parts[action.slot];
      vehicle.parts[action.slot] = part;
      s.run.inventory = s.run.inventory.filter((p) => p.uid !== part.uid);
      if (old) s.run.inventory.push(old);
      afterChange(s);
      return null;
    }
    case "uninstall": {
      const vehicle = s.run.vehicles.find((v) => v.uid === action.vehicleUid);
      if (!vehicle) return "No such vehicle";
      if (vehicleBusy(s, vehicle.uid)) return "It's out racing";
      const slot = getVehicle(vehicle.vehicleId).slots.find((sl) => sl.slot === action.slot);
      if (!slot) return "No such slot";
      const old = vehicle.parts[action.slot];
      if (!old) return "Nothing installed";
      delete vehicle.parts[action.slot];
      s.run.inventory.push(old);
      return null;
    }
    case "setTune": {
      const vehicle = s.run.vehicles.find((v) => v.uid === action.vehicleUid);
      if (!vehicle) return "No such vehicle";
      if (action.tune !== "balanced" && !isLearned(s, "tech:tuning") && !(experimentalCareers() && s.run.heritageSetups?.includes(vehicle.vehicleId))) return "Learn Tuning first.";
      vehicle.tune = action.tune;
      return null;
    }
    case "renameVehicle": {
      const vehicle = s.run.vehicles.find((v) => v.uid === action.vehicleUid);
      if (!vehicle) return "No such vehicle";
      vehicle.name = action.name.trim().slice(0, 32) || getVehicle(vehicle.vehicleId).name;
      return null;
    }
    case "setHabit": {
      if (action.slot < 0 || action.slot >= s.run.habitSlots.length) return "No such slot";
      if (action.template && !s.run.habitsKnown.includes(templateBase(action.template))) return "You haven't made that a Habit yet";
      s.run.habitSlots[action.slot] = action.template;
      // A new assignment takes over after an in-flight race finishes.
      for (const job of s.run.jobs.filter((j) => j.lane === `habit:${action.slot}` && j.spec.kind !== "race")) dropJob(s, job.id);
      dispatch(s);
      return null;
    }
    case "buyPerk": {
      const perk = PERK_BY_ID[action.perkId];
      if (!perk) return "Unknown perk";
      if (!perkUnlocked(s, perk)) {
        if (perk.unlock.type === "challenge") return "Complete its Season challenge to unlock this perk";
        return perk.unlock.type === "dare" ? "Complete its dare first" : "Win that Feature first";
      }
      const rank = s.meta.perks[perk.id] ?? 0;
      if (rank >= perk.maxRank) return "Already at max rank";
      const cost = perk.cost[rank];
      if (s.scrap.lp < cost) return `Needs ${cost} Legacy Points`;
      s.scrap.lp -= cost;
      s.meta.perks[perk.id] = rank + 1;
      return null;
    }
    case "buyTeamUpgrade": {
      const upgrade = TEAM_UPGRADE_BY_ID[action.upgradeId];
      if (!upgrade) return "Unknown upgrade";
      const rank = s.team.upgrades[upgrade.id] ?? 0;
      if (rank >= upgrade.cost.length) return "Already at max rank";
      const cost = upgrade.cost[rank];
      if (s.team.tp < cost) return `Needs ${cost} Team Points`;
      s.team.tp -= cost;
      s.team.upgrades[upgrade.id] = rank + 1;
      afterChange(s);
      dispatch(s);
      return null;
    }
    case "hire": {
      if (!s.era) return "Found a team first";
      if (resolveFlags(s).crewDisabled) return "Solo Season: no crew";
      if (!s.run.candidates.includes(action.crewId)) return "They aren't available";
      if (s.era.crew.length >= crewCap(s)) return "No room. Build Crew Quarters";
      if (!CREW_BY_ID[action.crewId]) return "Unknown person";
      s.era.crew.push({ id: action.crewId, assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: s.run.seasonMs, jobsDone: 0 });
      s.run.candidates = s.run.candidates.filter((c) => c !== action.crewId);
      dispatch(s);
      return null;
    }
    case "dismiss": {
      if (!s.era) return "No team";
      if (crewBusyRacing(s, action.crewId)) return "They're on the track. Wait for the race to finish";
      for (const job of s.run.jobs.filter((j) => j.lane === `crew:${action.crewId}`)) dropJob(s, job.id);
      releaseApprentice(s, action.crewId);
      s.era.crew = s.era.crew.filter((c) => c.id !== action.crewId);
      return null;
    }
    case "assignCrew": {
      if (!s.era) return "No team";
      const member = s.era.crew.find((c) => c.id === action.crewId);
      if (!member) return "Not on your crew";
      if (crewBusyRacing(s, member.id)) return "They're on the track. Wait for the race to finish";
      const a = action.assignment;
      const travel = a.type === "habit" ? crewTravelBlocker(s, a.template) : null;
      if (travel) return travel;
      if (a.type === "habit" && !s.run.habitsKnown.includes(templateBase(a.template))) return "That isn't a Habit yet";
      if (a.type === "habit" && a.template === "race") return "Pick a race setup for Race Day";
      if (a.type === "driver" && !CREW_BY_ID[member.id]?.driverPerf) return `${CREW_BY_ID[member.id]?.name} isn't a driver`;
      if (a.type === "spotter" && !CREW_BY_ID[member.id]?.dnfMult) return `${CREW_BY_ID[member.id]?.name} isn't a spotter`;
      member.assignment = a;
      for (const job of s.run.jobs.filter((j) => j.lane === `crew:${member.id}`)) dropJob(s, job.id);
      dispatch(s);
      return null;
    }
    case "swapMeet": {
      const blocker = swapMeetBlocker(s, action.partUids, action.partId);
      if (blocker) return blocker;
      const target = getPart(action.partId);
      s.run.inventory = s.run.inventory.filter((p) => !action.partUids.includes(p.uid));
      s.run.inventory.push({ uid: nextUid(s, "p"), partId: target.id, condition: 2, origin: "Swap meet" });
      afterChange(s);
      return null;
    }
    case "reset":
      return performReset(s, action.layer, action.choices);
    case "dismissNotices":
      s.run.notices = [];
      return null;
    case "dismissTip":
      if (!TIP_BY_ID[action.tipId]) return "Unknown tip";
      if (!s.meta.tipsSeen.includes(action.tipId)) s.meta.tipsSeen.push(action.tipId);
      return null;
    case "showTipsAgain":
      s.meta.tipsSeen = [];
      return null;
    case "setGuide":
      s.meta.guideOff = !action.on;
      return null;
  }
}

/** Why a part can't be bought at the Parts Counter (null = it can). */
export function counterBlocker(s: GameState, partId: string): string | null {
  const def = getPart(partId);
  if (Object.hasOwn(COUNTY_PARTS, partId)) return `Find this part in ${HOME_COUNTIES[COUNTY_PARTS[partId]].name}`;
  if (!s.run.revealed.includes("tools")) return "The parts counter isn't open to you yet";
  if (def.category === "junk" || def.category === "body") return "The counter doesn't stock that";
  if ((s.meta.codex.parts[partId] ?? 0) < 1) return "You've never seen one; the counter can't order it";
  const ownedTier = Math.max(0, ...s.run.vehicles.map((v) => getVehicle(v.vehicleId).tier));
  if (def.tier > ownedTier + 1) return "Too far ahead of what you drive";
  if (s.run.cash < counterPrice(s, partId)) return `Needs ${counterPrice(s, partId)} Scrap Bucks`;
  return null;
}

/** Bigger shop tools only appear once you're building machines that need them. */
export function toolStocked(s: GameState, toolId: string): boolean {
  const minTier = TOOL_BY_ID[toolId]?.minTier ?? 0;
  if (minTier === 0 || (s.run.tools[toolId] ?? 0) > 0) return true;
  return s.run.vehicles.some((v) => getVehicle(v.vehicleId).tier >= minTier);
}

/** Convenience for the simulator and tests: apply or throw. */
export function must(state: GameState, action: Action): GameState {
  const result = apply(state, action);
  if (result.error) throw new Error(`${action.type}: ${result.error}`);
  return result.state;
}

export function installedService(state: GameState, vehicleUid: string, slot: string): Extract<JobSpec, { kind: "clean" | "repair" | "restore" }> | string {
  const part = state.run.vehicles.find((car) => car.uid === vehicleUid)?.parts[slot];
  if (!part) return "Nothing installed";
  if (vehicleBusy(state, vehicleUid) || state.run.queue.some((job) => job.kind === "race" && job.vehicleUid === vehicleUid)) return "Service after the signed-up race";
  if (state.run.inventory.length >= garageSpace(state)) return "Make room in the garage before servicing it";
  const projected = { ...state, run: { ...state.run, inventory: [...state.run.inventory, part] } };
  const repair = { kind: "repair", partUid: part.uid } as const;
  if (part.condition === 1 && !jobBlocker(projected, repair)) return repair;
  const kind = part.condition <= 1 ? "clean" : part.condition === 2 ? "repair" : "restore";
  const spec = { kind, partUid: part.uid } as const;
  return jobBlocker(projected, spec) ?? spec;
}

export { channel };

/** Shared by the trade form and reducer, including part reservations. */
export function swapMeetBlocker(s: GameState, partUids: string[], partId: string): string | null {
  if (!s.config.perks.includes("swap_meet") || !(s.meta.perks.swap_meet > 0) || s.config.hardships.includes("rookie_plates")) return "Equip Swap Meet Regular";
  if (Object.hasOwn(COUNTY_PARTS, partId)) return `Find this part in ${HOME_COUNTIES[COUNTY_PARTS[partId]].name}`;
  if (partUids.length !== 3 || new Set(partUids).size !== 3) return "Trade exactly 3 different parts";
  const reserved = reservedPartUids(s);
  const parts = s.run.inventory.filter((p) => partUids.includes(p.uid));
  if (parts.length !== 3 || parts.some((p) => reserved.has(p.uid))) return "Pick 3 free parts";
  if (parts.some(batonGuarded)) return BATON_RELEASE_REQUIRED;
  if ((s.meta.codex.parts[partId] ?? 0) < 1) return "Pick a part you've seen before";
  const maxTier = Math.max(...parts.map((p) => getPart(p.partId).tier));
  if (getPart(partId).tier > maxTier) return "Trade at least one part of that tier";
  return null;
}
