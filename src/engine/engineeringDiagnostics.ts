import type { CircuitDefinition } from "@/data/circuits";
import { CONDITION_LABELS, CONDITIONS, getPartById, type CoreSlot, type PartCondition } from "@/data/parts";
import type { BuiltVehicle, InstalledPart } from "./build";
import type { RaceOutcome } from "./race";

export type EngineeringFocus = "power" | "grip" | "aero" | "reliability" | "fuel";
export type EngineeringPriority = "repair" | "component" | "setup";

export interface EngineeringReport {
  headline: string;
  focus: EngineeringFocus;
  priority: EngineeringPriority;
  component?: string;
  componentCondition?: PartCondition;
  vehicleCondition?: number;
  slot?: CoreSlot;
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

const FOCUS_SLOTS: Record<EngineeringFocus, CoreSlot[]> = {
  power: ["engine", "drivetrain", "exhaust"],
  grip: ["wheel", "suspension"],
  aero: ["aero", "frame"],
  reliability: ["engine", "wheel", "frame", "fuel", "electronics", "drivetrain", "exhaust", "suspension", "aero"],
  fuel: ["fuel", "engine"],
};

const OBSERVATIONS: Record<EngineeringFocus, string> = {
  power: "This circuit rewards power and acceleration; straight-line performance is the clearest place to gain time.",
  grip: "This circuit is grip-limited through its corners and surface changes; tire and suspension quality matter most.",
  aero: "This circuit places a high demand on aerodynamic stability and high-speed handling.",
  reliability: "This event punishes fragile builds; dependable components and vehicle condition matter more than peak pace.",
  fuel: "This event stretches fuel range and race management, so the fuel system is the limiting concern.",
};

function dominantDemand(circuit: CircuitDefinition): EngineeringFocus {
  const demands = Object.entries(circuit.profile.demands) as [EngineeringFocus, number][];
  return demands.reduce((best, current) => current[1] > best[1] ? current : best)[0];
}

function conditionRank(installed: InstalledPart): number {
  return CONDITIONS.indexOf(installed.part.condition);
}

interface DiagnosedComponent {
  slot: CoreSlot;
  installed: InstalledPart;
}

function relevantComponent(vehicle: BuiltVehicle, focus: EngineeringFocus): DiagnosedComponent | undefined {
  const relevant = FOCUS_SLOTS[focus]
    .map((slot) => ({ slot, installed: vehicle.parts[slot] }))
    .filter((candidate): candidate is DiagnosedComponent => Boolean(candidate.installed));
  const candidates = relevant.length > 0
    ? relevant
    : (Object.entries(vehicle.parts) as [CoreSlot, InstalledPart][])
        .map(([slot, installed]) => ({ slot, installed }));
  return candidates.sort((left, right) => conditionRank(left.installed) - conditionRank(right.installed))[0];
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
  const focus = outcome.result === "dnf" ? "reliability" : dominantDemand(circuit);
  const diagnosed = relevantComponent(vehicle, focus);
  const installed = diagnosed?.installed;
  const definition = installed ? getPartById(installed.part.definitionId) : undefined;
  const component = definition?.name;
  const condition = installed ? CONDITION_LABELS[installed.part.condition] : undefined;

  if (vehicle.condition < 50 || outcome.result === "dnf") {
    const conditionObservation = outcome.result === "dnf"
      ? "The DNF adds breakdown wear, so inspect the vehicle's current condition before entering again."
      : `The vehicle is at ${Math.round(vehicle.condition)}% condition.`;
    return {
      headline: resultHeadline(outcome),
      focus,
      priority: "repair",
      component,
      componentCondition: installed?.part.condition,
      vehicleCondition: vehicle.condition,
      slot: diagnosed?.slot,
      observation: `${OBSERVATIONS[focus]} ${conditionObservation}`,
      action: "Repair the vehicle before the next entry, then reassess the highlighted component instead of risking another avoidable breakdown.",
    };
  }

  if (!installed || !component || !condition) {
    return {
      headline: resultHeadline(outcome),
      focus,
      priority: "setup",
      vehicleCondition: vehicle.condition,
      observation: OBSERVATIONS[focus],
      action: `Look for a compatible ${FOCUS_SLOTS[focus][0]} upgrade or choose a circuit that better matches the current chassis.`,
    };
  }

  const lowCondition = conditionRank(installed) <= CONDITIONS.indexOf("decent");
  return {
    headline: resultHeadline(outcome),
    focus,
    priority: "component",
    component,
    componentCondition: installed.part.condition,
    vehicleCondition: vehicle.condition,
    slot: diagnosed.slot,
    observation: `${OBSERVATIONS[focus]} The relevant ${component} is ${condition.toLowerCase()}.`,
    action: lowCondition
      ? `Refurbish or replace the ${component} before the rematch; a better ${definition.category} part should make the improvement visible.`
      : `Compare the ${component} with another ${definition.category} option, or tune the race plan around its current strengths.`,
  };
}
