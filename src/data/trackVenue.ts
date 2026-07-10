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
