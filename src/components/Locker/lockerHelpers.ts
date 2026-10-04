import type { EquipmentAffixArt } from "@/assets/equipmentArt";
import { getModTemplateById } from "@/data/gearMods";
import type { GearRarity, GearSlot, InstalledMod, LootGearItem } from "@/data/lootGear";
import { getGearBonuses, type GearBonuses } from "@/engine/gear";
import { getTotalEffects } from "@/engine/gearEnhance";

/**
 * Pure helpers behind the Locker screen: what a piece of loot gear is worth,
 * what equipping it would change, and how the inventory list is filtered and
 * sorted. Nothing here touches the store, so it is unit-tested directly.
 */

export type GearChannel = keyof GearBonuses;

export const GEAR_CHANNEL_LABELS: Record<GearChannel, string> = {
  scavenge_luck_bonus: "Scavenge luck",
  scavenge_yield_pct: "Scavenge yield",
  sell_value_bonus_pct: "Sale value",
  race_performance_pct: "Race performance",
  race_dnf_reduction: "DNF chance",
  race_handling_pct: "Race handling",
  race_wear_reduction_pct: "Race wear",
  race_scrap_bonus_pct: "Race Scrap Bucks",
  build_cost_reduction_pct: "Build cost",
  repair_cost_reduction_pct: "Repair cost",
  refurb_cost_reduction_pct: "Refurbish cost",
  tick_speed_reduction_ms: "Tick interval",
  fatigue_rate_reduction: "Fatigue gain",
  fatigue_recovery_pct: "Fatigue recovery",
  material_bonus_pct: "Material yield",
  forge_token_chance_bonus: "Forge Token chance",
};

/** Channels where a positive bonus value means "less of a bad thing". */
export const GEAR_REDUCTION_CHANNELS: ReadonlySet<GearChannel> = new Set<GearChannel>([
  "race_dnf_reduction",
  "race_wear_reduction_pct",
  "build_cost_reduction_pct",
  "repair_cost_reduction_pct",
  "refurb_cost_reduction_pct",
  "tick_speed_reduction_ms",
  "fatigue_rate_reduction",
]);

export interface GearChannelGroup {
  id: "scavenging" | "racing" | "costs";
  label: string;
  channels: GearChannel[];
}

/** The channels loot gear can roll, grouped the way the summary shows them. */
export const GEAR_CHANNEL_GROUPS: readonly GearChannelGroup[] = [
  { id: "scavenging", label: "Scavenging", channels: ["scavenge_luck_bonus", "scavenge_yield_pct"] },
  {
    id: "racing",
    label: "Racing",
    channels: ["race_performance_pct", "race_handling_pct", "race_dnf_reduction", "race_wear_reduction_pct", "race_scrap_bonus_pct", "fatigue_rate_reduction", "fatigue_recovery_pct"],
  },
  {
    id: "costs",
    label: "Costs and sales",
    channels: ["build_cost_reduction_pct", "repair_cost_reduction_pct", "refurb_cost_reduction_pct", "sell_value_bonus_pct"],
  },
];

export function isGearChannel(type: string): type is GearChannel {
  return type in GEAR_CHANNEL_LABELS;
}

function roundPct(value: number): string {
  const pct = Math.round(Math.abs(value) * 1000) / 10;
  return `${pct}%`;
}

/**
 * Signed, player-facing value for a channel. Reductions render with a minus
 * sign because the player sees "-5% build cost", never "+5% build cost
 * reduction". `value` is the raw bonus fraction (0.05 = 5%).
 */
export function formatChannelValue(channel: GearChannel, value: number): string {
  if (value === 0) return channel === "tick_speed_reduction_ms" ? "0 ms" : "0%";
  const reduction = GEAR_REDUCTION_CHANNELS.has(channel);
  // A positive bonus on a reduction channel lowers the number the player sees.
  const negative = reduction ? value > 0 : value < 0;
  const sign = negative ? "−" : "+";
  if (channel === "tick_speed_reduction_ms") return `${sign}${Math.round(Math.abs(value))} ms`;
  return `${sign}${roundPct(value)}`;
}

/** "Race performance +4.2%" for an item affix or mod line. */
export function formatEffect(type: string, value: number): string {
  if (!isGearChannel(type)) return `${type} ${value}`;
  return `${GEAR_CHANNEL_LABELS[type]} ${formatChannelValue(type, value)}`;
}

