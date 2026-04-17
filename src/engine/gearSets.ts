import { GEAR_SLOTS, type GearSlot } from "@/data/gearSlots";
import type { LootGearItem, LootGearEffect } from "@/data/lootGear";
import { GEAR_SETS, type GearSetDefinition } from "@/data/gearSets";

export interface ActiveSetInfo {
  set: GearSetDefinition;
  piecesEquipped: number;
  /** Active tiers (entries whose piecesRequired threshold is met) */
  activeTiers: GearSetDefinition["tiers"];
}

/**
 * Inspect equipped loot gear and return activation info for each set the
 * player has 1+ pieces from. Only sets with at least their first tier
 * threshold met contribute bonuses; this function returns the full set of
 * affiliations so UI can show progress toward 2pc / 4pc.
 */
export function getActiveSets(
  equippedLootGear: Record<GearSlot, string | null> | undefined,
  lootGearInventory: LootGearItem[] | undefined,
): ActiveSetInfo[] {
  if (!equippedLootGear || !lootGearInventory) return [];

  const setCounts = new Map<string, number>();
  for (const slot of GEAR_SLOTS) {
    const id = equippedLootGear[slot];
    if (!id) continue;
    const item = lootGearInventory.find((g) => g.id === id);
    if (!item?.setId) continue;
    setCounts.set(item.setId, (setCounts.get(item.setId) ?? 0) + 1);
  }

  const out: ActiveSetInfo[] = [];
  for (const [setId, count] of setCounts) {
    const set = GEAR_SETS.find((s) => s.id === setId);
    if (!set) continue;
    const activeTiers = set.tiers.filter((t) => count >= t.piecesRequired);
    out.push({ set, piecesEquipped: count, activeTiers });
  }
  return out;
}

/** Flat list of all set-bonus effects currently active. */
export function getActiveSetEffects(
  equippedLootGear: Record<GearSlot, string | null> | undefined,
  lootGearInventory: LootGearItem[] | undefined,
): LootGearEffect[] {
  const active = getActiveSets(equippedLootGear, lootGearInventory);
  const out: LootGearEffect[] = [];
  for (const info of active) {
    for (const tier of info.activeTiers) {
      out.push(...tier.effects);
    }
  }
  return out;
}
