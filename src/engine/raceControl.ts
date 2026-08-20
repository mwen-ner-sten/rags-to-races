import type { CircuitProfile, RacePlanEvaluation } from "@/data/raceStrategy";

export type RaceControlCallId = "standing" | "attack" | "protect";

export interface RaceControlSelection {
  callId: RaceControlCallId;
  vehicleId: string;
  circuitId: string;
}

export interface RaceControlEffect {
  performanceMultiplier: number;
  dnfDelta: number;
  wearMultiplier: number;
}

export interface RaceControlCall {
  id: RaceControlCallId;
  label: string;
  description: string;
  effect: RaceControlEffect;
}

export interface RaceControlBriefing {
  context: string;
  detail: string;
  calls: readonly [RaceControlCall, RaceControlCall, RaceControlCall];
}

const EFFECTS: Record<RaceControlCallId, RaceControlEffect> = {
  standing: { performanceMultiplier: 1, dnfDelta: 0, wearMultiplier: 1 },
  attack: { performanceMultiplier: 1.04, dnfDelta: 0.025, wearMultiplier: 1.12 },
  protect: { performanceMultiplier: 0.97, dnfDelta: -0.025, wearMultiplier: 0.88 },
};

export function raceControlEffect(call: RaceControlCallId): RaceControlEffect {
  return { ...EFFECTS[call] };
}

export function buildRaceControlBriefing(profile: CircuitProfile): RaceControlBriefing {
  const context = profile.weather !== "dry"
    ? "Changing weather"
    : profile.breakdownPressure > 1 || profile.demands.reliability >= 7
      ? "Mechanical warning"
      : "Pace window";
  const detail = context === "Changing weather"
    ? "Conditions are shifting. Choose how much margin to keep."
    : context === "Mechanical warning"
      ? "Telemetry shows rising mechanical stress."
      : "Traffic has opened a short opportunity to change pace.";
  return {
    context,
    detail,
    calls: [
      { id: "standing", label: "Follow standing order", description: "Keep the current Race Plan unchanged.", effect: raceControlEffect("standing") },
      { id: "attack", label: "Attack", description: "Gain up to 4% pace, accepting +2.5 points DNF risk and 12% more wear.", effect: raceControlEffect("attack") },
      { id: "protect", label: "Protect", description: "Reduce DNF risk by 2.5 points and wear by 12%, giving up 3% pace.", effect: raceControlEffect("protect") },
    ],
  };
}

export function applyRaceControlEffect(
  evaluation: RacePlanEvaluation,
  call: RaceControlCallId,
): RacePlanEvaluation {
  const effect = EFFECTS[call];
  return {
    ...evaluation,
    performanceMultiplier: evaluation.performanceMultiplier * effect.performanceMultiplier,
    dnfDelta: evaluation.dnfDelta + effect.dnfDelta,
    wearMultiplier: evaluation.wearMultiplier * effect.wearMultiplier,
  };
}
