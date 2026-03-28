import type { CircuitDefinition } from "@/data/circuits";
import type { BuiltVehicle } from "./build";

export type RaceResult = "win" | "loss" | "dnf";

export interface RaceOutcome {
  result: RaceResult;
  position: number;     // 1–8
  totalRacers: number;
  scrapsEarned: number;
  repEarned: number;
  log: string[];
}

const RACE_FLAVOR: Record<RaceResult, string[]> = {
  win: [
    "You take the checkered flag!",
    "First place — they're speechless.",
    "Built from garbage. Finished first. Beautiful.",
    "Your scrap heap crosses the line ahead of everyone.",
  ],
  loss: [
    "You finish, but not first.",
    "A respectable showing. For a junkyard car.",
    "You're gaining on them... next time.",
    "Close. Really close. Still lost.",
  ],
  dnf: [
    "The engine throws a rod on lap 2.",
    "A wheel pops off going into turn 3. Classic.",
    "You DNF, but that engine sounded incredible for a second.",
    "Did not finish. The scrap pile giveth and taketh away.",
  ],
};

function pickFlavor(result: RaceResult): string {
  const arr = RACE_FLAVOR[result];
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Simulate a race. Returns outcome. */
export function simulateRace(
  vehicle: BuiltVehicle,
  circuit: CircuitDefinition,
  prestigeBonus: number = 1,
): RaceOutcome {
  const totalRacers = 8;
  const { performance } = vehicle.stats;

  // DNF chance based on reliability
  const reliabilityScore = vehicle.stats.reliability;
  const dnfChance = Math.max(0, 0.3 - reliabilityScore / 200);
  if (Math.random() < dnfChance) {
    return {
      result: "dnf",
      position: totalRacers,
      totalRacers,
      scrapsEarned: 0,
      repEarned: 0,
      log: [pickFlavor("dnf")],
    };
  }

  // Win chance: performance vs difficulty
  const effectivePerformance = performance * prestigeBonus;
  const difficultyThreshold = circuit.difficulty * 2;
  const winChance = Math.min(0.95, Math.max(0.05, effectivePerformance / difficultyThreshold));

  const won = Math.random() < winChance;
  const position = won ? 1 : Math.floor(Math.random() * (totalRacers - 2)) + 2;

  const result: RaceResult = won ? "win" : "loss";

  // Rewards scale with position
  const positionMultiplier = won ? 1 : Math.max(0.1, (totalRacers - position) / totalRacers);
  const scrapsEarned = won
    ? circuit.rewardBase
    : Math.floor(circuit.rewardBase * positionMultiplier * 0.3);
  const repEarned = won ? circuit.repReward : Math.floor(circuit.repReward * 0.2);

  const log = [
    `Circuit: ${circuit.name}`,
    `Finished: P${position}/${totalRacers}`,
    pickFlavor(result),
    won ? `+${scrapsEarned} Scrap Bucks` : scrapsEarned > 0 ? `+${scrapsEarned} Scrap Bucks (consolation)` : "No prize money.",
    repEarned > 0 ? `+${repEarned} Rep` : "",
  ].filter(Boolean);

  return { result, position, totalRacers, scrapsEarned, repEarned, log };
}