export const RARITY_ORDER: readonly GearRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export function rarityRank(rarity: GearRarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

/** Salvage is destructive; anything Rare or better asks twice. */
export function needsSalvageConfirm(item: Pick<LootGearItem, "rarity">): boolean {
  return rarityRank(item.rarity) >= rarityRank("rare");
}

/**
 * One number to sort by: every effective effect (enhanced affixes plus mods)
 * in percentage points. A tick-speed effect is already in ms and is left out
 * so it cannot swamp the percentage channels.
 */
export function gearPower(item: LootGearItem): number {
  const total = getTotalEffects(item)
    .filter((effect) => effect.type !== "tick_speed_reduction_ms")
    .reduce((sum, effect) => sum + effect.value * 100, 0);
  return Math.round(total * 10) / 10;
}

/** Aggregate bonuses from equipped loot gear only (station equipment is shown elsewhere). */
export function lootGearBonuses(
  equipped: Record<GearSlot, string | null>,
  inventory: LootGearItem[],
): GearBonuses {
  return getGearBonuses(equipped, inventory);
}

export interface EquipDelta {
  channel: GearChannel;
  before: number;
  after: number;
  delta: number;
}

/**
 * What every channel would change by if `item` replaced whatever sits in its
 * slot now. Computed from getGearBonuses with and without the swap, so mods,
 * enhancement, and the outgoing item are all accounted for. Only channels
 * that move are returned, in group order.
 */
export function computeEquipDelta(
  item: LootGearItem,
  equipped: Record<GearSlot, string | null>,
  inventory: LootGearItem[],
): EquipDelta[] {
  const before = getGearBonuses(equipped, inventory);
  const after = getGearBonuses({ ...equipped, [item.slot]: item.id }, inventory);
  const ordered = GEAR_CHANNEL_GROUPS.flatMap((group) => group.channels);
  return ordered.flatMap((channel) => {
    const delta = Math.round((after[channel] - before[channel]) * 10_000) / 10_000;
    if (delta === 0) return [];
    return [{ channel, before: before[channel], after: after[channel], delta }];
  });
}

export type LockerSort = "power" | "rarity" | "level" | "name";

export interface LockerFilter {
  slot: GearSlot | "all";
  rarity: GearRarity | "all";
  sort: LockerSort;
}

export const DEFAULT_LOCKER_FILTER: LockerFilter = { slot: "all", rarity: "all", sort: "power" };

export const LOCKER_SORT_LABELS: Record<LockerSort, string> = {
  power: "Power",
  rarity: "Rarity",
  level: "Enhancement",
  name: "Name",
};

function compareBySort(sort: LockerSort, left: LootGearItem, right: LootGearItem): number {
  switch (sort) {
    case "power":
      return gearPower(right) - gearPower(left);
    case "rarity":
      return rarityRank(right.rarity) - rarityRank(left.rarity);
    case "level":
      return right.enhancementLevel - left.enhancementLevel;
    case "name":
      return left.name.localeCompare(right.name);
  }
}

/** Filter by slot and rarity, then sort; ties fall back to power, then name, so order is stable. */
export function filterAndSortGear(items: LootGearItem[], filter: LockerFilter): LootGearItem[] {
  return items
    .filter((item) => filter.slot === "all" || item.slot === filter.slot)
    .filter((item) => filter.rarity === "all" || item.rarity === filter.rarity)
    .toSorted((left, right) =>
      compareBySort(filter.sort, left, right)
      || gearPower(right) - gearPower(left)
      || left.name.localeCompare(right.name),
    );
}

/** Spare mods whose template fits this item's slot. */
export function compatibleMods(item: Pick<LootGearItem, "slot">, mods: InstalledMod[]): InstalledMod[] {
  return mods.filter((mod) => getModTemplateById(mod.templateId)?.slots.includes(item.slot) ?? false);
}

/** The next enhancement level that opens a mod socket, or null once both are open. */
export function nextModSlotLevel(enhancementLevel: number): number | null {
  if (enhancementLevel < 3) return 3;
  if (enhancementLevel < 7) return 7;
  return null;
}

const AFFIX_ART_BY_CHANNEL: Partial<Record<GearChannel, EquipmentAffixArt>> = {
  scavenge_luck_bonus: "sourcing",
  scavenge_yield_pct: "sourcing",
  sell_value_bonus_pct: "logistics",
  race_scrap_bonus_pct: "logistics",
  race_performance_pct: "speed",
  race_handling_pct: "handling",
  race_dnf_reduction: "handling",
  race_wear_reduction_pct: "repair",
  repair_cost_reduction_pct: "repair",
  refurb_cost_reduction_pct: "repair",
  build_cost_reduction_pct: "engineering",
};

/** Affix overlays for the composed art: one per distinct art family, strongest affix first, at most three. */
export function lootGearAffixArt(item: Pick<LootGearItem, "effects">): EquipmentAffixArt[] {
  const seen = new Set<EquipmentAffixArt>();
  const ordered = item.effects.toSorted((left, right) => right.value - left.value);
  for (const effect of ordered) {
    const art = isGearChannel(effect.type) ? AFFIX_ART_BY_CHANNEL[effect.type] : undefined;
    if (art) seen.add(art);
    if (seen.size === 3) break;
  }
  return [...seen];
}
