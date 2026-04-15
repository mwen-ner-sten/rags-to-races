/**
 * Racer Skill bonus aggregation.
 *
 * Converts skill levels into a flat bonus struct that the rest of the engine
 * can consume (race, scavenge, build, tick).
 */

import type { RacerSkills } from "@/data/racerSkills";
import { ratingForLevel, ratingToEffectiveness } from "@/data/racerSkills";

export interface SkillBonuses {
  /** Flat performance multiplier additive (e.g. 0.25 = +25% of base performance) */
  drivingPerformanceMult: number;
  /** Flat DNF reduction (subtracted from base DNF chance) */
  drivingDnfReduction: number;
  /** Multiplicative cost reduction for builds/repairs (e.g. 0.2 = 20% cheaper) */
  mechanicsCostReduction: number;
  /** Flat luck bonus added to scavenge rarityBias */
  scavengingLuckBonus: number;
  /** Multiplicative yield bonus (e.g. 0.15 = +15% parts) */
  scavengingYieldBonus: number;
  /** Flat fatigue offset (subtracted from effective fatigue) */
  enduranceFatigueOffset: number;
  /** Multiplicative wear reduction (e.g. 0.1 = 10% less wear) */
  enduranceWearReduction: number;
}

/**
 * Calculate all skill bonuses for a given set of skills at a content tier.
 *
 * @param skills - The racer's current skill state
 * @param tier   - The content tier to evaluate effectiveness against
 *                 (e.g. the circuit tier for racing, location tier for scavenging)
 */
export function getSkillBonuses(skills: RacerSkills, tier: number): SkillBonuses {
  const drivingRating = ratingForLevel(skills.driving.level);
  const mechanicsRating = ratingForLevel(skills.mechanics.level);
  const scavengingRating = ratingForLevel(skills.scavenging.level);
  const enduranceRating = ratingForLevel(skills.endurance.level);

  const dEff = ratingToEffectiveness(drivingRating, tier);
  const mEff = ratingToEffectiveness(mechanicsRating, tier);
  const sEff = ratingToEffectiveness(scavengingRating, tier);
  const eEff = ratingToEffectiveness(enduranceRating, tier);

  return {
    // Driving: up to +50% performance at full effectiveness
    drivingPerformanceMult: dEff * 0.5,
    // Driving: up to 0.15 DNF reduction at full effectiveness
    drivingDnfReduction: dEff * 0.15,
    // Mechanics: up to 40% cost reduction at full effectiveness
    mechanicsCostReduction: mEff * 0.4,
    // Scavenging: up to +0.3 luck at full effectiveness
    scavengingLuckBonus: sEff * 0.3,
    // Scavenging: up to +30% yield at full effectiveness
    scavengingYieldBonus: sEff * 0.3,
    // Endurance: up to 20 fatigue offset at full effectiveness
    enduranceFatigueOffset: Math.floor(eEff * 20),
    // Endurance: up to 20% wear reduction at full effectiveness
    enduranceWearReduction: eEff * 0.2,
  };
}
