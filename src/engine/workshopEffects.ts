import { getUpgradeById } from "@/data/upgrades";
import { getPermanentRuntimeBonuses, type PermanentBonusState } from "./permanentBonuses";

/** The slice of game state a workshop effect lookup needs. */
export interface WorkshopEffectState extends PermanentBonusState {
  workshopLevels: Record<string, number>;
}

/**
 * Workshop effect types the Garage Philosophy "workshop effect" bonus must NOT
 * scale. The bonus is a percentage boost to yields and rates; applying it to
 * millisecond timers, whole-number counts, or unlock flags produced either
 * nonsense (a 1.5× unlock) or hidden balance changes (tick timers 50% faster
 * than the upgrade text says). Only scalar yield / percent effects are boosted.
 */
export const WORKSHOP_EFFECT_BONUS_EXEMPT: ReadonlySet<string> = new Set([
  // Time (milliseconds)
  "tick_speed_reduction_ms",
  "hold_speed_reduction_ms",
  // Whole-number counts
  "scavenge_extra_parts",
  "race_tick_reduction",
  "gear_rarity_bonus",
  "gear_max_enhance",
  "auto_repair_rate",
  "salvage_drop_upgrade",
  // Unlock flags
  "unlock_part_swap",
  "unlock_auto_fitter",
  "unlock_refurbish",
  "no_swap_degrade",
  "no_mod_destroy_on_remove",
  "unlock_addon_manage",
  "unlock_enhancement",
  "unlock_crafting",
  "unlock_tradeup",
  "unlock_artifact_forge",
]);

export function getUpgradeLevel(state: Pick<WorkshopEffectState, "workshopLevels">, upgradeId: string): number {
  return state.workshopLevels[upgradeId] ?? 0;
}

/** Total effect of a workshop upgrade at its current level, with the philosophy bonus where it applies. */
export function getUpgradeEffectValue(state: WorkshopEffectState, upgradeId: string): number {
  const level = getUpgradeLevel(state, upgradeId);
  if (level === 0) return 0;
  const def = getUpgradeById(upgradeId);
  if (!def) return 0;
  const base = def.effect.valuePerLevel * level;
  if (WORKSHOP_EFFECT_BONUS_EXEMPT.has(def.effect.type)) return base;
  return base * (1 + getPermanentRuntimeBonuses(state).workshopEffectBonus);
}
