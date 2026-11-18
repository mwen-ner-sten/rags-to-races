import { getPlace } from "./content/places";
import type { SlotDef, VehicleDef } from "./content/vehicles";
import { reservedPartUids } from "./garage";
import { haulOdds } from "./haul";
import { partScoreAt, rawScore } from "./race";
import type { DisciplineId, GameState, MaterialId, PartInstance, Vehicle } from "./types";

export function fittingParts(free: readonly PartInstance[], slot: SlotDef): PartInstance[] {
  return free.filter((part) => slot.accepts.includes(part.partId) && part.condition > 0 && part.condition >= (slot.minCondition ?? 0));
}

export function haulSourcesForSlot(state: GameState, slot: SlotDef) {
  return state.run.placesOpen.map((placeId) => ({
    place: getPlace(placeId),
    chance: haulOdds(placeId).reduce((sum, entry) => slot.accepts.includes(entry.item) ? sum + entry.chance : sum, 0),
  })).filter((entry) => entry.chance > 0).sort((a, b) => b.chance - a.chance);
}

export function partSwapGain(vehicle: Vehicle, slot: string, part: PartInstance, discipline: DisciplineId, venueId?: string): number {
  const changed = { ...vehicle, parts: { ...vehicle.parts, [slot]: part } };
  return rawScore(changed, discipline, venueId) - rawScore(vehicle, discipline, venueId);
}

export function blueprintPlan(state: GameState, vehicle: VehicleDef, picks: Record<string, string>) {
  const discipline = state.era?.discipline ?? "dirt";
  const reserved = reservedPartUids(state);
  const free = state.run.inventory.filter((part) => !reserved.has(part.uid));
  const used = new Set<string>();
  const chosen: Record<string, string> = {};
  const slots = vehicle.slots.map((slot) => {
    const options = fittingParts(free, slot).filter((part) => !used.has(part.uid));
    const fixed = options.find((part) => part.uid === picks[slot.slot]);
    const choice = fixed ?? (picks[slot.slot] !== "" ? options.reduce<PartInstance | undefined>((best, part) =>
      !best || partScoreAt(part, discipline, undefined, slot.slot) > partScoreAt(best, discipline, undefined, slot.slot) ? part : best, undefined) : undefined);
    if (choice) {
      chosen[slot.slot] = choice.uid;
      used.add(choice.uid);
    }
    const fixable = free.filter((part) => slot.accepts.includes(part.partId) && (part.condition === 0 || part.condition < (slot.minCondition ?? 0)));
    return { slot, options, fixable };
  });
  const required = vehicle.slots.filter((slot) => slot.required);
  const missing = Object.entries(vehicle.materials).flatMap(([material, amount]) => {
    const deficit = amount - state.run.materials[material as MaterialId];
    return deficit > 0 ? [{ material, deficit }] : [];
  });
  return { chosen, slots, missing, ready: required.filter((slot) => !!chosen[slot.slot]).length, required: required.length };
}
