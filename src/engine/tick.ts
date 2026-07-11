import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue, _grantXp, addRewardMaterials, calculateChallengeRewardBundle, calculateFatigue, checkChallenges, getCrewXpMultiplier, getSellValueBonus, grantTraderSaleXp } from "@/state/store";
import { scavenge } from "./scavenge";
import type { ScavengedPart } from "./scavenge";
import { getGearBonuses } from "./gear";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { simulateRace, calculateWear, compactRaceHistory, type RaceOutcome } from "./race";
import { rollGearDrops } from "./gearDrop";
import type { LootGearItem, InstalledMod } from "@/data/lootGear";
import { TALENT_NODES } from "@/data/talentNodes";
import { getActiveMomentumTiers, getMomentumEffectValue } from "@/data/momentumBonuses";
import { deriveHighestCircuitTier, getLegacyEffectValue } from "./prestige";
import { getSkillBonuses } from "./skills";
import { TRACK_PERK_DEFINITIONS } from "@/data/trackPerks";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { AUTOMATION_DROP_DETAIL_LIMIT, OFFLINE_LOOSE_INVENTORY_LIMIT, OFFLINE_TICK_MS_MIN, STATION_EQUIPMENT_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import { getPartSaleValue } from "./sale";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";
import { autoSellRustedParts } from "./autoSell";
import { getPermanentRuntimeBonuses, multiplyReward } from "./permanentBonuses";
import { grantCrewRoleXp } from "./crew";
import type { MaterialType } from "@/data/materials";
import { checkAchievements } from "./achievements";
import type { AchievementStats } from "@/data/achievements";
import type { RacerSkills } from "@/data/racerSkills";
import type { CrewMember } from "@/data/crew";
import { calculateStats } from "./build";
import { getVehicleById, getVehicleIdsUnlockedByProgress } from "@/data/vehicles";
import { canEnterSelectedRace, canScavengeSelectedLocation } from "./eligibility";
import { getCircuitsUnlockedByReputation, getLocationsUnlockedByReputation } from "./progressionUnlocks";
import { convertLegacyLootDrop } from "@/data/stationEquipment";
import { getStationSalvageYield } from "./stationReforge";

/** Base tick duration — 30 seconds. */
export const TICK_MS_DEFAULT = 30_000;
/** Minimum tick duration — 0.1 seconds. */
export const TICK_MS_MIN = 100;
/** Default number of ticks required to fire one auto-race. */
export const RACE_TICKS_DEFAULT = 3;
/** Minimum number of ticks required to fire one auto-race. */
export const RACE_TICKS_MIN = 1;

export interface TickResult {
  partsFound: ReturnType<typeof scavenge>;
  partsScavenged: number;
  partsAutoSold: number;
  scrapsFromAutoSoldParts: number;
  junkFilteredParts: number;
  junkFilterScrap: number;
  scavengesCompleted: number;
  raceSalvageFound: number;
  forgeTokensFound: number;
  entryFeesPaid: number;
  scrapsEarned: number;
  repEarned: number;
  raceOutcome: ReturnType<typeof simulateRace> | null;
  vehicleWearAmount: number;
  vehicleRepairAmount: number;
  lootGearDrops: LootGearItem[];
  modDrops: InstalledMod[];
  /** Updated race tick progress (0 = just fired, or incremented counter). */
  newRaceTickProgress: number;
}

/**
 * Returns the current tick interval in ms, factoring in workshop upgrades and gear.
 * Clamped to [TICK_MS_MIN, TICK_MS_DEFAULT].
 */
export function computeTickSpeedMs(state: GameState): number {
  const upgradeReductionMs =
    _getUpgradeEffectValue(state, "tick_accelerator") +
    _getUpgradeEffectValue(state, "overclocked_tick");
  const trackReductionMs = getGameEffectValue(TRACK_PERK_DEFINITIONS, state.trackPerkLevels, "tick_speed_reduction") * 1000;
  const gearBonuses = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
  const gearReductionMs = (gearBonuses.tick_speed_reduction_ms ?? 0);
  const milestoneReductionMs = getPrestigeMilestoneBonuses(state.prestigeCount).tickSpeedReductionMs;
  return Math.max(TICK_MS_MIN, TICK_MS_DEFAULT - upgradeReductionMs - gearReductionMs - trackReductionMs - milestoneReductionMs);
}

/**
 * Returns how many ticks must pass before one auto-race fires.
 * Clamped to [RACE_TICKS_MIN, RACE_TICKS_DEFAULT].
 */
export function getRaceTicksNeeded(state: GameState): number {
  const reduction = _getUpgradeEffectValue(state, "pit_crew");
  return Math.max(RACE_TICKS_MIN, RACE_TICKS_DEFAULT - reduction);
}

/** Pure function: compute one tick of idle progress */
export function computeTick(state: GameState): TickResult {
  const result: TickResult = {
    partsFound: [],
    partsScavenged: 0,
    partsAutoSold: 0,
    scrapsFromAutoSoldParts: 0,
    junkFilteredParts: 0,
    junkFilterScrap: 0,
    scavengesCompleted: 0,
    raceSalvageFound: 0,
    forgeTokensFound: 0,
    entryFeesPaid: 0,
    scrapsEarned: 0,
    repEarned: 0,
    raceOutcome: null,
    vehicleWearAmount: 0,
    vehicleRepairAmount: 0,
    lootGearDrops: [],
    modDrops: [],
    newRaceTickProgress: state.raceTickProgress,
  };

  const gearBonuses = getGearBonuses(
    state.equippedGear,
    state.equippedLootGear,
    state.lootGearInventory,
    state.unlockedTalentNodes,
    TALENT_NODES,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const milestoneBonuses = getPrestigeMilestoneBonuses(state.prestigeCount);
  const permanentBonuses = getPermanentRuntimeBonuses(state);

  // ── Shared gear lab workshop values ──────────────────────────────────────
  const gearDropRateScavengeBonus = _getUpgradeEffectValue(state, "gear_scavenger") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "gear_drop_rate");
  const gearDropRateRaceBonus     = _getUpgradeEffectValue(state, "trophy_hunter") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "gear_drop_rate");
  const rarityBonus               = Math.floor(_getUpgradeEffectValue(state, "rarity_sense"));
  const doubleDropChance          = _getUpgradeEffectValue(state, "double_drop");
  const modDropRateBonus          = _getUpgradeEffectValue(state, "mod_hunter");

  // Auto-scavenge (with workshop upgrade bonuses + gear bonuses + skill bonuses) — fires every tick
  if (state.autoScavengeUnlocked && canScavengeSelectedLocation(state)) {
    const location = getLocationById(state.selectedLocationId);
    if (location) {
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue ?? 0;
      const scavSkill = getSkillBonuses(state.racerSkills, location.tier);
      const scavengeLuck = state.prestigeBonus.luckBonus + milestoneBonuses.scavengeLuckBonus + permanentBonuses.scavengeLuckBonus + extraLuck + scavSkill.scavengingLuckBonus;
      const scavengeYield = gearBonuses.scavenge_yield_pct + scavSkill.scavengingYieldBonus + milestoneBonuses.scavengeYieldMult + permanentBonuses.scavengeYieldMult;
      const parts = scavenge(location, scavengeLuck, fatigue, gearBonuses.scavenge_luck_bonus, scavengeYield, permanentBonuses.scavengeQualityBonus);
      // Add extra parts from Deep Pockets
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, scavengeLuck, fatigue, gearBonuses.scavenge_luck_bonus, scavengeYield, permanentBonuses.scavengeQualityBonus);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      const autoSale = autoSellRustedParts(parts, milestoneBonuses.autoSellRusted, getSellValueBonus(state));
      result.partsFound = autoSale.keptParts;
      result.partsScavenged = parts.length;
      result.scavengesCompleted = 1;
      result.partsAutoSold = autoSale.soldParts.length;
      result.scrapsFromAutoSoldParts = autoSale.scrapEarned;
      result.junkFilteredParts = autoSale.soldParts.length;
      result.junkFilterScrap = autoSale.scrapEarned;
      result.scrapsEarned += autoSale.scrapEarned;

      // Gear drop roll from auto-scavenge
      const { gearDrops, modDrop } = rollGearDrops({
        source: "scavenge",
        sourceTier: location.tier,
        sourceId: location.id,
        winStreak: state.winStreak,
        gearDropRateScavengeBonus,
        gearDropRateRaceBonus,
        rarityBonus,
        doubleDropChance,
        modDropRateBonus,
      });
      result.lootGearDrops.push(...gearDrops);
      if (modDrop) result.modDrops.push(modDrop);
    }
  }

  // Auto-race — fires every N ticks (multi-tick)
  if (state.autoRaceUnlocked && state.activeVehicleId && state.selectedCircuitId) {
    const raceTicksNeeded = getRaceTicksNeeded(state);
    const newRaceProgress = state.raceTickProgress + 1;

    if (newRaceProgress >= raceTicksNeeded) {
      // Time to race — reset progress
      result.newRaceTickProgress = 0;

      const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
      const circuit = getCircuitById(state.selectedCircuitId);

      if (vehicle && circuit) {
        const vehicleCondition = vehicle.condition ?? 100;

        // Auto-repair if upgrade exists and vehicle needs it
        const autoRepairRate = _getUpgradeEffectValue(state, "auto_repair");
        if (autoRepairRate > 0 && vehicleCondition < 100) {
          result.vehicleRepairAmount = Math.min(Math.floor(autoRepairRate), 100 - vehicleCondition);
        }

        // Manual and automated races share the same authoritative gate.
        if (canEnterSelectedRace(state)) {
          const fatigue = state.fatigue ?? 0;
          const momentumWinBonus = getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus");
          const skillBonuses = getSkillBonuses(state.racerSkills, circuit.tier);
          const enhancedRaceSalvage = _getUpgradeEffectValue(state, "scavengers_eye") > 0;
          result.raceOutcome = simulateRace(vehicle, circuit, 1, fatigue, gearBonuses.race_performance_pct + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "base_race_performance") + permanentBonuses.racePerformanceBonus, gearBonuses.race_dnf_reduction + permanentBonuses.raceDnfFlatReduction, enhancedRaceSalvage ? 0.30 : 0.15, enhancedRaceSalvage ? 2 : 1, momentumWinBonus, gearBonuses.forge_token_chance_bonus + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "forge_token_rate"), skillBonuses.drivingPerformanceMult, skillBonuses.drivingDnfReduction, false, state.currentRacePlan, permanentBonuses.raceDnfChanceMultiplier);

          // Apply consolation sponsor bonus
          const consolationBonus = _getUpgradeEffectValue(state, "consolation_sponsor");
          let scraps = result.raceOutcome.scrapsEarned;
          if (result.raceOutcome.result !== "win" && consolationBonus > 0) {
            scraps = Math.floor(scraps * (1 + consolationBonus));
          }
          // Gear race scrap bonus
          if (gearBonuses.race_scrap_bonus_pct > 0) {
            scraps = Math.floor(scraps * (1 + gearBonuses.race_scrap_bonus_pct));
          }
          // Apply momentum scrap/rep multipliers
          const momentumScrapMult = getMomentumEffectValue(state.activeMomentumTiers, "scrap_multiplier");
          const momentumRepMult = getMomentumEffectValue(state.activeMomentumTiers, "rep_multiplier");
          const projectedStreak = result.raceOutcome.result === "win" ? state.winStreak + 1 : 0;
          const streakScrapBonus = Math.min(permanentBonuses.winStreakScrapCap, projectedStreak * permanentBonuses.winStreakScrapBonus);
          const grossScraps = multiplyReward(Math.floor(scraps * (1 + momentumScrapMult)), (state.prestigeBonus.scrapMultiplier - 1) + milestoneBonuses.raceScrapMult + permanentBonuses.allScrapIncomeMult + permanentBonuses.raceScrapMult + streakScrapBonus);
          const finalRep = result.raceOutcome.repEarned * state.prestigeBonus.repMultiplier * (1 + momentumRepMult) * (1 + milestoneBonuses.raceRepMult + permanentBonuses.allRepIncomeMult + permanentBonuses.raceRepMult);
          result.scrapsEarned += grossScraps - circuit.entryFee;
          result.entryFeesPaid = circuit.entryFee;
          result.repEarned += finalRep;
          result.raceOutcome = { ...result.raceOutcome, scrapsEarned: grossScraps, repEarned: finalRep };
          if (result.raceOutcome.salvageDrop) {
            result.partsFound.push(result.raceOutcome.salvageDrop);
            result.raceSalvageFound = 1;
          }
          if (result.raceOutcome.forgeTokenDrop) result.forgeTokensFound = 1;

          // Calculate wear (workshop + gear + legacy reduction)
          const wearReduction = _getUpgradeEffectValue(state, "reinforced_chassis");
          const legacyWearReduction = getLegacyEffectValue(state.legacyUpgradeLevels, "leg_wear_reduction");
          result.vehicleWearAmount = calculateWear(vehicle, result.raceOutcome.result, wearReduction + legacyWearReduction, fatigue, gearBonuses.race_wear_reduction_pct, skillBonuses.enduranceWearReduction, result.raceOutcome.planEvaluation?.wearMultiplier ?? 1);

          // Gear drop roll from auto-race
          const vehiclePerf = vehicle.stats
            ? vehicle.stats.speed / (circuit.difficulty || 1)
            : 1;
          const { gearDrops, modDrop } = rollGearDrops({
            source: "race",
            sourceTier: circuit.tier,
            sourceId: circuit.id,
            raceResult: result.raceOutcome.result,
            winStreak: projectedStreak,
            vehiclePerformance: vehiclePerf,
            gearDropRateScavengeBonus,
            gearDropRateRaceBonus,
            rarityBonus,
            doubleDropChance,
            modDropRateBonus,
          });
          result.lootGearDrops.push(...gearDrops);
          if (modDrop) result.modDrops.push(modDrop);
        }
      }
    } else {
      // Accumulate tick progress toward next race
      result.newRaceTickProgress = newRaceProgress;
    }
  }

  return result;
}

