import { getPart } from "./content/parts";
import { getVehicle } from "./content/vehicles";
import { venueName } from "./content/events";
import { vehicleBusy } from "./garage";
import { afterChange, dispatch } from "./jobs";
import { logSeason } from "./journal";
import { nextUid } from "./rng";
import { releaseVehicle } from "./vehicleArchive";
import type { GameState, HallOfFameEntry, JobSpec, Vehicle } from "./types";

export type HeritageKind = "exhibit" | "special";
export interface HeritageProject {
  uid: string;
  kind: HeritageKind;
  oldSeason: number;
  originalName: string;
  model: string;
  parts: { slot: string; partId: string }[];
  completed?: string;
}
export interface HeritageAward {
  kind: HeritageKind;
  model: string;
  originalName: string;
  carName: string;
  season: number;
  completions: number;
}
export type HeritageMove =
  | { type: "start"; archiveIndex: number; kind: HeritageKind }
  | { type: "cancel" }
  | { type: "donate"; vehicleUid: string }
  | { type: "claim"; kind: HeritageKind; model: string };

export const HERITAGE_VENUES = ["backyard", "dirt", "county_fair", "regional", "state"];

export function eligibleHistory(game: GameState, entry: HallOfFameEntry): boolean {
  return entry.season <= game.meta.seasonsPlayed && entry.history.races > entry.history.dnfs &&
    getVehicle(entry.vehicleId).slots.every((slot) => !slot.required || entry.parts.some((part) => part.slot === slot.slot && slot.accepts.includes(part.partId)));
}

export function heritageFit(project: HeritageProject, vehicle: Vehicle): string | null {
  if (vehicle.vehicleId !== project.model) return `Build a ${getVehicle(project.model).name}.`;
  for (const slot of getVehicle(project.model).slots) {
    const part = vehicle.parts[slot.slot];
    if (slot.required && !part) return `Fit the ${slot.slot}.`;
    if (part && part.condition < 2) return `Bring the ${getPart(part.partId).name} to Worn condition or better.`;
  }
  const installed = Object.entries(vehicle.parts).filter(([, p]) => p);
  const matching = project.parts.filter((p) => vehicle.parts[p.slot]?.partId === p.partId);
  if (project.kind === "special") {
    if (!matching.length) return "Keep at least one original component model in its original slot.";
    return installed.length > matching.length ? null : "Fit at least one different component or an extra accessory.";
  }
  const missing = project.parts.find((p) => vehicle.parts[p.slot]?.partId !== p.partId);
  if (missing) return `Fit the original ${getPart(missing.partId).name} in the ${missing.slot} slot.`;
  return installed.length === matching.length ? null : "Remove accessories the original did not carry.";
}

function awardProject(game: GameState, project: HeritageProject, car: Vehicle) {
  project.completed = car.name || getVehicle(car.vehicleId).name;
  const entries = game.meta.heritageRegister ??= [];
  const earned = entries.find((record) => record.model === car.vehicleId && record.kind === project.kind);
  const credit = { model: car.vehicleId, kind: project.kind, originalName: project.originalName, carName: project.completed, season: game.meta.seasonsPlayed + 1, completions: (earned?.completions ?? 0) + 1 };
  if (earned) Object.assign(earned, credit);
  else entries.push(credit);
  const key = `heritage:${project.uid}`;
  logSeason(game, key, `${car.name} entered the heritage register as a ${project.kind === "exhibit" ? "museum exhibit" : "period special"} based on ${project.originalName}.`, key);
}

export function exhibitBlocker(game: GameState, project: HeritageProject, car: Vehicle): string | null {
  if (project.kind !== "exhibit" || project.completed) return "Open an unfinished museum project.";
  if (vehicleBusy(game, car.uid) || game.run.queue.some((job) => job.kind === "race" && job.vehicleUid === car.uid) || game.run.raceNight?.vehicleUid === car.uid) return "Finish or withdraw the car's racing entries.";
  if (game.manufacturer?.active?.vehicleUid === car.uid) return "Release the car from its works agreement first.";
  if (Object.values(car.parts).some((part) => part?.batonGuard)) return "Pull the safeguarded County Baton part before donating this vehicle.";
  if (car.history.races <= car.history.dnfs) return "Finish a shakedown race in this car before donating it.";
  return heritageFit(project, car);
}

