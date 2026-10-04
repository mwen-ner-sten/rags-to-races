import { channel } from "./channels";
import { getPart } from "./content/parts";
import { getPlace } from "./content/places";
import { CREW_BY_ID } from "./content/team";
import { enforceStorage } from "./garage";
import { STORY, addJournal } from "./journal";
import { nextUid, pickWeighted, rand } from "./rng";
import { resolveFlags } from "./rules";
import type { Condition, GameState, JobSpec, PartInstance } from "./types";

type HaulSpec = Extract<JobSpec, { kind: "haul" }>;

export function carryFor(state: GameState, crewId?: string): number {
  const crew = crewId ? CREW_BY_ID[crewId] : undefined;
  return Math.floor(channel(state, "carry")) + (crew?.carry ?? 0);
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
  for (let i = 0; i < count; i++) {
    const partId = pickWeighted(
      state,
      place.finds.map((f) => ({ item: f.partId, weight: f.weight * (spec.focus && getPart(f.partId).category === spec.focus ? 3 : 1) })),
    );
    let condition = pickWeighted(state, place.condition.map((w, c) => ({ item: c, weight: w })));
    const shift = quality + flags.conditionShift;
    const whole = Math.trunc(shift);
    condition += whole;
    if (rand(state) < Math.abs(shift - whole)) condition += Math.sign(shift);
    if (quality >= 0.5 && condition < 1) condition = 1; // Junkyard Eyes floor
    condition = Math.max(0, Math.min(3, condition));
    const part: PartInstance = { uid: nextUid(state, "p"), partId, condition: condition as Condition, origin: place.name };
    finds.push(part);
    state.meta.codex.parts[partId] = (state.meta.codex.parts[partId] ?? 0) + 1;
  }
  state.run.inventory.push(...finds);
  state.meta.codex.places[place.id] = (state.meta.codex.places[place.id] ?? 0) + 1;
  state.run.stats.hauls += 1;
  addJournal(state, "first_find", STORY.first_find);
  enforceStorage(state);
  return finds;
}