// ── Offline catch-up simulation ───────────────────────────────────────────

export interface OfflineResult {
  /** Parts retained for the player's inventory after overflow processing. */
  partsFound: ScavengedPart[];
  /** Total parts produced before the offline inventory cap was applied. */
  partsScavenged: number;
  /** Overflow parts automatically converted to Scrap Bucks. */
  partsAutoSold: number;
  /** Portion of scrapsEarned produced by selling overflow parts. */
  scrapsFromAutoSoldParts: number;
  junkFilteredParts: number;
  junkFilterScrap: number;
  overflowPartsAutoSold: number;
  overflowScrap: number;
  scavengesCompleted: number;
  raceSalvageFound: number;
  forgeTokensFound: number;
  entryFeesPaid: number;
  scrapsEarned: number;
  repEarned: number;
  vehicleWearTotal: number;
  vehicleRepairTotal: number;
  raceTickProgress: number;
  lootGearDrops: LootGearItem[];
  modDrops: InstalledMod[];
  /** Total mod drops, including detail records collapsed into shard currency. */
  modDropsFound: number;
  /** Station equipment automatically salvaged after reaching the ceiling. */
  stationEquipmentAutoSalvaged: number;
  /** Shards produced by collapsed mod records and station overflow. */
  reforgeShardsFound: number;
  /** Actual number of races that fired during offline simulation. */
  racesCompleted: number;
  winsCompleted: number;
  finalWinStreak: number;
  bestWinStreak: number;
  recentRaceOutcomes: RaceOutcome[];
  winningCircuitIds: string[];
  defeatedRivalIds: string[];
  circuitWinStreaks: Record<string, number>;
  challengesEvaluated: boolean;
  completedChallengeIds: string[];
  challengeForgeTokens: number;
  challengeMaterials: Partial<Record<MaterialType, number>>;
  finalFatigue: number;
  finalVehicleCondition: number | null;
  finalRacerSkills: RacerSkills;
  finalCrewRoster: CrewMember[];
  finalActiveMomentumTiers: string[];
  newAchievementIds: string[];
  ticksProcessed: number;
}

