import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { buildRaceForecast, evaluateRacePlan, RACE_PLAN_PRESETS, DEFAULT_RACE_PLAN, type RacePlan } from "@/data/raceStrategy";
import type { BuiltVehicle } from "@/engine/build";
import { calculateOdds, calculateWear, getCircuitPerformance, simulateRace } from "@/engine/race";
import { FATIGUE, fatiguePerRace } from "@/config/progression";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

export type CampaignRaceBuild = "underdog" | "favored" | "dominant";

export interface CampaignRaceSimulationResult {
  build: CampaignRaceBuild;
  seed: string;
  races: number;
  wins: number;
  losses: number;
  dnfs: number;
  winRate: number;
  dnfRate: number;
  displayedWinRange: { min: number; max: number };
  displayedDnfRange: { min: number; max: number };
  grossScrap: number;
  netScrap: number;
  rep: number;
  wear: number;
  repairPoints: number;
  repairs: number;
  finalCondition: number;
  finalFatigue: number;
}

const BUILD_CONFIG: Record<CampaignRaceBuild, { performance: number; reliability: number; plan: RacePlan }> = {
  underdog: { performance: 28, reliability: 30, plan: RACE_PLAN_PRESETS.wet },
  favored: { performance: 55, reliability: 70, plan: DEFAULT_RACE_PLAN },
  dominant: { performance: 100, reliability: 120, plan: DEFAULT_RACE_PLAN },
};

function simulationVehicle(build: CampaignRaceBuild): BuiltVehicle {
  const config = BUILD_CONFIG[build];
  return {
    id: `campaign_${build}`,
    // Not a real chassis: the simulation sets stats directly and must not derive them from its (empty) parts.
    definitionId: "campaign_simulation_fixture",
    parts: {},
    stats: { speed: config.performance, handling: config.performance, reliability: config.reliability, weight: 1_000, performance: config.performance },
    builtAt: 0,
    condition: 100,
    totalRaces: 0,
  };
}

/** Mixed-play session shape from the Phase 2 charter: ~15 min check-ins, four a day. */
const SESSION_RACES = 15;
const MINUTES_BETWEEN_RACES = 1;
const SESSION_REST_HOURS = 6;

export function runCampaignRaceSimulation(build: CampaignRaceBuild, seed: string, races = 100): CampaignRaceSimulationResult {
  const circuit = CIRCUIT_DEFINITIONS.find((candidate) => candidate.id === "regional_circuit")!;
  const config = BUILD_CONFIG[build];
  const vehicle = simulationVehicle(build);
  let fatigue = 0;
  let condition = 100;
  let wins = 0;
  let losses = 0;
  let dnfs = 0;
  let grossScrap = 0;
  let rep = 0;
  let wear = 0;
  let repairPoints = 0;
  let repairs = 0;
  let displayedWinMin = 0;
  let displayedWinMax = 0;
  let displayedDnfMin = 0;
  let displayedDnfMax = 0;
  const planEvaluation = evaluateRacePlan(circuit.profile, config.plan);

  withRandomSource(new SeededRandomSource(seed), () => {
    for (let index = 0; index < races; index += 1) {
      const odds = calculateOdds(getCircuitPerformance(vehicle.stats, circuit), vehicle.stats.reliability, circuit.difficulty, fatigue, 0, 0, 0, 0, 0, false, planEvaluation);
      const forecast = buildRaceForecast(odds.winChance, odds.dnfChance, 5, planEvaluation, 0);
      displayedWinMin += forecast.winChance.min;
      displayedWinMax += forecast.winChance.max;
      displayedDnfMin += forecast.dnfRisk.min;
      displayedDnfMax += forecast.dnfRisk.max;

      const outcome = simulateRace(vehicle, circuit, fatigue, 0, 0, 0, 1, 0, 0, 0, 0, false, config.plan);
      wins += outcome.result === "win" ? 1 : 0;
      losses += outcome.result === "loss" ? 1 : 0;
      dnfs += outcome.result === "dnf" ? 1 : 0;
      grossScrap += outcome.scrapsEarned;
      rep += outcome.repEarned;
      const raceWear = calculateWear(vehicle, outcome.result, 0, fatigue, 0, 0, outcome.planEvaluation?.wearMultiplier ?? 1);
      wear += raceWear;
      condition = Math.max(0, condition - raceWear);
      if (condition < 35) {
        repairPoints += 100 - condition;
        condition = 100;
        repairs += 1;
      }
      // Fatigue rhythm (engine/fatigue): each race adds its tier's amount;
      // the campaign is played as check-in sessions of SESSION_RACES races a
      // minute apart, with SESSION_REST_HOURS of real time between sessions.
      fatigue = Math.min(FATIGUE.MAX, fatigue + fatiguePerRace(circuit.tier));
      const sessionOver = (index + 1) % SESSION_RACES === 0;
      const restHours = sessionOver ? SESSION_REST_HOURS : MINUTES_BETWEEN_RACES / 60;
      fatigue = Math.max(0, fatigue - FATIGUE.RECOVERY_PER_HOUR * restHours);
    }
  });

  return {
    build,
    seed,
    races,
    wins,
    losses,
    dnfs,
    winRate: wins / races,
    dnfRate: dnfs / races,
    displayedWinRange: { min: displayedWinMin / races, max: displayedWinMax / races },
    displayedDnfRange: { min: displayedDnfMin / races, max: displayedDnfMax / races },
    grossScrap,
    netScrap: grossScrap - circuit.entryFee * races,
    rep,
    wear,
    repairPoints,
    repairs,
    finalCondition: condition,
    finalFatigue: fatigue,
  };
}

export function runAllCampaignRaceSimulations(seedPrefix = "full-campaign-2026") {
  return (["underdog", "favored", "dominant"] as const).map((build) => runCampaignRaceSimulation(build, `${seedPrefix}:${build}`));
}
