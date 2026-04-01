import { GEAR_SLOTS, type GearSlot } from "@/data/gear";
import {
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
import { weightedPick, randInt } from "@/utils/random";

let _instanceCounter = 0;
function makeGearId(): string {
  return `lg_${Date.now()}_${_instanceCounter++}`;
}
function makeModInstanceId(): string {
  return `mod_${Date.now()}_${_instanceCounter++}`;
}

// ── Drop chance constants ───────────────────────────────────────────────────
const BASE_SCAVENGE_RATE = 0.03;     // 3% per manual/auto scavenge
const BASE_RACE_WIN_RATE  = 0.08;    // 8% on win
const BASE_RACE_LOSS_RATE = 0.03;    // 3% on loss
const BASE_RACE_DNF_RATE  = 0.01;    // 1% on DNF
const BASE_MOD_SCAVENGE   = 0.005;   // 0.5% mod drop from scavenge
const BASE_MOD_WIN        = 0.01;    // 1% mod drop from win

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Roll a random rarity given tier + optional bonus shifts */
function rollRarity(sourceTier: number, rarityBonus: number): GearRarity {
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

  return weightedPick(baseWeights);
}

/** Roll a set of effects for the given slot + rarity */
function rollEffects(
  slot: GearSlot,
  rarity: GearRarity,
): LootGearItem["effects"] {
  const pool = LOOT_EFFECT_POOLS[slot];
  const [minCount, maxCount] = RARITY_EFFECT_COUNT[rarity];
  const count = randInt(minCount, Math.min(maxCount, pool.length));
  const [multMin, multMax] = RARITY_VALUE_MULTS[rarity];

  // Shuffle pool and take first `count` entries
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  return picked.map(([type, baseMin, baseMax]) => {
    const mult = lerp(multMin, multMax, Math.random());
    const value = parseFloat((lerp(baseMin, baseMax, Math.random()) * mult).toFixed(4));
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
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source,
  };
}

export interface GearDropParams {
  source: "scavenge" | "race";
  sourceTier: number;          // location.tier or circuit.tier
  sourceId: string;            // for flavor
  raceResult?: "win" | "loss" | "dnf";
  winStreak: number;
  vehiclePerformance?: number; // vehicle vs circuit difficulty ratio
  gearDropRateScavengeBonus: number;  // from gear_scavenger upgrade
  gearDropRateRaceBonus: number;      // from trophy_hunter upgrade
  rarityBonus: number;                // from rarity_sense upgrade (0–3)
  doubleDropChance: number;           // from double_drop upgrade (0–0.15)
  modDropRateBonus: number;           // from mod_hunter upgrade
}

/** Main entry: returns 0–2 gear items and 0–1 mod */
export function rollGearDrops(params: GearDropParams): {
  gearDrops: LootGearItem[];
  modDrop: InstalledMod | null;
} {
  // ── Determine base drop chance ──────────────────────────────────────────
  let gearDropChance: number;
  if (params.source === "scavenge") {
    gearDropChance = BASE_SCAVENGE_RATE + params.gearDropRateScavengeBonus;
  } else {
    const result = params.raceResult ?? "loss";
    const base = result === "win" ? BASE_RACE_WIN_RATE
               : result === "loss" ? BASE_RACE_LOSS_RATE
               : BASE_RACE_DNF_RATE;
    gearDropChance = base + params.gearDropRateRaceBonus;
  }

  // Win streak bonus (+0.5% per streak, cap +10%)
  gearDropChance += clamp(params.winStreak * 0.005, 0, 0.10);

  // Vehicle performance boost to tier (if performance >> difficulty, shift tier up by 1)
  let effectiveTier = clamp(params.sourceTier, 0, 5);
  if (params.vehiclePerformance !== undefined && params.vehiclePerformance > 1.5) {
    effectiveTier = clamp(effectiveTier + 1, 0, 5);
  }

  const gearDrops: LootGearItem[] = [];

  if (Math.random() < gearDropChance) {
    const slot = GEAR_SLOTS[randInt(0, GEAR_SLOTS.length - 1)];
    const rarity = rollRarity(effectiveTier, params.rarityBonus);
    gearDrops.push(buildLootGear(slot, rarity, params.sourceId));

    // Double drop chance
    if (params.doubleDropChance > 0 && Math.random() < params.doubleDropChance) {
      const slot2 = GEAR_SLOTS[randInt(0, GEAR_SLOTS.length - 1)];
      const rarity2 = rollRarity(effectiveTier, params.rarityBonus);
      gearDrops.push(buildLootGear(slot2, rarity2, params.sourceId));
    }
  }

  // ── Mod drop ──────────────────────────────────────────────────────────
  const modDropChance = params.source === "scavenge"
    ? BASE_MOD_SCAVENGE + params.modDropRateBonus
    : (params.raceResult === "win" ? BASE_MOD_WIN + params.modDropRateBonus : 0);

  let modDrop: InstalledMod | null = null;
  if (modDropChance > 0 && Math.random() < modDropChance) {
    const template = GEAR_MOD_TEMPLATES[randInt(0, GEAR_MOD_TEMPLATES.length - 1)];
    const value = parseFloat(
      lerp(template.minValue, template.maxValue, Math.random()).toFixed(4)
    );
    modDrop = {
      id: makeModInstanceId(),
      templateId: template.id,
      name: template.name,
      effectType: template.effectType,
      value,
    };
  }

  return { gearDrops, modDrop };
}
