/**
 * "What am I working toward?" as data. nextGoals() reads the real content and gate
 * functions (venues, place costs, reset awards, habit thresholds) and returns up to
 * three progress-bar goals, most useful first. seasonTrack() is the five-venue
 * distance-travelled summary. Pure: derives everything from existing state.
 */
import { VENUES, venueName } from "./content/events";
import { KNOWHOW, getKnowhow } from "./content/knowhow";
import { PLACE_BY_ID } from "./content/places";
import { getVehicle } from "./content/vehicles";
import { habitName, habitThreshold } from "./habits";
import { LAYERS, scrapAward, teamAward } from "./layers";
import { canOpenPlace, isLearned, placeRepCost } from "./knowhowEngine";
import { venueLockReason } from "./race";
import { resolveFlags } from "./rules";
import type { GameState } from "./types";

export type GoalTab = "trips" | "garage" | "workshop" | "race" | "legacy" | "team";

export interface Goal {
  id: string;
  label: string;
  detail: string;
  current: number;
  target: number;
  unit?: string;
  tab?: GoalTab;
}

export interface SeasonPip {
  venueId: string;
  name: string;
  open: boolean;
  /** Feature won this Season (a regularity certificate counts in Rally). */
  won: boolean;
}

export const MAX_GOALS = 3;

/** The vehicles a player works up through, in order. */
const VEHICLE_CHAIN = ["push_mower", "riding_mower", "go_kart", "beater_car", "street_stock"] as const;

const featureWon = (s: GameState, venueId: string) => s.run.featureWins[venueId] !== undefined || s.run.regularityFeatures?.[venueId] !== undefined;

export function seasonTrack(state: GameState): SeasonPip[] {
  const discipline = resolveFlags(state).discipline;
  return VENUES.map((v) => ({ venueId: v.id, name: venueName(v.id, discipline), open: state.run.venuesOpen.includes(v.id), won: featureWon(state, v.id) }));
}

/** A copy of the state with one more Feature won, to price the next milestone with the real award functions. */
function withFeatureWin(state: GameState, venueId: string): GameState {
  return { ...state, run: { ...state.run, featureWins: { ...state.run.featureWins, [venueId]: state.run.seasonMs } } };
}

/** Next unwon Feature in venue order, used to price "the next milestone". */
function nextUnwonVenue(state: GameState): string | null {
  return VENUES.find((v) => !featureWon(state, v.id))?.id ?? null;
}

function ladderGoal(state: GameState): Goal | null {
  const discipline = resolveFlags(state).discipline;
  const venue = VENUES.find((v) => state.run.venuesOpen.includes(v.id) && !featureWon(state, v.id));
  if (!venue) return null;
  const name = venueName(venue.id, discipline);
  const unlocked = state.run.ladder[venue.id] ?? ["sprint"];
  const heat = unlocked.includes("heat");
  const feature = unlocked.includes("feature");
  const current = (heat ? 1 : 0) + (feature ? 1 : 0);
  const next = !heat ? "Finish top 3 in the Sprint to open the Heat" : !feature ? "Finish top 3 in the Heat to open the Feature" : "Win the Feature";
  const bonus = venue.id === "county_fair" ? " It also unlocks the Scrap Reset." : venue.id === "state" ? " It also opens Team founding." : "";
  return { id: `ladder:${venue.id}`, label: `Win the ${name} Feature`, detail: `${next}.${bonus}`, current, target: 3, unit: "steps", tab: "race" };
}

/** Before the Fair Feature: how far through the three venues that unlock the Scrap Reset. */
function resetGateGoal(state: GameState, frontier: Goal | null): Goal | null {
  if (state.era || LAYERS.scrap.gate(state).ok || frontier?.id === "ladder:county_fair") return null;
  const chain = ["backyard", "dirt", "county_fair"];
  return {
    id: "gate:scrap",
    label: "Unlock the Scrap Reset",
    detail: `${LAYERS.scrap.gate(state).reason ?? "Win the County Fair Feature"}. Legacy Points start a faster next Season.`,
    current: chain.filter((v) => featureWon(state, v)).length,
    target: chain.length,
    unit: "Features",
    tab: "race",
  };
}

/** The reset is open: what it pays now, against what the next Feature would add. */
function resetReadyGoal(state: GameState): Goal | null {
  if (!LAYERS.scrap.gate(state).ok) return null;
  const now = scrapAward(state);
  const venueId = nextUnwonVenue(state);
  let target = now;
  let detail = "Every Feature is won this Season.";
  if (venueId) {
    const after = withFeatureWin(state, venueId);
    target = scrapAward(after);
    detail = `Win the ${venueName(venueId, resolveFlags(state).discipline)} Feature first for ${target} Legacy Points.`;
  }
  return { id: "reset:scrap", label: `Scrap Reset pays ${now} Legacy Points now`, detail, current: now, target, unit: "LP", tab: "legacy" };
}

function teamReadyGoal(state: GameState): Goal | null {
  if (state.era ? !LAYERS.team.gate(state).ok : !state.meta.stateWonEver) return null;
  const now = teamAward(state);
  const venueId = nextUnwonVenue(state);
  let target = now;
  let detail = state.era ? "Every Feature is won this Season." : "Found a Team to race a discipline with a crew.";
  if (venueId) {
    const after = withFeatureWin(state, venueId);
    target = teamAward(after);
    if (target > now) detail = `Win the ${venueName(venueId, resolveFlags(state).discipline)} Feature for ${target} Team Points.`;
  }
  return { id: "reset:team", label: state.era ? `Team Reset pays ${now} Team Points now` : "Found your Team", detail, current: now, target, unit: "TP", tab: "team" };
}

