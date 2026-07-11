export interface OwnedTrackConfig {
  surface: "grass" | "gravel" | "asphalt";
  length: "short" | "medium" | "long";
  cornerDensity: "low" | "medium" | "high";
  timeRule: "day" | "night" | "variable_weather";
  vehicleClass: "open" | "scrap" | "street" | "prototype";
  endurance: boolean;
  riskReward: 1 | 2 | 3 | 4 | 5;
}
export interface HostedEvent { id: string; name: string; config: OwnedTrackConfig; sponsor: string; remainingTicks: number; status: "running" | "complete"; reward: number; }
export const DEFAULT_TRACK_CONFIG: OwnedTrackConfig = { surface: "gravel", length: "medium", cornerDensity: "medium", timeRule: "day", vehicleClass: "open", endurance: false, riskReward: 1 };

export function normalizeHostedEventConfig(
  config: OwnedTrackConfig,
  unlocks: { customCircuits: boolean; nightRacing: boolean; enduranceMode: boolean },
): OwnedTrackConfig {
  return {
    ...config,
    timeRule: config.timeRule === "night" && !unlocks.nightRacing ? "day" : config.timeRule,
    endurance: Boolean(config.endurance && unlocks.enduranceMode),
    riskReward: Math.min(
      unlocks.customCircuits ? 5 : 3,
      Math.max(1, config.riskReward),
    ) as OwnedTrackConfig["riskReward"],
  };
}

export function calculateHostedEventTerms(
  config: OwnedTrackConfig,
  sponsorNetworkLevel: number = 0,
  allScrapIncomeMult: number = 0,
): { reward: number; durationTicks: number } {
  const surfaceMult = { grass: 1, gravel: 1.1, asphalt: 1.2 }[config.surface];
  const lengthMult = { short: 1, medium: 1.4, long: 2 }[config.length];
  const cornerMult = { low: 1, medium: 1.1, high: 1.25 }[config.cornerDensity];
  const classMult = { open: 1, scrap: 1.1, street: 1.25, prototype: 1.5 }[config.vehicleClass];
  const timeMult = config.timeRule === "night" ? 1.25 : config.timeRule === "variable_weather" ? 1.15 : 1;
  const enduranceMult = config.endurance ? 2 : 1;
  const sponsorMult = 1 + Math.max(0, sponsorNetworkLevel) * 0.2;
  const permanentScrapMult = 1 + Math.max(0, allScrapIncomeMult);
  return {
    reward: Math.floor(
      10_000 *
        config.riskReward *
        surfaceMult *
        lengthMult *
        cornerMult *
        classMult *
        timeMult *
        enduranceMult *
        sponsorMult *
        permanentScrapMult,
    ),
    durationTicks: config.endurance ? 10 : 5,
  };
}
