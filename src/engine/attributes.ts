import type { RacerAttributes } from "@/data/racerAttributes";

export interface AttributeBonuses {
  /** Extra Driving Rating (added to skill rating pool) */
  drivingRatingBonus: number;
  /** Extra Endurance Rating */
  enduranceRatingBonus: number;
  /** Extra Scavenging Rating */
  scavengingRatingBonus: number;
  /** Extra Mechanics Rating */
  mechanicsRatingBonus: number;
  /** Flat rep bonus per race */
  flatRepPerRace: number;
  /** Flat scrap discount on unlock costs */
  flatUnlockCostDiscount: number;
  /** Flat luck bonus */
  flatLuckBonus: number;
  /** Flat forge token chance bonus */
  flatForgeTokenBonus: number;
}

export function getAttributeBonuses(attrs: RacerAttributes): AttributeBonuses {
  return {
    drivingRatingBonus: attrs.reflexes * 3,
    enduranceRatingBonus: attrs.endurance * 3,
    scavengingRatingBonus: attrs.instinct * 3,
    mechanicsRatingBonus: attrs.engineering * 3,
    flatRepPerRace: attrs.charisma * 5,
    flatUnlockCostDiscount: attrs.charisma * 50,
    flatLuckBonus: attrs.fortune * 0.2,
    flatForgeTokenBonus: attrs.fortune * 0.001,
  };
}
