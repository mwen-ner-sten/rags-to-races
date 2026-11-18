import type { GameState, HallOfFameEntry, Vehicle } from "./types";

export function archiveVehicle(state: GameState, vehicle: Vehicle, retirement?: HallOfFameEntry["retirement"]): void {
  const archive = state.meta.hallOfFame;
  archive.push({
    season: state.meta.seasonsPlayed + 1,
    vehicleId: vehicle.vehicleId,
    name: vehicle.name,
    history: { ...vehicle.history },
    parts: Object.entries(vehicle.parts).flatMap(([slot, part]) => part ? [{ slot, partId: part.partId, condition: part.condition, origin: part.origin }] : []),
    ...(retirement ? { retirement } : {}),
  });
  if (archive.length > 200) archive.splice(0, archive.length - 200);
}

export function retiredVehicle(state: GameState, uid: string): HallOfFameEntry | undefined {
  return state.meta.hallOfFame.find((entry) => entry.retirement?.vehicleUid === uid);
}
