/**
 * The single entry point for changing game state. Every action clones the
 * state, applies the change to the clone and returns it, so callers never see
 * a half-applied update.
 */
import { channel } from "./channels";
import { getPart } from "./content/parts";
import { PERK_BY_ID } from "./content/modifiers";
import { CREW_BY_ID, TEAM_UPGRADE_BY_ID } from "./content/team";
import { TOOL_BY_ID } from "./content/tools";
import { SHELL_PRICE, getVehicle } from "./content/vehicles";
import { DRIVEWAY_RULES, counterPrice, fillFromDriveway, reservedPartUids, sellParts, swapOutCandidate, vehicleBusy } from "./garage";
import { templateBase } from "./habits";
import { advance, afterChange, cancelJob, dispatch, dropJob, enqueue } from "./jobs";
import { canOpenPlace, isLearned, learn, placeRepCost } from "./knowhowEngine";
import { crewCap, performReset, type LayerId, type ScrapChoices, type TeamChoices } from "./layers";
import { nextUid } from "./rng";
import { TIP_BY_ID } from "./content/tips";
import { resolveFlags } from "./rules";
import type { CrewMember, DrivewayRule, GameState, JobSpec, JobTemplate, MaterialId, TuneSetting } from "./types";

export type Action =
  | { type: "advance"; ms: number; away?: boolean }
  | { type: "enqueue"; spec: JobSpec }
  | { type: "cancelQueued"; index: number }
  | { type: "cancelJob"; jobId: string }
  | { type: "sell"; partUids: string[] }
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
  fillFromDriveway(next);
  return { state: next, error: null };
}

function applyMut(s: GameState, action: Action): string | null {
  switch (action.type) {
    case "advance":
      if (!(action.ms > 0)) return null;
      advance(s, action.ms, action.away ?? false);
      return null;
    case "enqueue":
      return enqueue(s, action.spec);
    case "cancelQueued":
      if (action.index < 0 || action.index >= s.run.queue.length) return "Nothing there";
      s.run.queue.splice(action.index, 1);
      return null;
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
      if (parts.some((p) => reserved.has(p.uid))) return "A part is being worked on";
      sellParts(s, parts);
      s.run.stats.partsSold += parts.length;
      afterChange(s);
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
      if (s.run.cash < tool.cash) return `Needs ${tool.cash} Scrap Bucks`;
      for (const [m, n] of Object.entries(tool.materials)) if (s.run.materials[m as MaterialId] < (n ?? 0)) return "Not enough materials";
      s.run.cash -= tool.cash;
      for (const [m, n] of Object.entries(tool.materials)) s.run.materials[m as MaterialId] -= n ?? 0;
      s.run.tools[tool.id] = owned + 1;
      afterChange(s);
      dispatch(s);
      return null;
    }
    case "buyShell": {
      if (!s.run.placesOpen.includes("auction")) return "The Salvage Auction sells shells";
      if (s.run.cash < SHELL_PRICE) return `Needs ${SHELL_PRICE} Scrap Bucks`;
      s.run.cash -= SHELL_PRICE;
      s.run.shellsBought += 1;
      s.run.inventory.push({ uid: nextUid(s, "p"), partId: "beater_shell", condition: 1, origin: "Salvage Auction" });
      afterChange(s);
      return null;
    }
    case "buyPart": {
      const blocker = counterBlocker(s, action.partId);
      if (blocker) return blocker;
      s.run.cash -= counterPrice(action.partId);
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
      if (slot.minCondition !== undefined && part.condition < slot.minCondition) return "It must be at least Good";
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
      if (action.tune !== "balanced" && !isLearned(s, "tech:tuning")) return "Learn Tuning first";
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
      for (const job of s.run.jobs.filter((j) => j.lane === `habit:${action.slot}`)) dropJob(s, job.id);
      dispatch(s);
      return null;
    }
    case "buyPerk": {
      const perk = PERK_BY_ID[action.perkId];
      if (!perk) return "Unknown perk";
      if (perk.unlock.type !== "lp" && !s.meta.perksUnlocked.includes(perk.id)) {
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
      for (const job of s.run.jobs.filter((j) => j.lane === `crew:${action.crewId}`)) dropJob(s, job.id);
      s.era.crew = s.era.crew.filter((c) => c.id !== action.crewId);
      return null;
    }
    case "assignCrew": {
      if (!s.era) return "No team";
      const member = s.era.crew.find((c) => c.id === action.crewId);
      if (!member) return "Not on your crew";
      const a = action.assignment;
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
      if (!s.config.perks.includes("swap_meet") || s.config.hardships.includes("rookie_plates")) return "Equip Swap Meet Regular";
      if (action.partUids.length !== 3) return "Trade exactly 3 parts";
      const reserved = reservedPartUids(s);
      const parts = s.run.inventory.filter((p) => action.partUids.includes(p.uid));
      if (parts.length !== 3 || parts.some((p) => reserved.has(p.uid))) return "Pick 3 free parts";
      const target = getPart(action.partId);
      if ((s.meta.codex.parts[target.id] ?? 0) < 1) return "You've never seen one of those";
      const maxTier = Math.max(...parts.map((p) => getPart(p.partId).tier));
      if (target.tier > maxTier) return "Trade at least one part of that tier";
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
  if (!s.run.revealed.includes("tools")) return "The parts counter isn't open to you yet";
  if (def.category === "junk" || def.category === "body") return "The counter doesn't stock that";
  if ((s.meta.codex.parts[partId] ?? 0) < 1) return "You've never seen one; the counter can't order it";
  const ownedTier = Math.max(0, ...s.run.vehicles.map((v) => getVehicle(v.vehicleId).tier));
  if (def.tier > ownedTier + 1) return "Too far ahead of what you drive";
  if (s.run.cash < counterPrice(partId)) return `Needs ${counterPrice(partId)} Scrap Bucks`;
  return null;
}

/** Convenience for the simulator and tests: apply or throw. */
export function must(state: GameState, action: Action): GameState {
  const result = apply(state, action);
  if (result.error) throw new Error(`${action.type}: ${result.error}`);
  return result.state;
}

export { channel };
