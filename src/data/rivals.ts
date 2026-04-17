import type { GearSlot } from "@/data/gearSlots";
import type { GearRarity } from "@/data/lootGear";

export interface RivalDefinition {
  id: string;
  name: string;
  flavor: string;
  /** Themed set the rival drops pieces from (setId must exist in /data/gearSets). */
  signatureSetId: string;
  /** Slots this rival can drop pieces for. */
  dropSlots: GearSlot[];
  /** Minimum circuit tier where the rival appears. */
  minCircuitTier: number;
  /** Rarity floor when a rival drops gear. */
  minRarity: GearRarity;
}

export const RIVALS: RivalDefinition[] = [
  {
    id: "rival_greasy_pete",
    name: "Greasy Pete",
    flavor: "Legendary junkyard mechanic — shows up where the parts are cheapest.",
    signatureSetId: "grease_monkey",
    dropSlots: ["head", "hands", "tool"],
    minCircuitTier: 1,
    minRarity: "uncommon",
  },
  {
    id: "rival_redline_rosa",
    name: "Redline Rosa",
    flavor: "Only one rule: go faster.",
    signatureSetId: "redline",
    dropSlots: ["head", "body", "feet"],
    minCircuitTier: 2,
    minRarity: "rare",
  },
  {
    id: "rival_scrap_queen",
    name: "The Scrap Queen",
    flavor: "Nothing leaves the junkyard unless she says so.",
    signatureSetId: "scrapper",
    dropSlots: ["hands", "feet", "tool", "accessory"],
    minCircuitTier: 2,
    minRarity: "rare",
  },
  {
    id: "rival_dust_storm",
    name: "Dust Storm",
    flavor: "Appears when the track turns to chaos.",
    signatureSetId: "slipstream",
    dropSlots: ["head", "body", "feet", "accessory"],
    minCircuitTier: 3,
    minRarity: "epic",
  },
];

export function getRivalById(id: string): RivalDefinition | undefined {
  return RIVALS.find((r) => r.id === id);
}

export function getRivalsForCircuitTier(tier: number): RivalDefinition[] {
  return RIVALS.filter((r) => tier >= r.minCircuitTier);
}
