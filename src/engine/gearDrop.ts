import { GEAR_SLOTS, type GearSlot } from "@/data/gearSlots";
import {
  type GearRarity,
  type LootGearItem,
  type InstalledMod,
  RARITY_WEIGHTS_BY_TIER,
  RARITY_PRIMARY_RANGE,
  RARITY_SECONDARY_RANGE,
  RARITY_SECONDARY_COUNT,
  generateLootName,
} from "@/data/lootGear";
import {
  SLOT_AFFINITIES,
  attributeEffectType,
  type GearAttributeId,
} from "@/data/gearAttributes";
import { GEAR_MOD_TEMPLATES } from "@/data/gearMods";
import { GEAR_SETS } from "@/data/gearSets";
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

function pickAttribute(pool: GearAttributeId[]): GearAttributeId {
  return pool[randInt(0, pool.length - 1)];
}

/** Roll attribute-based effects: 1 primary + N secondaries by rarity. */
function rollEffects(
  slot: GearSlot,
  rarity: GearRarity,
): LootGearItem["effects"] {
  const affinity = SLOT_AFFINITIES[slot];
  const effects: LootGearItem["effects"] = [];
  const usedAttrs = new Set<GearAttributeId>();

  // Primary
  const primaryId = pickAttribute(affinity.primary);
  const [primMin, primMax] = RARITY_PRIMARY_RANGE[rarity];
  effects.push({
    type: attributeEffectType(primaryId),
    value: randInt(primMin, primMax),
  });
  usedAttrs.add(primaryId);

  // Secondaries
  const secondaryCount = RARITY_SECONDARY_COUNT[rarity];
  const [secMin, secMax] = RARITY_SECONDARY_RANGE[rarity];
  const secondaryPool = [
    ...affinity.secondary,
    ...affinity.primary, // allow re-roll into primary pool
  ].filter((id) => !usedAttrs.has(id));

  for (let i = 0; i < secondaryCount && secondaryPool.length > 0; i++) {
    const pickIdx = randInt(0, secondaryPool.length - 1);
    const id = secondaryPool.splice(pickIdx, 1)[0];
    const value = randInt(secMin, secMax);
    if (value <= 0) continue;
    effects.push({ type: attributeEffectType(id), value });
    usedAttrs.add(id);
  }

  return effects;
}

// Chance a drop belongs to a gear set, scaled up by rarity
const SET_CHANCE_BY_RARITY: Record<GearRarity, number> = {
  common:    0.00,
  uncommon:  0.05,
  rare:      0.12,
  epic:      0.22,
  legendary: 0.35,
};

function rollSetId(slot: GearSlot, rarity: GearRarity): string | undefined {
  if (Math.random() > SET_CHANCE_BY_RARITY[rarity]) return undefined;
  const eligible = GEAR_SETS.filter((s) => s.slots.includes(slot));
  if (eligible.length === 0) return undefined;
  return eligible[randInt(0, eligible.length - 1)].id;
}

/** Build a complete LootGearItem */
function buildLootGear(
  slot: GearSlot,
  rarity: GearRarity,
  source: string,
): LootGearItem {
  const setId = rollSetId(slot, rarity);
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
    ...(setId ? { setId } : {}),
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
