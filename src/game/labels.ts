import { venueName } from "@/core/content/events";
import { getKnowhow } from "@/core/content/knowhow";
import { getPart } from "@/core/content/parts";
import { PLACE_BY_ID } from "@/core/content/places";
import { CREW_BY_ID } from "@/core/content/team";
import { getVehicle } from "@/core/content/vehicles";
import { templateBase } from "@/core/habits";
import type { GameState, JobSpec } from "@/core/types";
import { capitalize } from "./format";

function partName(state: GameState, uid?: string): string {
  const part = uid ? state.run.inventory.find((p) => p.uid === uid) : undefined;
  return part ? getPart(part.partId).name : "a part";
}

export function jobLabel(state: GameState, spec: JobSpec): string {
  switch (spec.kind) {
    case "haul":
      return `Trip: ${PLACE_BY_ID[spec.placeId]?.name ?? spec.placeId}${spec.focus ? ` (looking for ${spec.focus})` : ""}`;
    case "clean":
      return `Clean ${partName(state, spec.partUid)}`;
    case "repair":
      return `Repair ${partName(state, spec.partUid)}`;
    case "restore":
      return `Restore ${partName(state, spec.partUid)}`;
    case "strip":
      return `Strip ${partName(state, spec.partUid)}`;
    case "study":
      return `Study: ${getKnowhow(spec.knowhowId).name}`;
    case "assemble":
      return `Assemble ${getVehicle(spec.vehicleId).name}`;
    case "race": {
      const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
      return `${venueName(spec.venueId, state.era?.discipline ?? "dirt")} ${capitalize(spec.event)}${vehicle ? ` · ${vehicle.name}` : ""}`;
    }
  }
}

export function laneLabel(lane: string): string {
  if (lane === "hands") return "You";
  if (lane.startsWith("bench:")) return `Bench ${Number(lane.slice(6)) + 1}`;
  if (lane.startsWith("habit:")) return `Habit ${Number(lane.slice(6)) + 1}`;
  if (lane.startsWith("crew:")) return CREW_BY_ID[lane.slice(5)]?.name ?? "Crew";
  return lane;
}

/** Habit choices for a slot or a crew member; Race Day repeats a recent race setup. */
export function habitOptions(state: GameState): string[] {
  const seen = new Set<string>();
  const races: string[] = [];
  if (state.run.habitsKnown.includes("race")) {
    for (const race of [...state.run.races].reverse()) {
      if (!state.run.vehicles.some((v) => v.uid === race.vehicleUid)) continue;
      const key = `race:${race.vehicleUid}:${race.venueId}:${race.event}:${race.call}`;
      if (seen.has(key)) continue;
      seen.add(key);
      races.push(key);
      if (races.length >= 5) break;
    }
  }
  return [...state.run.habitsKnown.filter((t) => t !== "race"), ...races];
}

export function habitLabel(state: GameState, template: string): string {
  const base = templateBase(template);
  if (base.startsWith("haul:")) return `Trips to ${PLACE_BY_ID[base.slice(5)]?.name ?? base.slice(5)}`;
  if (base === "race") {
    const [, vehicleUid, venueId, event] = template.split(":");
    if (!venueId) return "Race Day";
    const vehicle = state.run.vehicles.find((v) => v.uid === vehicleUid);
    return `Race Day: ${venueName(venueId, state.era?.discipline ?? "dirt")} ${event}${vehicle ? ` (${vehicle.name})` : ""}`;
  }
  return { clean: "Cleaning", repair: "Repairs", strip: "Stripping" }[base] ?? base;
}
