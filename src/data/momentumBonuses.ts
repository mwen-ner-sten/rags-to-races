import { REP_PROGRESSION } from "@/config/progression";

export interface MomentumCondition {
  type: "fatigue_gte" | "races_gte" | "scrap_gte" | "rep_gte" | "circuit_tier_gte";
  value: number;
}

export interface MomentumEffect {
  type:
    | "scrap_multiplier"
    | "race_win_bonus"
    | "rep_multiplier"
    | "fatigue_reduction"
    | "lp_multiplier"
    | "all_bonus";
  value: number;
}

export interface MomentumTier {
  id: string;
  name: string;
  description: string;
  condition: MomentumCondition;
  effect: MomentumEffect;
  unlockText: string;
}

export const MOMENTUM_TIERS: MomentumTier[] = [
  {
    id: "momentum_warmed_up",
    name: "Warmed Up",
    description: "+10% scrap from all sources",
    condition: { type: "races_gte", value: 30 },
    effect: { type: "scrap_multiplier", value: 0.1 },
    unlockText: "The engine's finally warm. Scrap flows faster.",
  },
  {
    id: "momentum_in_the_zone",
    name: "In the Zone",
    description: "+5% race win chance",
    condition: { type: "races_gte", value: 75 },
    effect: { type: "race_win_bonus", value: 0.05 },
    unlockText: "You're reading the track now. Wins come easier.",
  },
  {
    id: "momentum_reputation",
    name: "Reputation Precedes You",
    description: "+25% rep from all sources",
    condition: { type: "rep_gte", value: REP_PROGRESSION.momentum.reputation },
    effect: { type: "rep_multiplier", value: 0.25 },
    unlockText: "People know your name. They want to see you race.",
  },
  {
    id: "momentum_second_wind",
    name: "Second Wind",
    description: "Fatigue gain reduced by 15%",
    condition: { type: "fatigue_gte", value: 40 },
    effect: { type: "fatigue_reduction", value: 0.15 },
    unlockText: "You've pushed through the wall. Everything hurts less.",
  },
  {
    id: "momentum_deep_run",
    name: "Deep Run",
    description: "+50% Legacy Points at next prestige",
    condition: { type: "fatigue_gte", value: 60 },
    effect: { type: "lp_multiplier", value: 0.5 },
    unlockText: "The deeper you go, the more you'll carry back.",
  },
  {
    id: "momentum_legendary",
    name: "Legendary Run",
    description: "+100% Legacy Points at next Scrap Reset",
    condition: { type: "fatigue_gte", value: 80 },
    effect: { type: "lp_multiplier", value: 1.0 },
    unlockText: "This run will be remembered. The legacy compounds.",
  },
];

/** Check which momentum tiers are active given current run state */
export function getActiveMomentumTiers(
  lifetimeRaces: number,
  fatigue: number,
  repPoints: number,
  lifetimeScrapBucks: number,
  highestCircuitTier: number,
  thresholdReduction: number = 0,
): string[] {
  const thresholdMultiplier = 1 - Math.max(0, Math.min(0.95, thresholdReduction));
  return MOMENTUM_TIERS.filter((tier) => {
    const { type, value } = tier.condition;
    const effectiveValue = Math.ceil(value * thresholdMultiplier);
    switch (type) {
      case "races_gte":
        return lifetimeRaces >= effectiveValue;
      case "fatigue_gte":
        return fatigue >= effectiveValue;
      case "rep_gte":
        return repPoints >= effectiveValue;
      case "scrap_gte":
        return lifetimeScrapBucks >= effectiveValue;
      case "circuit_tier_gte":
        return highestCircuitTier >= effectiveValue;
      default:
        return false;
    }
  }).map((t) => t.id);
}

/** Sum all momentum effects of a given type from active tiers */
export function getMomentumEffectValue(
  activeTierIds: string[],
  effectType: MomentumEffect["type"],
): number {
  return MOMENTUM_TIERS.filter(
    (t) => activeTierIds.includes(t.id) && t.effect.type === effectType,
  ).reduce((sum, t) => sum + t.effect.value, 0);
}
