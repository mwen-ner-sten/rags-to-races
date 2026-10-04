import {
  GEAR_SLOTS,
  type GearSlot,
  type GearRarity,
  type LootGearItem,
  type InstalledMod,
  RARITY_WEIGHTS_BY_TIER,
  RARITY_VALUE_MULTS,
  RARITY_EFFECT_COUNT,
  LOOT_EFFECT_POOLS,
  generateLootName,
} from "@/data/lootGear";
import { GEAR_MOD_TEMPLATES } from "@/data/gearMods";
import { GARAGE_STATION_IDS } from "@/data/garageStations";
import type { StationEquipment } from "@/data/stationEquipment";
import { REP_PROGRESSION } from "@/config/progression";
import { forgeStationEquipment } from "./stationForge";
import { weightedPick, randInt, random } from "@/utils/random";

/**
 * Two drop tables, two homes.
 *
 * - Races pay out the driver's kit: loot gear (helmet, jacket, gloves, boots,
 *   tool, accessory) and the gear mods that socket into it. Both land in the
 *   Locker (`lootGearInventory` / `gearModInventory`).
 * - Scavenging turns up shop equipment: station gear (benches, lifts, rigs)
 *   for `stationEquipmentInventory`, plus the odd loose Reforge Shard.
 *
 * Both tables share the tier weights in `RARITY_WEIGHTS_BY_TIER`, the
 * `rarity_sense` shift, and the Rep-gated rarity ladder below.
 */

let _instanceCounter = 0;
function makeGearId(): string {
  return `lg_${Date.now()}_${_instanceCounter++}`;
}
function makeModInstanceId(): string {
  return `mod_${Date.now()}_${_instanceCounter++}`;
}

// ── Drop chance constants ───────────────────────────────────────────────────
/** Loot gear chance per race, by result, before workshop and streak bonuses. */
export const RACE_LOOT_DROP_RATE: Record<"win" | "loss" | "dnf", number> = {
  win: 0.08,
  loss: 0.03,
  dnf: 0.01,
};
/** Gear mod chance on a race win, before `mod_hunter`. Losses and DNFs never drop mods. */
export const RACE_MOD_DROP_RATE = 0.01;
/** Station equipment chance per scavenge (manual or automated), before `gear_scavenger`. */
export const SCAVENGE_STATION_DROP_RATE = 0.03;
/** Loose Reforge Shard chance per scavenge, before `mod_hunter`. */
export const SCAVENGE_SHARD_DROP_RATE = 0.005;
/** Win streak adds this much loot chance per consecutive win. */
export const WIN_STREAK_DROP_BONUS_PER_WIN = 0.005;
/** ...up to this much. */
export const WIN_STREAK_DROP_BONUS_CAP = 0.10;

const RARITY_ORDER: GearRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Rep-gated rarity ladder. Lifetime Rep opens each rung of
 * `REP_PROGRESSION.gear`; legendary opens with epic. Anything rolled above
 * the open rung is handed out at that rung instead, so a tier-5 drop for a
 * new driver is still a drop — just a common one.
 */
export function maxRarityForLifetimeRep(lifetimeRep: number): GearRarity {
  const ladder = REP_PROGRESSION.gear;
  if (lifetimeRep >= ladder.epic) return "legendary";
  if (lifetimeRep >= ladder.rare) return "rare";
  if (lifetimeRep >= ladder.uncommon) return "uncommon";
  return "common";
}

function capRarity(rarity: GearRarity, cap: GearRarity): GearRarity {
  return RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(cap) ? cap : rarity;
}

/** Roll a random rarity given tier + optional bonus shifts, then apply the Rep ladder. */
export function rollRarity(sourceTier: number, rarityBonus: number, lifetimeRep: number): GearRarity {
  const tier = clamp(sourceTier, 0, 5);
  const baseWeights = { ...RARITY_WEIGHTS_BY_TIER[tier] };

  // rarityBonus (from rarity_sense upgrade: 1–3) shifts weight from common → higher rarities
  if (rarityBonus > 0) {
    const shift = rarityBonus * 6;
    baseWeights.common = Math.max(0, baseWeights.common - shift * 2);
    baseWeights.uncommon = Math.max(0, baseWeights.uncommon - shift * 0.5);
    baseWeights.rare += shift * 1.5;
    baseWeights.epic += shift * 0.7;
    baseWeights.legendary += shift * 0.3;
  }

  return capRarity(weightedPick(baseWeights), maxRarityForLifetimeRep(lifetimeRep));
}

/** Roll a set of effects for the given slot + rarity */
function rollEffects(
  slot: GearSlot,
  rarity: GearRarity,
): LootGearItem["effects"] {
  const pool: [string, number, number][] = [...LOOT_EFFECT_POOLS[slot], ["fatigue_rate_reduction", 0.02, 0.08], ["fatigue_recovery_pct", 0.05, 0.20]];
  const [minCount, maxCount] = RARITY_EFFECT_COUNT[rarity];
  const count = randInt(minCount, Math.min(maxCount, pool.length));
  const [multMin, multMax] = RARITY_VALUE_MULTS[rarity];

  // Shuffle pool and take first `count` entries
  const shuffled = [...pool].sort(() => random() - 0.5);
  const picked = shuffled.slice(0, count);

  return picked.map(([type, baseMin, baseMax]) => {
    const mult = lerp(multMin, multMax, random());
    const value = parseFloat((lerp(baseMin, baseMax, random()) * mult).toFixed(4));
    return { type, value };
  });
}

