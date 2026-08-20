import type { VehicleDefinition } from "@/data/vehicles";
import type { BuildAxis, BuildIdentityId } from "@/data/buildIdentities";
import type { CircuitProfile } from "@/data/raceStrategy";
import { calculateStats, type BuiltVehicle, type InstalledPart, type VehicleStats } from "./build";
import type { ScavengedPart } from "./scavenge";
import { CONDITIONS, getPartById } from "@/data/parts";
import { getAddonById } from "@/data/addons";

export interface BuildProfile {
  modelVersion: 1;
  identity: BuildIdentityId | null;
  dominantAxis: BuildAxis;
  runnerUpAxis: BuildAxis;
  indices: Record<BuildAxis, number>;
  dominanceGap: number;
  fullConditionStats: VehicleStats;
}

export interface BuildCircuitEvaluation {
  profile: BuildProfile;
  demand: Record<BuildAxis, number>;
  alignment: number;
  specialization: number;
  performanceMultiplier: number;
  limitingAxis: BuildAxis;
  supportingAxis: BuildAxis;
}

const AXES: BuildAxis[] = ["pace", "handling", "reliability"];
const referenceCache = new Map<string, VehicleStats>();

function referencePart(definitionId: string, slot: string): InstalledPart {
  const part: ScavengedPart = {
    id: `build-reference-${slot}-${definitionId}`,
    definitionId,
    condition: "good",
    foundAt: "build-reference",
    type: "part",
  };
  return { part, addons: [] };
}

function enumerateRequiredParts(
  definition: VehicleDefinition,
  slotIndex = 0,
  parts: BuiltVehicle["parts"] = {},
): BuiltVehicle["parts"][] {
  const requiredSlots = definition.slots.filter((slot) => slot.required);
  const slot = requiredSlots[slotIndex];
  if (!slot) return [{ ...parts }];
  return slot.acceptableParts.flatMap((definitionId) => enumerateRequiredParts(
    definition,
    slotIndex + 1,
    { ...parts, [slot.slot]: referencePart(definitionId, slot.slot) },
  ));
}

function getReferenceStats(definition: VehicleDefinition): VehicleStats {
  const cached = referenceCache.get(definition.id);
  if (cached) return cached;
  const combinations = enumerateRequiredParts(definition);
  const samples = combinations.map((parts) => calculateStats(definition, parts, 100, 0));
  const count = Math.max(1, samples.length);
  const reference = samples.reduce<VehicleStats>((total, stats) => ({
    speed: total.speed + stats.speed / count,
    handling: total.handling + stats.handling / count,
    reliability: total.reliability + stats.reliability / count,
    weight: total.weight + stats.weight / count,
    performance: total.performance + stats.performance / count,
  }), { speed: 0, handling: 0, reliability: 0, weight: 0, performance: 0 });
  referenceCache.set(definition.id, reference);
  return reference;
}

function identityForAxis(axis: BuildAxis): BuildIdentityId {
  if (axis === "pace") return "redline_special";
  if (axis === "handling") return "cornering_rig";
  return "finish_first";
}

export function classifyBuildIndices(indices: Record<BuildAxis, number>): {
  identity: BuildIdentityId | null;
  dominantAxis: BuildAxis;
  runnerUpAxis: BuildAxis;
  dominanceGap: number;
} {
  const ranked = AXES.map((axis) => ({ axis, index: indices[axis] }))
    .sort((left, right) => right.index - left.index);
  const [top, runnerUp] = ranked;
  const dominanceGap = top.index - runnerUp.index;
  return {
    identity: top.index >= 1.05 && dominanceGap >= 0.04 ? identityForAxis(top.axis) : null,
    dominantAxis: top.axis,
    runnerUpAxis: runnerUp.axis,
    dominanceGap,
  };
}

function hasMalformedHardware(vehicle: BuiltVehicle): boolean {
  return Object.values(vehicle.parts).some((installed) => (
    !getPartById(installed.part.definitionId)
    || !CONDITIONS.includes(installed.part.condition)
    || installed.addons.some((addon) => !getAddonById(addon.definitionId) || !CONDITIONS.includes(addon.condition))
  ));
}

export function calculateBuildProfile(
  definition: VehicleDefinition,
  vehicle: BuiltVehicle,
): BuildProfile {
  if (hasMalformedHardware(vehicle)) {
    return {
      modelVersion: 1,
      identity: null,
      dominantAxis: "pace",
      runnerUpAxis: "handling",
      indices: { pace: 1, handling: 1, reliability: 1 },
      dominanceGap: 0,
      fullConditionStats: calculateStats(definition, {}, 100, 0),
    };
  }
  const fullConditionStats = calculateStats(definition, vehicle.parts, 100, 0);
  const reference = getReferenceStats(definition);
  const indices: Record<BuildAxis, number> = {
    pace: fullConditionStats.speed / reference.speed,
    handling: fullConditionStats.handling / reference.handling,
    reliability: fullConditionStats.reliability / reference.reliability,
  };
  const classification = classifyBuildIndices(indices);

  return {
    modelVersion: 1,
    identity: classification.identity,
    dominantAxis: classification.dominantAxis,
    runnerUpAxis: classification.runnerUpAxis,
    indices,
    dominanceGap: classification.dominanceGap,
    fullConditionStats,
  };
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateBuildCircuitEvaluation(
  definition: VehicleDefinition,
  vehicle: BuiltVehicle,
  circuit: CircuitProfile,
): BuildCircuitEvaluation {
  const profile = calculateBuildProfile(definition, vehicle);
  const demand: Record<BuildAxis, number> = {
    pace: circuit.demands.power,
    handling: Math.max(circuit.demands.grip, circuit.demands.aero),
    reliability: circuit.demands.reliability,
  };
  const buildValues = AXES.map((axis) => profile.indices[axis]);
  const demandValues = AXES.map((axis) => demand[axis]);
  const buildMean = mean(buildValues);
  const demandMean = mean(demandValues);
  const centeredBuild = buildValues.map((value) => value - buildMean);
  const centeredDemand = demandValues.map((value) => value - demandMean);
  const dotProduct = centeredBuild.reduce((total, value, index) => total + value * centeredDemand[index], 0);
  const buildNorm = Math.sqrt(centeredBuild.reduce((total, value) => total + value * value, 0));
  const demandNorm = Math.sqrt(centeredDemand.reduce((total, value) => total + value * value, 0));
  const alignment = buildNorm === 0 || demandNorm === 0
    ? 0
    : clamp(dotProduct / (buildNorm * demandNorm), -1, 1);
  const specialization = clamp((Math.max(...buildValues) - Math.min(...buildValues)) / 0.25, 0, 1);
  const performanceMultiplier = clamp(1 + alignment * specialization * 0.05, 0.95, 1.05);
  const fitByAxis = AXES.map((axis) => ({ axis, fit: profile.indices[axis] - demand[axis] / demandMean }))
    .sort((left, right) => left.fit - right.fit);

  return {
    profile,
    demand,
    alignment,
    specialization,
    performanceMultiplier,
    limitingAxis: fitByAxis[0].axis,
    supportingAxis: fitByAxis[fitByAxis.length - 1].axis,
  };
}
