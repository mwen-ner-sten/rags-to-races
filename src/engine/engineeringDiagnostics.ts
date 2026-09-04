import type { CircuitDefinition } from "@/data/circuits";
import { CONDITION_LABELS, CONDITIONS, getPartById, type CoreSlot } from "@/data/parts";
import { getVehicleById } from "@/data/vehicles";
import { expectedLoadedWeight, type BuiltVehicle, type InstalledPart } from "./build";
import { deriveVehicleStats } from "./performance";
import type { RaceOutcome } from "./race";

export type EngineeringFocus = "power" | "grip" | "weight" | "reliability" | "fuel";
export type EngineeringPriority = "repair" | "component" | "setup";

export interface EngineeringReport {
  headline: string;
  focus: EngineeringFocus;
  priority: EngineeringPriority;
  component?: string;
  observation: string;
  action: string;
}

export function findDiagnosticVehicle(
  garage: readonly BuiltVehicle[],
  outcomeVehicleId: string | undefined,
): BuiltVehicle | undefined {
  if (!outcomeVehicleId) return undefined;
  return garage.find((vehicle) => vehicle.id === outcomeVehicleId);
}

/** Slots that move each focus stat, in the order they matter most. */
const FOCUS_SLOTS: Record<EngineeringFocus, CoreSlot[]> = {
  power: ["engine", "drivetrain", "exhaust", "electronics"],
  grip: ["wheel", "suspension", "aero", "frame"],
  weight: ["frame", "engine", "drivetrain", "suspension"],
  reliability: ["engine", "wheel", "frame", "fuel", "electronics", "drivetrain", "exhaust", "suspension", "aero"],
  fuel: ["fuel", "engine"],
};

const OBSERVATIONS: Record<EngineeringFocus, string> = {
  power: "This circuit is decided on the straights, and this build is short on pace relative to its grip.",
  grip: "This circuit is decided in the corners, and this build is short on grip relative to its pace.",
  weight: "This build is carrying far more weight than the chassis was meant to, and it is costing grip more than pace.",
  reliability: "This event punishes fragile builds; dependable components and vehicle condition matter more than peak pace.",
  fuel: "This event stretches fuel range and race management, so the fuel system is the limiting concern.",
};

/** Excess over the chassis' expected load at which weight becomes the story. */
const WEIGHT_FOCUS_THRESHOLD = 0.2;

/**
 * Which stat is holding the build back on this circuit. Compares the build's
 * speed:handling balance to the circuit's power:grip demand instead of just
 * reading the circuit's dominant demand off the data.
 */
export function diagnoseFocus(vehicle: BuiltVehicle, circuit: CircuitDefinition, outcome: RaceOutcome): EngineeringFocus {
  if (outcome.result === "dnf") return "reliability";
  const { power, grip, aero, fuel } = circuit.profile.demands;
  if (fuel >= 8 && (outcome.planEvaluation?.fuelRisk ?? 0) > 0.1) return "fuel";

  // Stats are derived from the installed parts, never read off the cached snapshot.
  const stats = deriveVehicleStats(vehicle);
  const definition = getVehicleById(vehicle.definitionId);
  if (definition) {
    const expected = expectedLoadedWeight(definition, vehicle.parts);
    if (expected > 0 && (stats.weight - expected) / expected > WEIGHT_FOCUS_THRESHOLD) return "weight";
  }

  // Speed outweighs handling in raw numbers on every chassis, so measure how
  // the build leans relative to its own chassis, and how the circuit leans
  // relative to an even power / grip+aero split.
  const base = definition?.baseStats;
  const baseShare = base ? base.speed / Math.max(1, base.speed + base.handling) : 0.5;
  const buildShare = stats.speed / Math.max(1, stats.speed + stats.handling);
  const buildLean = buildShare - baseShare;             // > 0: built for pace
  const circuitLean = power / Math.max(1, power + grip + aero) - 0.5; // > 0: rewards pace
  if (circuitLean > 0) return buildLean <= circuitLean ? "power" : "grip";
  return buildLean >= circuitLean ? "grip" : "power";
}

function conditionRank(installed: InstalledPart): number {
  return CONDITIONS.indexOf(installed.part.condition);
}

/** The installed part with the most room to improve for this focus. */
function relevantComponent(vehicle: BuiltVehicle, focus: EngineeringFocus): InstalledPart | undefined {
  const relevant = FOCUS_SLOTS[focus]
    .map((slot) => vehicle.parts[slot])
    .filter((part): part is InstalledPart => Boolean(part));
  const candidates = relevant.length > 0 ? relevant : Object.values(vehicle.parts);
  if (focus === "weight") {
    return [...candidates].sort((left, right) => {
      const leftWeight = getPartById(left.part.definitionId)?.baseWeight ?? 0;
      const rightWeight = getPartById(right.part.definitionId)?.baseWeight ?? 0;
      return rightWeight - leftWeight;
    })[0];
  }
  return [...candidates].sort((left, right) => conditionRank(left) - conditionRank(right))[0];
}

function resultHeadline(outcome: RaceOutcome): string {
  if (outcome.result === "win") return "The build worked — now turn the win into a repeatable advantage.";
  if (outcome.result === "dnf") return "The race exposed a survival problem before outright pace mattered.";
  return `P${outcome.position} finished the race, but the build left performance on the table.`;
}

export function buildEngineeringReport(
  vehicle: BuiltVehicle,
  circuit: CircuitDefinition,
  outcome: RaceOutcome,
): EngineeringReport {
  const focus = diagnoseFocus(vehicle, circuit, outcome);
  const installed = relevantComponent(vehicle, focus);
  const definition = installed ? getPartById(installed.part.definitionId) : undefined;
  const component = definition?.name;
  const condition = installed ? CONDITION_LABELS[installed.part.condition] : undefined;

  if (vehicle.condition < 50 || outcome.result === "dnf") {
    return {
      headline: resultHeadline(outcome),
      focus,
      priority: "repair",
      component,
      observation: `${OBSERVATIONS[focus]} The vehicle is at ${Math.round(vehicle.condition)}% condition, and a damaged car breaks down more often.`,
      action: "Repair the vehicle before the next entry, then reassess the highlighted component instead of risking another avoidable breakdown.",
    };
  }

  if (!installed || !component || !condition) {
    return {
      headline: resultHeadline(outcome),
      focus,
      priority: "setup",
      observation: OBSERVATIONS[focus],
      action: `Look for a compatible ${FOCUS_SLOTS[focus][0]} upgrade or choose a circuit that better matches the current chassis.`,
    };
  }

  if (focus === "weight") {
    return {
      headline: resultHeadline(outcome),
      focus,
      priority: "component",
      component,
      observation: `${OBSERVATIONS[focus]} The heaviest contributor is the ${component}.`,
      action: `Swap the ${component} for a lighter ${definition.category} option, or shed weight elsewhere before adding more power.`,
    };
  }

  const lowCondition = conditionRank(installed) <= CONDITIONS.indexOf("decent");
  return {
    headline: resultHeadline(outcome),
    focus,
    priority: "component",
    component,
    observation: `${OBSERVATIONS[focus]} The relevant ${component} is ${condition.toLowerCase()}.`,
    action: lowCondition
      ? `Refurbish or replace the ${component} before the rematch; a better ${definition.category} part should make the improvement visible.`
      : `Compare the ${component} with another ${definition.category} option, or tune the race plan around its current strengths.`,
  };
}
