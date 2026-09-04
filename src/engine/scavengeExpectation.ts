/**
 * Expected value of one automated scavenge, derived from the same inputs and
 * distributions `scavenge()` rolls (see engine/scavenge and utils/random).
 * Used by the resource rates so the HUD never carries a separate estimate.
 */
import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue, getSellValueBonus } from "@/state/store";
import { getLocationById, normalizeScoutingOrder, type LocationDefinition } from "@/data/locations";
import { ADDON_DEFINITIONS } from "@/data/addons";
import { CONDITIONS, getScavengeCap, PART_DEFINITIONS, type PartCategory, type PartCondition } from "@/data/parts";
import { getGearBonuses } from "./gear";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";
import { getPermanentRuntimeBonuses } from "./permanentBonuses";
import { getSkillBonuses } from "./skills";
import { getAutoSellThreshold } from "./autoSell";
import { getPartSaleValue } from "./sale";
import type { ScavengedPart } from "./scavenge";

export interface ScavengeExpectation {
  /** Parts and add-ons produced per scavenge. */
  partsPerScavenge: number;
  /** Parts and add-ons kept after the junk auto-sell. */
  keptPartsPerScavenge: number;
  /** Scrap Bucks from auto-sold junk per scavenge. */
  autoSellScrapPerScavenge: number;
}

const EMPTY: ScavengeExpectation = { partsPerScavenge: 0, keptPartsPerScavenge: 0, autoSellScrapPerScavenge: 0 };

/** P(condition index = i) for `rollCondition(rarityBias, cap)`. */
export function conditionProbabilities(rarityBias: number, cap: number): number[] {
  const poolLength = Math.min(Math.max(0, cap), CONDITIONS.length - 1) + 1;
  const exponent = 1 + 3 * (1 - rarityBias);
  const cdf = (x: number) => Math.pow(x, 1 / exponent);
  return Array.from({ length: poolLength }, (_, index) =>
    cdf((index + 1) / poolLength) - cdf(index / poolLength));
}

/** Expected `count` from `randInt(1, max)` scaled by the yield bonus, floored at 1. */
function expectedCount(maxParts: number, yieldBonus: number): number {
  const max = Math.max(1, Math.floor(maxParts));
  let total = 0;
  for (let base = 1; base <= max; base++) total += Math.max(1, Math.round(base * (1 + yieldBonus)));
  return total / max;
}

/**
 * P(definition) inside one category: `randInt(0, min(len-1, floor(len*0.6 + r*len*0.4)))`
 * integrated over the uniform roll `r`.
 */
function definitionWeights(length: number): number[] {
  const weights = new Array<number>(length).fill(0);
  const low = 0.6 * length;
  const span = 0.4 * length;
  for (let k = Math.floor(low); k <= length; k++) {
    const from = Math.max(0, (k - low) / span);
    const to = Math.min(1, (k + 1 - low) / span);
    if (to <= from) continue;
    const bound = Math.min(length - 1, k);
    for (let index = 0; index <= bound; index++) weights[index] += (to - from) / (bound + 1);
  }
  return weights;
}

function saleValue(definitionId: string, type: ScavengedPart["type"], condition: PartCondition, bonus: number): number {
  return getPartSaleValue({ id: "expected", definitionId, condition, foundAt: "expected", type }, bonus) ?? 0;
}

interface CategoryExpectation {
  parts: number;
  kept: number;
  scrap: number;
}

