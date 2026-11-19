import { channel } from "./channels";
import { getPart } from "./content/parts";
import { getPlace } from "./content/places";
import { CREW_BY_ID } from "./content/team";
import { stowFinds } from "./garage";
import { STORY, addJournal } from "./journal";
import { nextUid, pickWeighted, rand } from "./rng";
import { findProvenance } from "./provenance";
import { CUSTOMERS } from "./serviceShop";
import { resolveFlags } from "./rules";
import type { Condition, GameState, JobSpec, PartInstance } from "./types";
import { experimentalCareers } from "./features";

type HaulSpec = Extract<JobSpec, { kind: "haul" }>;

export function carryFor(state: GameState, crewId?: string): number {
  const crew = crewId ? CREW_BY_ID[crewId] : undefined;
  return Math.floor(channel(state, "carry")) + (crew?.carry ?? 0);
}

/** Chance per random part draw, excluding scripted opening finds. */
export function haulOdds(placeId: string, focus?: HaulSpec["focus"]) {
  const entries = getPlace(placeId).finds.map((find) => ({
    item: find.partId,
    weight: find.weight * (focus && getPart(find.partId).category === focus ? 3 : 1),
  }));
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  return entries.map((entry) => ({ ...entry, chance: entry.weight / total }));
}

/** Generates finds for a completed trip and adds them to the garage. */
export function completeHaul(state: GameState, spec: HaulSpec, crewId?: string): PartInstance[] {
  const place = getPlace(spec.placeId);
  const flags = resolveFlags(state);
  const carry = carryFor(state, crewId);
  const fill = place.fill[0] + rand(state) * (place.fill[1] - place.fill[0]);
  const count = Math.max(1, Math.round(carry * fill));
  const quality = channel(state, "find_quality", { placeId: place.id });
  const finds: PartInstance[] = [];
  const provenance = findProvenance(state, place.id);
  // The very first trips ever are scripted: a seized engine, then a wheel.
  const lifetimeTrips = Object.values(state.meta.codex.places).reduce((a, b) => a + b, 0);
  const scripted = lifetimeTrips === 0 ? "engine_small" : lifetimeTrips === 1 ? "wheel_busted" : null;
  if (scripted) {
    finds.push({ uid: nextUid(state, "p"), partId: scripted, condition: 1, origin: place.name, provenance });
    state.meta.codex.parts[scripted] = (state.meta.codex.parts[scripted] ?? 0) + 1;
  }
  const odds = haulOdds(place.id, spec.focus);
  for (let i = finds.length; i < count; i++) {
    const partId = pickWeighted(state, odds);
    let condition = pickWeighted(state, place.condition.map((w, c) => ({ item: c, weight: w })));
    const shift = quality + flags.conditionShift;
    const whole = Math.trunc(shift);
    condition += whole;
    if (rand(state) < Math.abs(shift - whole)) condition += Math.sign(shift);
    if (quality >= 0.5 && condition < 1) condition = 1; // Junkyard Eyes floor
    condition = Math.max(0, Math.min(4, condition));
    const part: PartInstance = { uid: nextUid(state, "p"), partId, condition: condition as Condition, origin: place.name, provenance };
    const lead = experimentalCareers() ? state.config.shopLegacy : undefined;
    if (lead?.type === "client" && spec.focus === CUSTOMERS[lead.client].category && getPart(partId).category === spec.focus) part.referral = lead.client;
    finds.push(part);
    state.meta.codex.parts[partId] = (state.meta.codex.parts[partId] ?? 0) + 1;
  }
  state.meta.codex.places[place.id] = (state.meta.codex.places[place.id] ?? 0) + 1;
  state.run.stats.hauls += 1;
  addJournal(state, "first_find", STORY.first_find);
  stowFinds(state, finds);
  return finds;
}