/**
 * Simulate multiple ticks of offline progress with proper state evolution.
 * Unlike the old inline loop, this evolves vehicle condition, scrapBucks,
 * fatigue, winStreak, and lifetimeRaces between ticks so that the simulation
 * matches what would have happened if the player were online.
 */
export function simulateOfflineTicks(
  initialState: GameState,
  maxTicks: number,
): OfflineResult {
  const result: OfflineResult = {
    partsFound: [],
    partsScavenged: 0,
    partsAutoSold: 0,
    scrapsFromAutoSoldParts: 0,
    junkFilteredParts: 0,
    junkFilterScrap: 0,
    overflowPartsAutoSold: 0,
    overflowScrap: 0,
    scavengesCompleted: 0,
    raceSalvageFound: 0,
    forgeTokensFound: 0,
    entryFeesPaid: 0,
    scrapsEarned: 0,
    repEarned: 0,
    vehicleWearTotal: 0,
    vehicleRepairTotal: 0,
    raceTickProgress: initialState.raceTickProgress,
    lootGearDrops: [],
    modDrops: [],
    modDropsFound: 0,
    stationEquipmentAutoSalvaged: 0,
    reforgeShardsFound: 0,
    racesCompleted: 0,
    winsCompleted: 0,
    finalWinStreak: initialState.winStreak,
    bestWinStreak: initialState.bestWinStreak,
    recentRaceOutcomes: [],
    winningCircuitIds: [],
    defeatedRivalIds: [],
    circuitWinStreaks: {},
    challengesEvaluated: true,
    completedChallengeIds: [],
    challengeForgeTokens: 0,
    challengeMaterials: {},
    finalFatigue: initialState.fatigue,
    finalVehicleCondition: initialState.garage.find((vehicle) => vehicle.id === initialState.activeVehicleId)?.condition ?? null,
    finalRacerSkills: initialState.racerSkills,
    finalCrewRoster: initialState.crewRoster,
    finalActiveMomentumTiers: initialState.activeMomentumTiers,
    newAchievementIds: [],
    ticksProcessed: 0,
  };

  if (maxTicks <= 0) return result;

  // Create a mutable snapshot of state fields that evolve between ticks.
  // We shallow-clone garage so we can mutate vehicle condition in place.
  const snap: GameState = {
    ...initialState,
    garage: initialState.garage.map((v) => ({ ...v })),
    earnedAchievements: initialState.earnedAchievements ?? [],
    completedChallenges: initialState.completedChallenges ?? [],
    challengeProgress: initialState.challengeProgress ?? {},
    materials: initialState.materials ?? ({} as GameState["materials"]),
    defeatedRivalIds: initialState.defeatedRivalIds ?? [],
  };
  const offlinePartCapacity = Math.max(0, OFFLINE_LOOSE_INVENTORY_LIMIT - initialState.inventory.length);
  const stationEquipmentCapacity = Math.max(
    0,
    STATION_EQUIPMENT_INVENTORY_LIMIT - (initialState.stationEquipmentInventory?.length ?? 0),
  );
  let currentCircuitStreakId: string | null = null;
  let currentCircuitStreak = 0;
  const latestRace = initialState.raceHistory[0];
  if (latestRace?.result === "win") {
    currentCircuitStreakId = latestRace.circuitId;
    for (const outcome of initialState.raceHistory) {
      if (outcome.result !== "win" || outcome.circuitId !== currentCircuitStreakId) break;
      currentCircuitStreak++;
    }
  }

  for (let i = 0; i < maxTicks; i++) {
    const tickState: GameState = { ...snap, raceTickProgress: result.raceTickProgress };
    const r = computeTick(tickState);

    // Accumulate totals
    result.partsScavenged += r.partsScavenged;
    result.partsAutoSold += r.partsAutoSold;
    result.scrapsFromAutoSoldParts += r.scrapsFromAutoSoldParts;
    result.junkFilteredParts += r.junkFilteredParts;
    result.junkFilterScrap += r.junkFilterScrap;
    result.scavengesCompleted += r.scavengesCompleted;
    result.raceSalvageFound += r.raceSalvageFound;
    result.forgeTokensFound += r.forgeTokensFound;
    result.entryFeesPaid += r.entryFeesPaid;
    let overflowAutoSold = 0;
    let overflowScrapThisTick = 0;
    const overflowSellValueBonus = getSellValueBonus(snap);
    for (const part of r.partsFound) {
      if (result.partsFound.length < offlinePartCapacity) {
        result.partsFound.push(part);
        continue;
      }
      const saleValue = getPartSaleValue(part, overflowSellValueBonus) ?? 0;
      result.partsAutoSold++;
      overflowAutoSold++;
      result.overflowPartsAutoSold++;
      result.scrapsFromAutoSoldParts += saleValue;
      result.overflowScrap += saleValue;
      result.scrapsEarned += saleValue;
      overflowScrapThisTick += saleValue;
      snap.scrapBucks += saleValue;
    }
    result.scrapsEarned += r.scrapsEarned;
    result.repEarned += r.repEarned;
    result.vehicleWearTotal += r.vehicleWearAmount;
    result.vehicleRepairTotal += r.vehicleRepairAmount;
    result.raceTickProgress = r.newRaceTickProgress;
    for (const drop of r.lootGearDrops) {
      if (result.lootGearDrops.length < stationEquipmentCapacity) {
        result.lootGearDrops.push(drop);
        continue;
      }
      const stationItem = convertLegacyLootDrop(drop);
      const shards = getStationSalvageYield(
        stationItem,
        snap.workshopLevels?.mod_hunter ?? 0,
        snap.workshopLevels?.gear_recycler ?? 0,
      );
      result.stationEquipmentAutoSalvaged++;
      result.reforgeShardsFound += shards;
      snap.reforgeShards = (snap.reforgeShards ?? 0) + shards;
    }
    result.modDropsFound += r.modDrops.length;
    const remainingModDetails = Math.max(0, AUTOMATION_DROP_DETAIL_LIMIT - result.modDrops.length);
    result.modDrops.push(...r.modDrops.slice(0, remainingModDetails));
    const collapsedModDrops = Math.max(0, r.modDrops.length - remainingModDetails);
    result.reforgeShardsFound += collapsedModDrops;
    snap.reforgeShards = (snap.reforgeShards ?? 0) + collapsedModDrops;
    result.ticksProcessed++;

    // ── Evolve state for next tick ──

    // Update scrapBucks (scrapsEarned already has entry fee subtracted)
    snap.scrapBucks += r.scrapsEarned;
    snap.repPoints += r.repEarned;
    snap.unlockedCircuitIds = [...new Set([
      ...snap.unlockedCircuitIds,
      ...getCircuitsUnlockedByReputation(snap.repPoints, snap.unlockedFeatures ?? []).map((circuit) => circuit.id),
    ])];
    snap.unlockedLocationIds = [...new Set([
      ...snap.unlockedLocationIds,
      ...getLocationsUnlockedByReputation(snap.repPoints).map((location) => location.id),
    ])];
    snap.forgeTokens += r.forgeTokensFound;
    snap.totalForgeTokensEarned = (snap.totalForgeTokensEarned ?? 0) + r.forgeTokensFound;
    snap.lifetimePartsScavengedAllTime = (snap.lifetimePartsScavengedAllTime ?? 0) + r.partsScavenged;
    const earnedScrapThisTick = r.scrapsEarned + r.entryFeesPaid + overflowScrapThisTick;
    snap.lifetimeScrapBucks = (snap.lifetimeScrapBucks ?? 0) + earnedScrapThisTick;
    snap.lifetimeScrapBucksAllTime = (snap.lifetimeScrapBucksAllTime ?? 0) + earnedScrapThisTick;
    if (r.scavengesCompleted > 0) {
      snap.racerSkills = _grantXp(snap.racerSkills, "scavenging", r.scavengesCompleted);
      snap.crewRoster = grantCrewRoleXp(snap.crewRoster, "scout", r.scavengesCompleted, getCrewXpMultiplier(snap));
    }
    const autoSoldThisTick = r.partsAutoSold + overflowAutoSold;
    if (autoSoldThisTick > 0) snap.crewRoster = grantTraderSaleXp(snap, autoSoldThisTick);

    // Track if a race happened this tick
    const raced = r.raceOutcome !== null;
    if (raced) {
      if (r.raceOutcome!.result === "win" && r.raceOutcome!.rivalId) {
        const rivalId = r.raceOutcome!.rivalId;
        const rivalRewardClaimed = !snap.defeatedRivalIds.includes(rivalId);
        if (rivalRewardClaimed) {
          snap.defeatedRivalIds = [...snap.defeatedRivalIds, rivalId];
          result.defeatedRivalIds.push(rivalId);
        }
        r.raceOutcome = { ...r.raceOutcome!, rivalRewardClaimed };
      }
      result.racesCompleted++;
      result.recentRaceOutcomes = compactRaceHistory([r.raceOutcome!, ...result.recentRaceOutcomes], 20);
      snap.raceHistory = compactRaceHistory([r.raceOutcome!, ...snap.raceHistory], 20);
      if (r.raceOutcome!.result === "win") {
        result.winsCompleted++;
        if (!result.winningCircuitIds.includes(r.raceOutcome!.circuitId)) result.winningCircuitIds.push(r.raceOutcome!.circuitId);
        currentCircuitStreak = currentCircuitStreakId === r.raceOutcome!.circuitId ? currentCircuitStreak + 1 : 1;
        currentCircuitStreakId = r.raceOutcome!.circuitId;
        result.circuitWinStreaks[r.raceOutcome!.circuitId] = Math.max(result.circuitWinStreaks[r.raceOutcome!.circuitId] ?? 0, currentCircuitStreak);
      } else {
        currentCircuitStreak = 0;
        currentCircuitStreakId = null;
      }

      // Update win streak
      snap.winStreak = r.raceOutcome!.result === "win" ? snap.winStreak + 1 : 0;
      snap.bestWinStreak = Math.max(snap.bestWinStreak, snap.winStreak);
      result.finalWinStreak = snap.winStreak;
      result.bestWinStreak = Math.max(result.bestWinStreak, snap.bestWinStreak);
      snap.racerSkills = _grantXp(snap.racerSkills, "driving", r.raceOutcome!.result === "win" ? 15 : 10);
      snap.crewRoster = grantCrewRoleXp(snap.crewRoster, "driver", 10, getCrewXpMultiplier(snap));

      // Update lifetime races & fatigue
      snap.lifetimeRaces += 1;
      snap.lifetimeRacesAllTime = (snap.lifetimeRacesAllTime ?? 0) + 1;
      snap.lifetimeWinsAllTime = (snap.lifetimeWinsAllTime ?? 0) + (r.raceOutcome!.result === "win" ? 1 : 0);
      snap.bestWinStreakAllTime = Math.max(snap.bestWinStreakAllTime ?? 0, snap.bestWinStreak);
      snap.lifetimeTotalRaceSalvage = (snap.lifetimeTotalRaceSalvage ?? 0) + r.raceSalvageFound;
      const circuitTier = getCircuitById(r.raceOutcome!.circuitId)?.tier ?? 1;
      const enduranceFatigueOffset = getSkillBonuses(tickState.racerSkills, circuitTier).enduranceFatigueOffset;
      const fatigueOffset = getLegacyEffectValue(snap.legacyUpgradeLevels, "leg_fatigue_offset") + enduranceFatigueOffset;
      const gearBonuses = getGearBonuses(snap.equippedGear, snap.equippedLootGear, snap.lootGearInventory, snap.unlockedTalentNodes, TALENT_NODES, snap.equippedStationEquipment, snap.stationEquipmentInventory);
      const rawFatigue = calculateFatigue(snap.lifetimeRaces, fatigueOffset);
      const ownerReduction = getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, snap.ownerUpgradeLevels, "fatigue_rate_reduction");
      const momentumReduction = getMomentumEffectValue(snap.activeMomentumTiers, "fatigue_reduction");
      const permanentFatigueReduction = getPermanentRuntimeBonuses(snap).fatigueReduction;
      const fatigueCap = Math.max(0, 99 - getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, snap.teamUpgradeLevels, "fatigue_cap_reduction"));
      snap.fatigue = Math.min(fatigueCap, Math.floor(rawFatigue * Math.max(0, 1 - gearBonuses.fatigue_rate_reduction - ownerReduction - momentumReduction - permanentFatigueReduction)));
      if (snap.fatigue >= 60) snap.racerSkills = _grantXp(snap.racerSkills, "endurance", 10);
      else if (snap.fatigue >= 40) snap.racerSkills = _grantXp(snap.racerSkills, "endurance", 5);
    }

    const wonCircuitIds = [...new Set(snap.raceHistory.filter((outcome) => outcome.result === "win").map((outcome) => outcome.circuitId))];
    snap.unlockedVehicleIds = [...new Set([
      ...snap.unlockedVehicleIds,
      ...getVehicleIdsUnlockedByProgress({
        reputation: snap.repPoints,
        wonCircuitIds,
        circuitWinStreaks: result.circuitWinStreaks,
        ownerUpgradeLevels: snap.ownerUpgradeLevels,
      }),
    ])];

    // Update vehicle condition (wear + repair)
    if (snap.activeVehicleId && (r.vehicleWearAmount > 0 || r.vehicleRepairAmount > 0)) {
      const vehicle = snap.garage.find((v) => v.id === snap.activeVehicleId);
      if (vehicle) {
        let cond = vehicle.condition ?? 100;
        if (r.vehicleRepairAmount > 0) cond = Math.min(100, cond + r.vehicleRepairAmount);
        if (r.vehicleWearAmount > 0) cond = Math.max(0, cond - r.vehicleWearAmount);
        vehicle.condition = cond;
        const definition = getVehicleById(vehicle.definitionId);
        if (definition) {
          const gearBonuses = getGearBonuses(snap.equippedGear, snap.equippedLootGear, snap.lootGearInventory, snap.unlockedTalentNodes, TALENT_NODES, snap.equippedStationEquipment, snap.stationEquipmentInventory);
          const handlingBonus = _getUpgradeEffectValue(snap, "tuned_suspension") + gearBonuses.race_handling_pct;
          vehicle.stats = calculateStats(definition, vehicle.parts, cond, handlingBonus);
        }
      }
    }

    // Challenges settle inside the batch so their rewards can fund and affect
    // subsequent ticks exactly as they do during live play.
    const challengeProgress = {
      ...snap.challengeProgress,
      winStreak: snap.bestWinStreak,
      fatigue: snap.fatigue,
      lifetimeRaces: snap.lifetimeRaces,
      totalRaceSalvage: snap.lifetimeTotalRaceSalvage,
    };
    const challengeCheck = checkChallenges(snap, challengeProgress, snap.completedChallenges);
    const challengeRewards = calculateChallengeRewardBundle(snap, challengeCheck.rewards);
    snap.challengeProgress = challengeProgress;
    if (challengeCheck.completed.length > 0) {
      snap.completedChallenges = [...snap.completedChallenges, ...challengeCheck.completed];
      result.completedChallengeIds.push(...challengeCheck.completed);
      result.challengeForgeTokens += challengeRewards.forgeTokens;
      for (const [material, amount] of Object.entries(challengeRewards.materials) as [MaterialType, number][]) {
        result.challengeMaterials[material] = (result.challengeMaterials[material] ?? 0) + amount;
      }
    }
    if (challengeRewards.scrap > 0) {
      snap.scrapBucks += challengeRewards.scrap;
      snap.lifetimeScrapBucks = (snap.lifetimeScrapBucks ?? 0) + challengeRewards.scrap;
      snap.lifetimeScrapBucksAllTime = (snap.lifetimeScrapBucksAllTime ?? 0) + challengeRewards.scrap;
      result.scrapsEarned += challengeRewards.scrap;
    }
    if (challengeRewards.forgeTokens > 0) {
      snap.forgeTokens += challengeRewards.forgeTokens;
      snap.totalForgeTokensEarned = (snap.totalForgeTokensEarned ?? 0) + challengeRewards.forgeTokens;
    }
    if (Object.keys(challengeRewards.materials).length > 0) {
      snap.materials = addRewardMaterials(snap.materials, challengeRewards.materials);
    }

    const achievementStats: AchievementStats = {
      lifetimeRacesAllTime: snap.lifetimeRacesAllTime ?? 0,
      lifetimeWinsAllTime: snap.lifetimeWinsAllTime ?? 0,
      lifetimeScrapBucksAllTime: snap.lifetimeScrapBucksAllTime ?? 0,
      lifetimePartsScavengedAllTime: snap.lifetimePartsScavengedAllTime ?? 0,
      lifetimeVehiclesBuiltAllTime: snap.lifetimeVehiclesBuiltAllTime ?? 0,
      bestWinStreakAllTime: snap.bestWinStreakAllTime ?? 0,
      highestVehicleTierBuilt: snap.highestVehicleTierBuilt ?? 0,
      totalForgeTokensEarned: snap.totalForgeTokensEarned ?? 0,
      uniqueVehicleTypesBuiltCount: snap.uniqueVehicleTypesBuilt?.length ?? 0,
      lifetimeScrapResets: snap.lifetimeScrapResets ?? 0,
      lifetimeLPAllTime: snap.lifetimeLPAllTime ?? 0,
      teamEraCount: snap.teamEraCount ?? 0,
      ownerEraCount: snap.ownerEraCount ?? 0,
      lifetimeTotalDecomposed: snap.lifetimeTotalDecomposed ?? 0,
      highestConditionReached: snap.highestConditionReached ?? 0,
    };
    const newAchievements = checkAchievements(achievementStats, snap.earnedAchievements);
    if (newAchievements.length > 0) snap.earnedAchievements = [...snap.earnedAchievements, ...newAchievements];

    snap.activeMomentumTiers = getActiveMomentumTiers(
      snap.lifetimeRaces,
      snap.fatigue,
      snap.repPoints,
      snap.lifetimeScrapBucks,
      deriveHighestCircuitTier(snap.unlockedCircuitIds),
      getPermanentRuntimeBonuses(snap).momentumThresholdReduction,
    );
    snap.gameTick = (snap.gameTick ?? 0) + 1;
  }

  result.finalFatigue = snap.fatigue;
  result.finalVehicleCondition = snap.garage.find((vehicle) => vehicle.id === snap.activeVehicleId)?.condition ?? null;
  result.finalRacerSkills = snap.racerSkills;
  result.finalCrewRoster = snap.crewRoster;
  result.finalActiveMomentumTiers = snap.activeMomentumTiers;
  result.newAchievementIds = snap.earnedAchievements.filter((id) => !(initialState.earnedAchievements ?? []).includes(id));

  return result;
}

/** Effective interval used only when converting elapsed real time to catch-up ticks. */
export function computeOfflineTickSpeedMs(state: GameState): number {
  return Math.max(OFFLINE_TICK_MS_MIN, computeTickSpeedMs(state));
}