function expectCategory(
  location: LocationDefinition,
  category: PartCategory,
  conditionProbs: number[],
  soldIndexLimit: number,
  qualityBonus: number,
  sellBonus: number,
): CategoryExpectation {
  const eligible = PART_DEFINITIONS.filter((part) => part.category === category && part.minTier <= (location.maxPartTier ?? location.tier));
  if (eligible.length === 0) return { parts: 0, kept: 0, scrap: 0 };
  const baseWeights = definitionWeights(eligible.length);
  const highestTier = Math.max(...eligible.map((part) => part.minTier));
  const highTierCount = eligible.filter((part) => part.minTier === highestTier).length;
  const quality = Math.min(1, Math.max(0, qualityBonus));
  const keptProbability = conditionProbs.reduce((sum, p, index) => (index >= soldIndexLimit ? sum + p : sum), 0);

  let scrap = 0;
  eligible.forEach((part, index) => {
    const weight = (1 - quality) * baseWeights[index] + (part.minTier === highestTier ? quality / highTierCount : 0);
    conditionProbs.forEach((p, conditionIndex) => {
      if (conditionIndex >= soldIndexLimit) return;
      scrap += weight * p * saleValue(part.id, "part", CONDITIONS[conditionIndex], sellBonus);
    });
  });

  // Secondary add-on roll for this slot category.
  const addonChance = 0.03 + location.tier * 0.05;
  const addons = ADDON_DEFINITIONS.filter((addon) => addon.targetSlot === category && addon.minTier <= location.tier);
  let addonParts = 0;
  let addonKept = 0;
  let addonScrap = 0;
  if (addons.length > 0) {
    addonParts = addonChance;
    addonKept = addonChance * keptProbability;
    for (const addon of addons) {
      conditionProbs.forEach((p, conditionIndex) => {
        if (conditionIndex >= soldIndexLimit) return;
        addonScrap += (addonChance / addons.length) * p * saleValue(addon.id, "addon", CONDITIONS[conditionIndex], sellBonus);
      });
    }
  }
  return { parts: 1 + addonParts, kept: keptProbability + addonKept, scrap: scrap + addonScrap };
}

/** Expected yield of one automated scavenge at the selected location. */
export function expectedScavenge(state: GameState): ScavengeExpectation {
  const location = getLocationById(state.selectedLocationId);
  if (!location) return EMPTY;

  const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
  const milestone = getPrestigeMilestoneBonuses(state.prestigeCount);
  const permanent = getPermanentRuntimeBonuses(state);
  const skill = getSkillBonuses(state.racerSkills, location.tier);
  const luck = (state.prestigeBonus?.luckBonus ?? 0) + milestone.scavengeLuckBonus + permanent.scavengeLuckBonus
    + _getUpgradeEffectValue(state, "keen_eye") + skill.scavengingLuckBonus;
  const yieldBonus = gear.scavenge_yield_pct + skill.scavengingYieldBonus + milestone.scavengeYieldMult + permanent.scavengeYieldMult;
  const fatiguePenalty = (state.fatigue ?? 0) * 0.005;
  const rarity = Math.max(0, Math.min(1, location.rarityBias + luck + gear.scavenge_luck_bonus - fatiguePenalty));
  const conditionProbs = conditionProbabilities(rarity, getScavengeCap(location.tier));
  const soldIndexLimit = CONDITIONS.indexOf(getAutoSellThreshold(state));
  const sellBonus = getSellValueBonus(state);

  const weights = { ...location.partDropRates };
  const scoutingOrder = normalizeScoutingOrder(state.scoutingOrder, location);
  if (scoutingOrder && weights[scoutingOrder] > 0) weights[scoutingOrder] *= 3;
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return EMPTY;

  let perRoll: CategoryExpectation = { parts: 0, kept: 0, scrap: 0 };
  for (const [category, weight] of Object.entries(weights) as [PartCategory, number][]) {
    if (weight <= 0) continue;
    const share = weight / totalWeight;
    const expectation = expectCategory(location, category, conditionProbs, soldIndexLimit, permanent.scavengeQualityBonus, sellBonus);
    perRoll = {
      parts: perRoll.parts + share * expectation.parts,
      kept: perRoll.kept + share * expectation.kept,
      scrap: perRoll.scrap + share * expectation.scrap,
    };
  }

  // Base roll count, Deep Pockets bonus scavenges (first part each), Thorough Search doubling.
  const rolls = expectedCount(location.maxPartsPerScavenge, yieldBonus) + Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
  const doubling = 1 + Math.max(0, _getUpgradeEffectValue(state, "thorough_search"));
  return {
    partsPerScavenge: rolls * doubling * perRoll.parts,
    keptPartsPerScavenge: rolls * doubling * perRoll.kept,
    autoSellScrapPerScavenge: rolls * doubling * perRoll.scrap,
  };
}
