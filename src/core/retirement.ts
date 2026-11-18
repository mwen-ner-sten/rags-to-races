import { getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import { garageSpace, stripYield, vehicleBusy } from "./garage";
import { afterChange, dispatch } from "./jobs";
import { logSeason } from "./journal";
import { nextUid } from "./rng";
import { archiveVehicle } from "./vehicleArchive";
import type { GameState, MaterialId, PartInstance, Vehicle } from "./types";

export const MOWER_EXCHANGE = { cash: 12, parts: ["engine_tiller", "wheel_knobby"], condition: 2 } as const;

export type RetirementMove = { kind: "dismantle"; keepUid: string } | { kind: "exchange" };

type RetirementPlan = { vehicle: Vehicle; retained: PartInstance | null; materials: Partial<Record<MaterialId, number>>; cash: number };

export function canRetireMower(vehicle: Vehicle): boolean {
  return (vehicle.vehicleId === "push_mower" || vehicle.vehicleId === "riding_mower") && vehicle.history.races > vehicle.history.dnfs;
}

export function retirementPlan(state: GameState, vehicleUid: string, move: RetirementMove): RetirementPlan | string {
  const vehicle = state.run.vehicles.find((car) => car.uid === vehicleUid);
  if (!vehicle || !canRetireMower(vehicle)) return "Finish a race in a Push or Riding Mower first";
  if (state.run.raceNight?.vehicleUid === vehicleUid) return "Cancel this mower's Race Night first";
  if (vehicleBusy(state, vehicleUid) || state.run.queue.some((job) => job.kind === "race" && job.vehicleUid === vehicleUid)) {
    return "Finish or remove this mower's race sign-ups first";
  }
  const parts = Object.values(vehicle.parts).filter((part) => part !== undefined);
  const room = garageSpace(state) - state.run.inventory.length;
  if (move.kind === "exchange") {
    if (getVehicle(vehicle.vehicleId).slots.some((slot) => slot.required && !vehicle.parts[slot.slot])) return "Fit every required part before exchanging the mower";
    if (state.run.cash < MOWER_EXCHANGE.cash) return `Needs ${MOWER_EXCHANGE.cash} Scrap Bucks`;
    if (room < MOWER_EXCHANGE.parts.length) return `Free ${MOWER_EXCHANGE.parts.length} garage spaces for the kit`;
    return { vehicle, retained: null, materials: {}, cash: MOWER_EXCHANGE.cash };
  }
  const retained = parts.find((part) => part.uid === move.keepUid);
  if (!retained) return "Choose an installed part to keep";
  if (room < 1) return "Free one garage space for the kept part";
  const materials: Partial<Record<MaterialId, number>> = {};
  for (const part of parts) {
    if (part.uid === retained.uid) continue;
    const yields = stripYield(part);
    for (const material of ["metal", "rubber", "wiring"] as const) {
      const amount = yields[material] ?? 0;
      if (amount > 0) materials[material] = (materials[material] ?? 0) + amount;
    }
  }
  return { vehicle, retained, materials, cash: 0 };
}

export function retireVehicle(state: GameState, vehicleUid: string, move: RetirementMove): string | null {
  const plan = retirementPlan(state, vehicleUid, move);
  if (typeof plan === "string") return plan;
  const { vehicle, retained, materials, cash } = plan;
  archiveVehicle(state, vehicle, { kind: move.kind, vehicleUid, seasonMs: state.run.seasonMs });
  state.run.vehicles = state.run.vehicles.filter((car) => car.uid !== vehicleUid);
  state.run.cash -= cash;
  for (const material of ["metal", "rubber", "wiring"] as const) state.run.materials[material] += materials[material] ?? 0;
  if (retained) state.run.inventory.push(retained);
  else {
    for (const partId of MOWER_EXCHANGE.parts) {
      state.run.inventory.push({ uid: nextUid(state, "p"), partId, condition: MOWER_EXCHANGE.condition, origin: "Mower exchange" });
      state.meta.codex.parts[partId] = (state.meta.codex.parts[partId] ?? 0) + 1;
    }
  }

  const templatePrefix = `race:${vehicleUid}:`;
  state.run.habitSlots = state.run.habitSlots.map((habit) => habit?.startsWith(templatePrefix) ? null : habit);
  for (const member of state.era?.crew ?? []) {
    if (member.assignment.type === "habit" && member.assignment.template.startsWith(templatePrefix)) member.assignment = { type: "queue" };
  }
  logSeason(state, "mower-retired", retained ? `${vehicle.name} retired. Kept its ${getPart(retained.partId).name}.` : `${vehicle.name} retired at the mower exchange. The replacement kit is in the garage.`);
  afterChange(state);
  dispatch(state);
  return null;
}