export function heritageManual(model: string): string {
  return getVehicle(model).blueprint ?? "blueprint:riding_mower";
}
export function heritageClaimBlocker(game: GameState, kind: HeritageKind, model: string): string | null {
  if (!game.meta.heritageRegister?.some((award) => award.kind === kind && award.model === model)) return "Complete this model's heritage project first.";
  if (kind === "special") {
    if (game.run.learned.includes("tech:tuning") || game.run.heritageSetups?.includes(model)) return "Tuning is already available.";
    return game.run.materials.metal < 1 || game.run.materials.rubber < 1 ? "The setup jig needs one Metal and one Rubber." : null;
  }
  const manual = heritageManual(model);
  if (game.run.learned.includes(manual) || game.run.available.includes(manual)) return "These plans are already in your workshop.";
  return game.run.cash < 12 ? "Printing the drawings costs 12 Scrap Bucks." : null;
}

export function applyHeritage(game: GameState, move: HeritageMove): string | null {
  const project = game.run.heritageProject;
  if (move.type === "start") {
    if (project) return project.completed ? "A heritage project has already been completed this Season." : "Finish or release the active project.";
    const entry = game.meta.hallOfFame[move.archiveIndex];
    if (!entry || !eligibleHistory(game, entry)) return "Choose a previous Season's complete, race-finished build.";
    game.run.heritageProject = { uid: nextUid(game, "h"), kind: move.kind, model: entry.vehicleId, originalName: entry.name, oldSeason: entry.season,
      parts: entry.parts.map(({ slot, partId }) => ({ slot, partId })) };
    return null;
  }
  if (move.type === "claim") {
    const blocked = heritageClaimBlocker(game, move.kind, move.model);
    if (blocked) return blocked;
    if (move.kind === "exhibit") {
      game.run.cash -= 12;
      game.run.available.push(heritageManual(move.model));
    } else {
      game.run.materials.metal -= 1;
      game.run.materials.rubber -= 1;
      (game.run.heritageSetups ??= []).push(move.model);
    }
    return null;
  }
  if (!project || project.completed) return "There is no open heritage project.";
  if (move.type === "cancel") { delete game.run.heritageProject; return null; }
  const car = game.run.vehicles.find((vehicle) => vehicle.uid === move.vehicleUid);
  if (!car) return "Choose a car in this garage.";
  const blocked = exhibitBlocker(game, project, car);
  if (blocked) return blocked;
  releaseVehicle(game, car, "exhibit");
  awardProject(game, project, car);
  afterChange(game);
  dispatch(game);
  return null;
}

export function heritageRaceEntry(game: GameState, car: Vehicle, spec: Extract<JobSpec, { kind: "race" }>): string | undefined {
  const p = game.run.heritageProject;
  if (!p || p.kind !== "special" || p.completed || spec.event !== "feature" || spec.venueId !== HERITAGE_VENUES[getVehicle(car.vehicleId).tier]) return;
  return heritageFit(p, car) === null ? p.uid : undefined;
}
export function heritageFinish(game: GameState, car: Vehicle, ticket: string | undefined, position: number, dnf: boolean) {
  const project = game.run.heritageProject;
  if (ticket && project?.uid === ticket && !project.completed && !dnf && position <= 3) awardProject(game, project, car);
}
export function heritageReferencesValid(game: GameState): boolean {
  const register = game.meta.heritageRegister ?? [];
  const season = game.meta.seasonsPlayed + 1;
  if (new Set(register.map((r) => r.model + "/" + r.kind)).size !== register.length ||
      register.some((r) => r.season > season || r.completions > r.season)) return false;
  const setups = game.run.heritageSetups ?? [];
  if (new Set(setups).size !== setups.length || setups.some((model) => !register.some((r) => r.kind === "special" && r.model === model))) return false;
  const project = game.run.heritageProject;
  if (!project) return true;
  const slots = getVehicle(project.model).slots;
  if (project.oldSeason >= season || new Set(project.parts.map((p) => p.slot)).size !== project.parts.length) return false;
  if (!slots.every((slot) => !slot.required || project.parts.some((p) => p.slot === slot.slot)) ||
      !project.parts.every((p) => slots.some((slot) => slot.slot === p.slot && slot.accepts.includes(p.partId)))) return false;
  return project.completed === undefined || register.some((r) => r.kind === project.kind && r.model === project.model && r.season === season && r.carName === project.completed);
}

export function heritageVenue(game: GameState, model: string) {
  return venueName(HERITAGE_VENUES[getVehicle(model).tier], game.era?.discipline ?? "dirt");
}