/** Regional won, State not open yet: the invitation goes out to winners of an earlier Season. */
function stateInvitationGoal(state: GameState): Goal | null {
  if (state.run.venuesOpen.includes("state") || !featureWon(state, "regional")) return null;
  const reason = venueLockReason(state, "state");
  if (!reason) return null;
  const seasonsWon = (state.meta.records.regional !== undefined ? 1 : 0) + (state.run.featureWins.regional !== undefined ? 1 : 0);
  return { id: "invite:state", label: `Earn the ${venueName("state", resolveFlags(state).discipline)} invitation`, detail: reason, current: seasonsWon, target: 2, unit: "Seasons", tab: "legacy" };
}

/** The cheapest place (or the Dirt Track) whose trigger has fired and that Rep can open. */
function placeGoal(state: GameState): Goal | null {
  const discipline = resolveFlags(state).discipline;
  const options = KNOWHOW.filter((k) => k.kind === "place" && !isLearned(state, k.id))
    .map((k) => ({ def: k, reason: canOpenPlace(state, k.id), cost: placeRepCost(state, k.id) }))
    .filter((o) => o.cost > 0 && (o.reason === null || o.reason.startsWith("Needs ")))
    .sort((a, b) => a.cost - b.cost);
  const pick = options[0];
  if (!pick) return null;
  const dirt = pick.def.id === "place:dirt";
  const name = dirt ? venueName("dirt", discipline) : getKnowhow(pick.def.id).name;
  const ready = state.run.rep >= pick.cost;
  return {
    id: pick.def.id,
    label: dirt ? `Open the ${name}` : `Open ${name}`,
    detail: ready ? `You have the Rep. Sign up on the ${dirt ? "Race" : "Trips"} tab.` : "Rep comes from racing.",
    current: Math.min(state.run.rep, pick.cost),
    target: pick.cost,
    unit: "Rep",
    tab: dirt ? "race" : "trips",
  };
}

/** The next vehicle up the chain: plans studied plus required slots you hold a part for. */
function vehicleGoal(state: GameState): Goal | null {
  const owned = new Set(state.run.vehicles.map((v) => v.vehicleId));
  const id = VEHICLE_CHAIN.find((v) => !owned.has(v));
  if (!id) return null;
  const def = getVehicle(id);
  const needsPlans = def.blueprint !== null && !isLearned(state, def.blueprint);
  const held = [...state.run.inventory];
  let slotsFilled = 0;
  const required = def.slots.filter((s) => s.required);
  for (const slot of required) {
    const at = held.findIndex((p) => slot.accepts.includes(p.partId));
    if (at === -1) continue;
    held.splice(at, 1);
    slotsFilled += 1;
  }
  const plansStep = def.blueprint === null ? 0 : 1;
  let detail = `Gather a part for each of its ${required.length} slots, then Assemble in the Garage.`;
  let tab: GoalTab = "garage";
  if (needsPlans && def.blueprint) {
    const known = getKnowhow(def.blueprint);
    tab = state.run.available.includes(def.blueprint) ? "workshop" : "garage";
    detail = state.run.available.includes(def.blueprint) ? "Study the plans in the Workshop first." : `Plans come later: ${known.hint.charAt(0).toLowerCase()}${known.hint.slice(1)}.`;
  }
  return {
    id: `vehicle:${id}`,
    label: `Build a ${def.name}`,
    detail,
    current: (plansStep && !needsPlans ? 1 : 0) + slotsFilled,
    target: plansStep + required.length,
    unit: "steps",
    tab,
  };
}

/** The Habit closest to forming. */
function habitGoal(state: GameState): Goal | null {
  if (resolveFlags(state).habitsDisabled || state.era) return null;
  const candidates = Object.entries(state.run.reps)
    .filter(([template, n]) => n >= 1 && !state.run.habitsKnown.includes(template) && (template !== "race" ? true : state.run.vehicles.length > 0))
    .map(([template, n]) => ({ template, n, threshold: habitThreshold(state, template) }))
    .filter((c) => c.n < c.threshold && (!c.template.startsWith("haul:") || PLACE_BY_ID[c.template.slice(5)]?.habitAt))
    .sort((a, b) => b.n / b.threshold - a.n / a.threshold);
  const pick = candidates[0];
  if (!pick) return null;
  const tab: GoalTab = pick.template.startsWith("haul:") ? "trips" : pick.template === "race" ? "race" : "garage";
  return {
    id: `habit:${pick.template}`,
    label: `Make ${habitName(pick.template)} a Habit`,
    detail: `Do it ${pick.threshold - pick.n} more time${pick.threshold - pick.n === 1 ? "" : "s"} and it runs by itself in a Habit slot.`,
    current: pick.n,
    target: pick.threshold,
    unit: "times",
    tab,
  };
}

/** 1 to 3 goals, in the order a player should care about them. */
export function nextGoals(state: GameState): Goal[] {
  const hasVehicle = state.run.vehicles.length > 0;
  const frontier = hasVehicle ? ladderGoal(state) : null;
  const ordered: (Goal | null)[] = hasVehicle
    ? [
        frontier,
        resetReadyGoal(state),
        state.era ? teamReadyGoal(state) : null,
        resetGateGoal(state, frontier),
        stateInvitationGoal(state),
        state.era ? null : teamReadyGoal(state),
        placeGoal(state),
        vehicleGoal(state),
        habitGoal(state),
      ]
    : [vehicleGoal(state), placeGoal(state), habitGoal(state)];
  const goals = ordered.filter((g): g is Goal => g !== null);
  const seen = new Set<string>();
  return goals.filter((g) => !seen.has(g.id) && seen.add(g.id)).slice(0, MAX_GOALS);
}