/** Build a complete LootGearItem */
function buildLootGear(
  slot: GearSlot,
  rarity: GearRarity,
  source: string,
): LootGearItem {
  return {
    id: makeGearId(),
    slot,
    rarity,
    name: generateLootName(slot, rarity),
    effects: rollEffects(slot, rarity),
    setId: weightedPick({ junkyard_dog: 3, track_rat: 3, iron_lungs: source.includes("endurance") ? 6 : 2 }),
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source,
  };
}

function buildMod(): InstalledMod {
  const template = GEAR_MOD_TEMPLATES[randInt(0, GEAR_MOD_TEMPLATES.length - 1)];
  const value = parseFloat(
    lerp(template.minValue, template.maxValue, random()).toFixed(4)
  );
  return {
    id: makeModInstanceId(),
    templateId: template.id,
    drawback: template.drawback,
    name: template.name,
    effectType: template.effectType,
    value,
  };
}

// ── Race loot ───────────────────────────────────────────────────────────────

export interface GearDropParams {
  eventId?: string;
  sourceTier: number;          // circuit.tier
  sourceId: string;            // for flavor
  raceResult: "win" | "loss" | "dnf";
  winStreak: number;
  vehiclePerformance?: number; // vehicle vs circuit difficulty ratio
  lifetimeRep: number;         // Rep-gated rarity ladder
  gearDropRateRaceBonus: number;      // from trophy_hunter upgrade (+ team gear_drop_rate)
  rarityBonus: number;                // from rarity_sense upgrade (0–3)
  doubleDropChance: number;           // from double_drop upgrade (0–0.15)
  modDropRateBonus: number;           // from mod_hunter upgrade
}

/** Chance of at least one loot gear piece for a race, before the roll. */
export function raceLootDropChance(params: Pick<GearDropParams, "raceResult" | "winStreak" | "gearDropRateRaceBonus">): number {
  const base = RACE_LOOT_DROP_RATE[params.raceResult] + params.gearDropRateRaceBonus;
  return base + clamp(params.winStreak * WIN_STREAK_DROP_BONUS_PER_WIN, 0, WIN_STREAK_DROP_BONUS_CAP);
}

/** Race payout: 0–2 loot gear pieces and 0–1 gear mod, all for the Locker. */
export function rollGearDrops(params: GearDropParams): {
  gearDrops: LootGearItem[];
  modDrop: InstalledMod | null;
} {
  const gearDropChance = raceLootDropChance(params);

  // Vehicle performance boost to tier (if performance >> difficulty, shift tier up by 1)
  let effectiveTier = clamp(params.sourceTier, 0, 5);
  if (params.vehiclePerformance !== undefined && params.vehiclePerformance > 1.5) {
    effectiveTier = clamp(effectiveTier + 1, 0, 5);
  }

  const gearDrops: LootGearItem[] = [];

  if (random() < gearDropChance) {
    const slot = GEAR_SLOTS[randInt(0, GEAR_SLOTS.length - 1)];
    const rarity = rollRarity(effectiveTier, params.rarityBonus, params.lifetimeRep);
    gearDrops.push(buildLootGear(slot, rarity, params.sourceId));

    // Double drop chance
    if (params.doubleDropChance > 0 && random() < params.doubleDropChance) {
      const slot2 = GEAR_SLOTS[randInt(0, GEAR_SLOTS.length - 1)];
      const rarity2 = rollRarity(effectiveTier, params.rarityBonus, params.lifetimeRep);
      gearDrops.push(buildLootGear(slot2, rarity2, params.sourceId));
    }
  }

  // Gear mods only come off a win.
  const modDropChance = params.raceResult === "win" && params.eventId === "feature" ? RACE_MOD_DROP_RATE + params.modDropRateBonus : 0;
  const modDrop = modDropChance > 0 && random() < modDropChance ? buildMod() : null;

  return { gearDrops, modDrop };
}

// ── Scavenge station equipment ──────────────────────────────────────────────

export interface StationDropParams {
  sourceTier: number;          // location.tier
  sourceId: string;            // for flavor
  lifetimeRep: number;         // Rep-gated rarity ladder
  gearDropRateScavengeBonus: number;  // from gear_scavenger upgrade (+ team gear_drop_rate)
  rarityBonus: number;                // from rarity_sense upgrade (0–3)
  doubleDropChance: number;           // from double_drop upgrade (0–0.15)
  modDropRateBonus: number;           // from mod_hunter upgrade (loose shard finds)
}

/** Scavenge payout: 0–2 station equipment pieces and 0–1 loose Reforge Shard. */
export function rollStationDrops(params: StationDropParams): {
  stationDrops: StationEquipment[];
  shardDrop: boolean;
} {
  const dropChance = SCAVENGE_STATION_DROP_RATE + params.gearDropRateScavengeBonus;
  const tier = clamp(params.sourceTier, 0, 5);
  const stationDrops: StationEquipment[] = [];

  const forge = (): StationEquipment => {
    const slot = GARAGE_STATION_IDS[randInt(0, GARAGE_STATION_IDS.length - 1)];
    const rarity = rollRarity(tier, params.rarityBonus, params.lifetimeRep);
    return { ...forgeStationEquipment(slot, rarity), source: params.sourceId };
  };

  if (random() < dropChance) {
    stationDrops.push(forge());
    if (params.doubleDropChance > 0 && random() < params.doubleDropChance) stationDrops.push(forge());
  }

  const shardDrop = random() < SCAVENGE_SHARD_DROP_RATE + params.modDropRateBonus;
  return { stationDrops, shardDrop };
}
