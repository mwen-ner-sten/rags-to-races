import { describe, expect, it } from "vitest";
import { REP_PROGRESSION } from "@/config/progression";
import { GARAGE_STATION_IDS } from "@/data/garageStations";
import { GEAR_SLOTS } from "@/data/lootGear";
import { SeededRandomSource, withRandomSource, type RandomSource } from "@/utils/random";
import {
  RACE_LOOT_DROP_RATE,
  RACE_MOD_DROP_RATE,
  SCAVENGE_SHARD_DROP_RATE,
  SCAVENGE_STATION_DROP_RATE,
  maxRarityForLifetimeRep,
  raceLootDropChance,
  rollGearDrops,
  rollStationDrops,
} from "../gearDrop";

/** Every roll lands: drop checks pass, weighted picks take the first rung, ranges take their minimum. */
const alwaysDrop: RandomSource = { next: () => 0.0001 };
/** Nothing ever lands. */
const neverDrop: RandomSource = { next: () => 0.9999 };

const raceParams = {
  eventId: "feature",
  sourceTier: 5,
  sourceId: "salt_flats",
  raceResult: "win" as const,
  winStreak: 0,
  lifetimeRep: 0,
  gearDropRateRaceBonus: 0,
  rarityBonus: 0,
  doubleDropChance: 0,
  modDropRateBonus: 0,
};

const stationParams = {
  sourceTier: 5,
  sourceId: "scrap_mountain",
  lifetimeRep: 0,
  gearDropRateScavengeBonus: 0,
  rarityBonus: 0,
  doubleDropChance: 0,
  modDropRateBonus: 0,
};

describe("drop tables", () => {
  it("publishes the base odds per source", () => {
    expect(RACE_LOOT_DROP_RATE).toEqual({ win: 0.08, loss: 0.03, dnf: 0.01 });
    expect(RACE_MOD_DROP_RATE).toBe(0.01);
    expect(SCAVENGE_STATION_DROP_RATE).toBe(0.03);
    expect(SCAVENGE_SHARD_DROP_RATE).toBe(0.005);
  });

  it("adds trophy_hunter and the win streak to race loot odds, capped at +10% streak", () => {
    expect(raceLootDropChance({ raceResult: "win", winStreak: 0, gearDropRateRaceBonus: 0.03 })).toBeCloseTo(0.11);
    expect(raceLootDropChance({ raceResult: "loss", winStreak: 4, gearDropRateRaceBonus: 0 })).toBeCloseTo(0.05);
    expect(raceLootDropChance({ raceResult: "dnf", winStreak: 50, gearDropRateRaceBonus: 0 })).toBeCloseTo(0.11);
  });
});

describe("Rep-gated rarity ladder", () => {
  it("opens one rung per REP_PROGRESSION.gear threshold, legendary with epic", () => {
    expect(maxRarityForLifetimeRep(0)).toBe("common");
    expect(maxRarityForLifetimeRep(REP_PROGRESSION.gear.uncommon)).toBe("uncommon");
    expect(maxRarityForLifetimeRep(REP_PROGRESSION.gear.rare)).toBe("rare");
    expect(maxRarityForLifetimeRep(REP_PROGRESSION.gear.epic)).toBe("legendary");
  });

  it("hands a new driver a common piece even off a tier-5 circuit", () => {
    const random = new SeededRandomSource("ladder-floor");
    const rarities = new Set<string>();
    withRandomSource(random, () => {
      for (let index = 0; index < 300; index += 1) {
        for (const drop of rollGearDrops({ ...raceParams, gearDropRateRaceBonus: 1 }).gearDrops) rarities.add(drop.rarity);
      }
    });
    expect([...rarities]).toEqual(["common"]);
  });

  it("lets the full tier-5 table through once epic Rep is reached", () => {
    const random = new SeededRandomSource("ladder-open");
    const rarities = new Set<string>();
    withRandomSource(random, () => {
      for (let index = 0; index < 300; index += 1) {
        for (const drop of rollGearDrops({ ...raceParams, lifetimeRep: REP_PROGRESSION.gear.epic, gearDropRateRaceBonus: 1 }).gearDrops) rarities.add(drop.rarity);
      }
    });
    expect(rarities.has("epic") || rarities.has("legendary")).toBe(true);
    expect(rarities.size).toBeGreaterThan(2);
  });
});

describe("race loot", () => {
  it("builds Locker-shaped loot gear and a gear mod off a win", () => {
    const { gearDrops, modDrop } = withRandomSource(alwaysDrop, () => rollGearDrops(raceParams));
    expect(gearDrops).toHaveLength(1);
    expect(GEAR_SLOTS).toContain(gearDrops[0].slot);
    expect(gearDrops[0]).toMatchObject({ rarity: "common", enhancementLevel: 0, modSlots: 0, mods: [], source: "salt_flats" });
    expect(modDrop).not.toBeNull();
  });

  it("never drops a gear mod off a loss or DNF", () => {
    expect(withRandomSource(alwaysDrop, () => rollGearDrops({ ...raceParams, raceResult: "loss" })).modDrop).toBeNull();
    expect(withRandomSource(alwaysDrop, () => rollGearDrops({ ...raceParams, raceResult: "dnf" })).modDrop).toBeNull();
  });

  it("can pair up under double_drop", () => {
    const { gearDrops } = withRandomSource(alwaysDrop, () => rollGearDrops({ ...raceParams, doubleDropChance: 0.05 }));
    expect(gearDrops).toHaveLength(2);
  });

  it("returns nothing when the roll misses", () => {
    expect(withRandomSource(neverDrop, () => rollGearDrops(raceParams))).toEqual({ gearDrops: [], modDrop: null });
  });
});

describe("scavenge station equipment", () => {
  it("forges station-native equipment tagged with the location", () => {
    const { stationDrops, shardDrop } = withRandomSource(alwaysDrop, () => rollStationDrops(stationParams));
    expect(stationDrops).toHaveLength(1);
    expect(GARAGE_STATION_IDS).toContain(stationDrops[0].slot);
    expect(stationDrops[0]).toMatchObject({ rarity: "common", enhancementLevel: 0, source: "scrap_mountain" });
    expect(stationDrops[0].effects[0]).toMatchObject({ type: "attribute" });
    expect(shardDrop).toBe(true);
  });

  it("respects the same Rep ladder as race loot", () => {
    const random = new SeededRandomSource("station-ladder");
    const rarities = new Set<string>();
    withRandomSource(random, () => {
      for (let index = 0; index < 300; index += 1) {
        for (const drop of rollStationDrops({ ...stationParams, gearDropRateScavengeBonus: 1, lifetimeRep: REP_PROGRESSION.gear.uncommon }).stationDrops) rarities.add(drop.rarity);
      }
    });
    expect([...rarities].sort()).toEqual(["common", "uncommon"]);
  });

  it("returns nothing when the roll misses", () => {
    expect(withRandomSource(neverDrop, () => rollStationDrops(stationParams))).toEqual({ stationDrops: [], shardDrop: false });
  });
});
