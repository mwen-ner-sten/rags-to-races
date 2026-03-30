import type { PartCategory } from "./parts";

export interface LocationDefinition {
  id: string;
  name: string;
  tier: number;
  description: string;
  unlockCost: number; // Rep Points to unlock
  scavengeTime: number; // ms per manual scavenge (idle feel)
  partDropRates: Record<PartCategory, number>; // relative weight per category
  rarityBias: number; // 0–1: higher = better condition rolls
  maxPartsPerScavenge: number;
}

export const LOCATION_DEFINITIONS: LocationDefinition[] = [
  {
    id: "curbside",
    name: "Curbside Trash",
    tier: 0,
    description: "Somebody's junk is your treasure. Usually still junk though.",
    unlockCost: 0,
    scavengeTime: 2000,
    partDropRates: { engine: 1, wheel: 2, frame: 1, electronics: 0.5, fuel: 1, drivetrain: 0, exhaust: 0.3, suspension: 0, aero: 0, misc: 4 },
    rarityBias: 0.1,
    maxPartsPerScavenge: 2,
  },
  {
    id: "neighborhood_yards",
    name: "Neighborhood Yards",
    tier: 1,
    description: "Garage sales, alleyways, and that one guy who never mows.",
    unlockCost: 5,
    scavengeTime: 3000,
    partDropRates: { engine: 2, wheel: 2, frame: 2, electronics: 1, fuel: 2, drivetrain: 0, exhaust: 0.5, suspension: 0, aero: 0, misc: 2 },
    rarityBias: 0.2,
    maxPartsPerScavenge: 2,
  },
  {
    id: "local_junkyard",
    name: "Local Junkyard",
    tier: 2,
    description: "Towers of crushed cars and the smell of opportunity.",
    unlockCost: 20,
    scavengeTime: 4000,
    partDropRates: { engine: 3, wheel: 3, frame: 4, electronics: 2, fuel: 2, drivetrain: 1, exhaust: 1, suspension: 1, aero: 0.5, misc: 1 },
    rarityBias: 0.35,
    maxPartsPerScavenge: 3,
  },
  {
    id: "salvage_auction",
    name: "Salvage Auction",
    tier: 3,
    description: "Bulk lots, mystery pallets, and cutthroat bidding.",
    unlockCost: 60,
    scavengeTime: 5000,
    partDropRates: { engine: 4, wheel: 2, frame: 3, electronics: 3, fuel: 2, drivetrain: 2, exhaust: 2, suspension: 1.5, aero: 0.5, misc: 1 },
    rarityBias: 0.5,
    maxPartsPerScavenge: 3,
  },
  {
    id: "industrial_surplus",
    name: "Industrial Surplus",
    tier: 4,
    description: "High-grade materials from factories that didn't make it.",
    unlockCost: 150,
    scavengeTime: 6000,
    partDropRates: { engine: 4, wheel: 3, frame: 3, electronics: 5, fuel: 3, drivetrain: 3, exhaust: 2, suspension: 2, aero: 1, misc: 0 },
    rarityBias: 0.65,
    maxPartsPerScavenge: 4,
  },
  {
    id: "military_scrapyard",
    name: "Military Scrapyard",
    tier: 5,
    description: "Exotic alloys and prototype components. Don't ask questions.",
    unlockCost: 400,
    scavengeTime: 8000,
    partDropRates: { engine: 5, wheel: 2, frame: 4, electronics: 5, fuel: 2, drivetrain: 4, exhaust: 3, suspension: 3, aero: 2, misc: 0 },
    rarityBias: 0.8,
    maxPartsPerScavenge: 4,
  },
];

export function getLocationById(id: string): LocationDefinition | undefined {
  return LOCATION_DEFINITIONS.find((l) => l.id === id);
}
