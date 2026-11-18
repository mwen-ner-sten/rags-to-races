import { getPart } from "./content/parts";
import { PLACES } from "./content/places";
import { reservedPartUids, vehicleBusy } from "./garage";
import type { GameState, PartInstance } from "./types";

const HAUL_ORIGINS = new Set(PLACES.map((place) => place.name));

export function isHauledPart(part: PartInstance): boolean {
  // Sedan shells bought at the Auction counter have the same label as haul finds.
  return part.partId !== "beater_shell" && HAUL_ORIGINS.has(part.origin);
}

export function isCarryableSalvage(part: PartInstance): boolean {
  const def = getPart(part.partId);
  return isHauledPart(part) && def.tier <= 2 && def.category !== "junk";
}

export function salvageCarryUnlocked(state: GameState): boolean {
  return (state.meta.challengeRecords.parts_with_a_past?.completions ?? 0) >= 1;
}

export function salvageCarryCandidates(state: GameState): { part: PartInstance; location: string }[] {
  const reserved = reservedPartUids(state);
  const candidates = [
    ...state.run.inventory.map((part) => ({ part, location: "Garage" })),
    ...state.run.driveway.map((part) => ({ part, location: "Driveway" })),
  ];
  for (const car of state.run.vehicles) {
    if (vehicleBusy(state, car.uid)) continue;
    for (const [slot, part] of Object.entries(car.parts)) {
      if (part) candidates.push({ part, location: `${car.name} · ${slot}` });
    }
  }
  return candidates.filter(({ part }) => !part.inherited && !reserved.has(part.uid) && isCarryableSalvage(part));
}

export function salvageCarryBlocker(state: GameState, partUid: string, hardships: readonly string[]): string | null {
  if (!salvageCarryUnlocked(state)) return "Complete Parts With a Past to carry a part";
  if (hardships.includes("rookie_plates")) return "Rookie Plates disables salvage carryover";
  if (!salvageCarryCandidates(state).some(({ part }) => part.uid === partUid)) return "That part is no longer eligible to carry";
  return null;
}
