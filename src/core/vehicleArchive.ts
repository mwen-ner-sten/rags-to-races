import type { GameState, HallOfFameEntry, Vehicle } from "./types";

export function archiveVehicle(state: GameState, vehicle: Vehicle, retirement?: HallOfFameEntry["retirement"]): void {
  const archive = state.meta.hallOfFame;
  archive.push({
    season: state.meta.seasonsPlayed + 1,
    vehicleId: vehicle.vehicleId,
    name: vehicle.name,
    history: { ...vehicle.history },
    parts: Object.entries(vehicle.parts).flatMap(([slot, part]) => part ? [{ slot, partId: part.partId, condition: part.condition, origin: part.origin, ...(part.provenance && { provenance: { ...part.provenance } }) }] : []),
    ...(retirement ? { retirement } : {}),
  });
  if (archive.length > 200) archive.splice(0, archive.length - 200);
}

export function retiredVehicle(state: GameState, uid: string): HallOfFameEntry | undefined {
  return state.meta.hallOfFame.find((entry) => entry.retirement?.vehicleUid === uid);
}

export function vehicleForReplay(state: GameState, uid: string): Vehicle | HallOfFameEntry | undefined {
  const rig = state.motorPool?.custody?.rig;
  return state.run.vehicles.find((vehicle) => vehicle.uid === uid) ?? (rig?.uid === uid ? rig : undefined) ?? retiredVehicle(state, uid);
}

export function releaseVehicle(state: GameState, vehicle: Vehicle, kind: NonNullable<HallOfFameEntry["retirement"]>["kind"]): void {
  archiveVehicle(state, vehicle, { kind, vehicleUid: vehicle.uid, seasonMs: state.run.seasonMs });
  detachGarageVehicle(state, vehicle.uid);
}

export function detachGarageVehicle(state: GameState, vehicleUid: string): void {
  state.run.vehicles = state.run.vehicles.filter((car) => car.uid !== vehicleUid);
  const prefix = `race:${vehicleUid}:`;
  state.run.habitSlots = state.run.habitSlots.map((habit) => habit?.startsWith(prefix) ? null : habit);
  for (const crew of state.era?.crew ?? []) {
    if (crew.assignment.type === "habit" && crew.assignment.template.startsWith(prefix)) crew.assignment = { type: "queue" };
  }
}
