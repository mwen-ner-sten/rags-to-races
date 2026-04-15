export interface AIModel {
  id: string;
  name: string;
  contextLength: number;
  maxCompletionTokens: number;
  modality: string;
  description: string;
  pricing: { prompt: string; completion: string };
}

export interface MechanicContext {
  activeVehicle: {
    name: string;
    tier: number;
    condition: number;
    stats: { speed: number; handling: number; reliability: number; performance: number };
    partSummary: string[];
  } | null;
  inventoryHighlights: string;
  selectedCircuit: { name: string; tier: number; difficulty: number } | null;
  recentRaces: string;
  currencies: { scrapBucks: number; repPoints: number };
  fatigue: number;
  winStreak: number;
  progression: string;
}
