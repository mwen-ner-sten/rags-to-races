export type TireChoice = "soft" | "medium" | "hard" | "wet";
export type FuelLoad = "light" | "balanced" | "heavy";
export type GearingChoice = "short" | "balanced" | "long";
export type AeroChoice = "low" | "balanced" | "high";
export type SuspensionChoice = "soft" | "balanced" | "stiff";
export type AggressionChoice = "conserve" | "balanced" | "push";
export type PitStrategy = "none" | "reactive" | "scheduled";

export interface RacePlan { tire: TireChoice; fuelLoad: FuelLoad; gearing: GearingChoice; aero: AeroChoice; suspension: SuspensionChoice; aggression: AggressionChoice; pitStrategy: PitStrategy; }
export interface CircuitProfile {
  surface: "grass" | "gravel" | "asphalt";
  weather: "dry" | "variable" | "wet";
  length: "short" | "medium" | "long";
  cornerDensity: "low" | "medium" | "high";
  demands: { power: number; grip: number; aero: number; reliability: number; fuel: number };
  wearPressure: number;
  breakdownPressure: number;
  pitAvailable: boolean;
  rewardProfile: "local" | "regional" | "national" | "world" | "endurance";
}
export interface RacePlanEvaluation { performanceMultiplier: number; dnfDelta: number; wearMultiplier: number; fuelRisk: number; factors: { label: string; impact: "positive" | "neutral" | "negative"; detail: string }[]; }
export interface RaceForecast { winChance: { min: number; max: number }; dnfRisk: { min: number; max: number }; wear: { min: number; max: number }; fuelRisk: { min: number; max: number }; }

export const DEFAULT_RACE_PLAN: RacePlan = { tire: "medium", fuelLoad: "balanced", gearing: "balanced", aero: "balanced", suspension: "balanced", aggression: "balanced", pitStrategy: "reactive" };
export const RACE_PLAN_PRESETS: Record<"sprint" | "technical" | "endurance" | "wet", RacePlan> = {
  sprint: { tire: "soft", fuelLoad: "light", gearing: "short", aero: "low", suspension: "stiff", aggression: "push", pitStrategy: "none" },
  technical: { tire: "medium", fuelLoad: "balanced", gearing: "short", aero: "high", suspension: "soft", aggression: "balanced", pitStrategy: "reactive" },
  endurance: { tire: "hard", fuelLoad: "heavy", gearing: "long", aero: "balanced", suspension: "soft", aggression: "conserve", pitStrategy: "scheduled" },
  wet: { tire: "wet", fuelLoad: "balanced", gearing: "short", aero: "high", suspension: "soft", aggression: "conserve", pitStrategy: "reactive" },
};

function factor(label: string, score: number, detail: string): RacePlanEvaluation["factors"][number] { return { label, impact: score > 0.01 ? "positive" : score < -0.01 ? "negative" : "neutral", detail }; }
export function evaluateRacePlan(profile: CircuitProfile, plan: RacePlan): RacePlanEvaluation {
  let performance = 0; let dnfDelta = 0; let wear = 1; let fuelRisk = 0;
  const wetMatch = profile.weather === "wet" ? plan.tire === "wet" : plan.tire !== "wet";
  performance += wetMatch ? 0.05 : -0.12; dnfDelta += wetMatch ? -0.01 : 0.08;
  const technical = profile.cornerDensity === "high";
  const gearingMatch = technical ? plan.gearing === "short" : profile.length === "long" ? plan.gearing === "long" : plan.gearing === "balanced";
  performance += gearingMatch ? 0.04 : -0.03;
  const aeroMatch = technical ? plan.aero === "high" : profile.cornerDensity === "low" ? plan.aero === "low" : plan.aero === "balanced";
  performance += aeroMatch ? 0.04 : -0.025;
  const surfaceMatch = profile.surface === "gravel" || profile.surface === "grass" ? plan.suspension === "soft" : technical ? plan.suspension !== "stiff" : true;
  performance += surfaceMatch ? 0.03 : -0.05; dnfDelta += surfaceMatch ? 0 : 0.02;
  if (plan.aggression === "push") { performance += 0.08; dnfDelta += 0.05; wear *= 1.3; }
  if (plan.aggression === "conserve") { performance -= 0.05; dnfDelta -= 0.04; wear *= 0.75; }
  const requiredFuel = profile.length === "long" || profile.demands.fuel >= 7;
  if (plan.fuelLoad === "light" && requiredFuel) fuelRisk += 0.25;
  if (plan.fuelLoad === "heavy" && !requiredFuel) performance -= 0.04;
  if (plan.fuelLoad === "heavy" && requiredFuel) fuelRisk -= 0.05;
  const pitMatch = !profile.pitAvailable ? plan.pitStrategy === "none" : requiredFuel ? plan.pitStrategy === "scheduled" : plan.pitStrategy !== "scheduled";
  if (!pitMatch) { dnfDelta += 0.03; fuelRisk += 0.08; }
  dnfDelta += Math.max(0, fuelRisk) * 0.2;
  wear *= profile.wearPressure;
  return { performanceMultiplier: Math.max(0.7, Math.min(1.3, 1 + performance)), dnfDelta: Math.max(-0.15, Math.min(0.25, dnfDelta + profile.breakdownPressure - 1)), wearMultiplier: Math.max(0.5, Math.min(2, wear)), fuelRisk: Math.max(0, Math.min(1, fuelRisk)), factors: [factor("Tires", wetMatch ? 1 : -1, wetMatch ? "Tire choice suits the weather." : "Tire choice conflicts with the weather."), factor("Gearing", gearingMatch ? 1 : -1, gearingMatch ? "Ratios suit circuit length and corners." : "Ratios leave performance on the table."), factor("Aero", aeroMatch ? 1 : -1, aeroMatch ? "Aero balance suits corner density." : "Aero balance mismatches the circuit."), factor("Suspension", surfaceMatch ? 1 : -1, surfaceMatch ? "Suspension suits the surface." : "Suspension is fighting the surface."), factor("Pit and fuel", pitMatch && fuelRisk <= 0 ? 1 : fuelRisk > 0.1 ? -1 : 0, fuelRisk > 0.1 ? "Fuel or pit plan may not cover the distance." : "Fuel and pit coverage is credible.") ] };
}

export function buildRaceForecast(winChance: number, dnfChance: number, wear: number, evaluation: RacePlanEvaluation, diagnosticsLevel: number): RaceForecast {
  const uncertainty = Math.max(0.02, 0.12 - diagnosticsLevel * 0.015);
  const range = (value: number) => ({ min: Math.max(0, value - uncertainty), max: Math.min(1, value + uncertainty) });
  const wearUncertainty = Math.max(1, 5 - diagnosticsLevel * 0.5);
  return { winChance: range(winChance), dnfRisk: range(dnfChance), wear: { min: Math.max(1, wear * evaluation.wearMultiplier - wearUncertainty), max: wear * evaluation.wearMultiplier + wearUncertainty }, fuelRisk: range(evaluation.fuelRisk) };
}
