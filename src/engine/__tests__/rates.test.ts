import { describe, expect, it } from "vitest";
import { computeResourceRates, getResourceRate } from "../rates";
import { computeTick, computeTickSpeedMs } from "../tick";
import { createInitialState, type GameState } from "@/state/store";
import { CURRENCY_DEFINITIONS } from "@/data/currencies";
import { LOOSE_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import { repDecayAmount } from "@/config/progression";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import type { BuiltVehicle } from "../build";

function pureState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

const vehicle: BuiltVehicle = {
  id: "rates-vehicle",
  definitionId: "push_mower",
  parts: {
    engine: { part: { id: "e", definitionId: "engine_small", condition: "good", foundAt: "test", type: "part" }, addons: [] },
    wheel: { part: { id: "w", definitionId: "wheel_busted", condition: "good", foundAt: "test", type: "part" }, addons: [] },
  },
  stats: { speed: 10, handling: 5, reliability: 10, weight: 20, performance: 12 },
  builtAt: 0,
  condition: 100,
  totalRaces: 0,
};

describe("computeResourceRates", () => {
  it("shows Scrap Bucks flowing on tick two of a fresh save with a location selected", () => {
    const fresh = pureState({ selectedLocationId: "curbside" });
    const tick1 = withRandomSource(new SeededRandomSource("rates-fresh"), () => computeTick(fresh));
    const afterTick = pureState({
      ...fresh,
      inventory: tick1.partsFound,
      scrapBucks: fresh.scrapBucks + tick1.scrapsEarned,
      gameTick: 2,
    });
    const scrap = getResourceRate(afterTick, "scrap_bucks");
    expect(scrap).toBeDefined();
    expect(scrap!.perSecond).toBeGreaterThan(0);
    expect(scrap!.sources?.some((source) => /auto-sold|junk/i.test(source.label) && source.perSecond > 0)).toBe(true);
  });

  it("keeps parts capped at the loose-inventory limit and reports scavenges per second", () => {
    const state = pureState({ selectedLocationId: "curbside", inventory: [] });
    const parts = getResourceRate(state, "parts");
    expect(parts).toBeDefined();
    expect(parts!.cap).toBe(LOOSE_INVENTORY_LIMIT);
    expect(parts!.perSecond).toBeGreaterThan(0);
    expect(parts!.amount).toBe(0);
  });

  it("nets Rep decay against expected race Rep", () => {
    const idle = pureState({ repPoints: 1_000, legacyRepFloor: 0, autoScavengeUnlocked: false, autoRaceUnlocked: false });
    const idleRep = getResourceRate(idle, "rep")!;
    const tickMs = computeTickSpeedMs(idle);
    expect(idleRep.perSecond).toBeCloseTo(-repDecayAmount(1_000, 0, tickMs) / (tickMs / 1_000), 9);

    const racing = pureState({
      repPoints: 0,
      autoScavengeUnlocked: false,
      garage: [vehicle],
      activeVehicleId: vehicle.id,
      selectedCircuitId: "backyard_derby",
      unlockedCircuitIds: ["backyard_derby"],
      scrapBucks: 100,
    });
    const racingRep = getResourceRate(racing, "rep")!;
    expect(racingRep.perSecond).toBeGreaterThan(0);
    expect(racingRep.sources?.some((source) => /race/i.test(source.label))).toBe(true);
  });

  it("exposes fatigue and the Legacy projection as resources", () => {
    const racing = pureState({
      autoScavengeUnlocked: false,
      garage: [vehicle],
      activeVehicleId: vehicle.id,
      selectedCircuitId: "backyard_derby",
      unlockedCircuitIds: ["backyard_derby"],
      scrapBucks: 100,
      lifetimeRaces: 30,
      fatigue: 9,
    });
    const fatigue = getResourceRate(racing, "fatigue")!;
    expect(fatigue.amount).toBe(9);
    expect(fatigue.perSecond).toBeGreaterThanOrEqual(0);
    const legacy = getResourceRate(racing, "legacy_projection")!;
    expect(legacy.amount).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(legacy.perSecond)).toBe(true);
    expect(legacy.perSecond).toBeGreaterThanOrEqual(0);
  });

  it("covers every currency definition and memoises per state object", () => {
    const state = pureState();
    const rates = computeResourceRates(state);
    for (const currency of CURRENCY_DEFINITIONS) {
      expect(rates.some((rate) => rate.id === currency.id)).toBe(true);
    }
    expect(computeResourceRates(state)).toBe(rates);
    expect(computeResourceRates({ ...state })).not.toBe(rates);
  });

  it("delegates CurrencyDefinition.getRate to the engine rates", () => {
    const state = pureState({ selectedLocationId: "curbside" });
    const scrap = CURRENCY_DEFINITIONS.find((currency) => currency.id === "scrap_bucks")!;
    expect(scrap.getRate?.(state)?.perSecond).toBe(getResourceRate(state, "scrap_bucks")!.perSecond);
  });
});
