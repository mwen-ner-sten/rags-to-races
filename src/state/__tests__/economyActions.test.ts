import { afterEach, describe, expect, it } from "vitest";
import type { ScavengedPart } from "@/engine/scavenge";
import { getPartSaleValue } from "@/engine/sale";
import {
  BULK_DECOMPOSE_COST,
  FATIGUE_DRINK_COST,
  FATIGUE_DRINK_PROGRESS_KEY,
  FATIGUE_DRINK_RUN_LIMIT,
} from "@/data/workshopActions";
import {
  createInitialState,
  getPartRefurbishQuote,
  getSellValueBonus,
  useGameStore,
} from "../store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";

function inventoryItem(
  id: string,
  definitionId: string,
  condition: ScavengedPart["condition"],
  type: ScavengedPart["type"] = "part",
): ScavengedPart {
  return { id, definitionId, condition, type, foundAt: "test" };
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("inventory sale valuation", () => {
  it("guarantees at least $1 for every recognized part", () => {
    const zeroBaseValue = inventoryItem("zero", "elec_none", "rusted");
    const roundedToZero = inventoryItem("rounded", "wheel_busted", "rusted");

    expect(getPartSaleValue(zeroBaseValue)).toBe(1);
    expect(getPartSaleValue(roundedToZero)).toBe(1);
  });

  it("applies condition and the current sell-value bonus once", () => {
    const part = inventoryItem("engine", "engine_v4", "pristine");
    useGameStore.setState((state) => ({
      ...state,
      equippedGear: { ...state.equippedGear, accessory: "acc_plastic_bag" },
    }));

    const bonus = getSellValueBonus(useGameStore.getState());
    expect(bonus).toBeCloseTo(0.05);
    expect(getPartSaleValue(part, bonus)).toBe(52);
  });

  it("single-item sales pay $1 instead of silently discarding zero-value parts", () => {
    useGameStore.setState({
      ...createInitialState(),
      inventory: [inventoryItem("zero", "elec_none", "rusted")],
    });

    useGameStore.getState().sellPart("zero");

    const state = useGameStore.getState();
    expect(state.inventory).toHaveLength(0);
    expect(state.scrapBucks).toBe(1);
    expect(state.lifetimeScrapBucks).toBe(1);
    expect(state.activityLog.at(-1)).toMatchObject({
      category: "sell",
      scrapDelta: 1,
    });
  });

  it("applies Trader crew value bonuses and grants Trader XP per sold item", () => {
    const trader = {
      id: "trader-1",
      name: "Ledger",
      role: "trader" as const,
      level: 1,
      xp: 0,
      specialization: null,
    };
    useGameStore.setState({
      ...createInitialState(),
      inventory: [inventoryItem("engine", "engine_v4", "pristine")],
      crewRoster: [trader],
    });

    expect(getSellValueBonus(useGameStore.getState())).toBeCloseTo(0.02);
    useGameStore.getState().sellPart("engine");

    expect(useGameStore.getState().scrapBucks).toBe(51);
    expect(useGameStore.getState().crewRoster[0]).toMatchObject({ xp: 1, level: 1 });
  });

  it("bulk sales use the same minimum payout and preserve unknown items", () => {
    const unknown = inventoryItem("unknown", "not-a-real-part", "rusted");
    useGameStore.setState({
      ...createInitialState(),
      inventory: [
        inventoryItem("zero", "elec_none", "rusted"),
        inventoryItem("rounded", "wheel_busted", "rusted"),
        unknown,
      ],
    });

    useGameStore.getState().sellAllJunk();

    const state = useGameStore.getState();
    expect(state.inventory).toEqual([unknown]);
    expect(state.scrapBucks).toBe(2);
    expect(state.activityLog.at(-1)?.message).toBe("Sold all 2 parts for $2");
  });

  it("scrap-only and quality-filter sales share the guaranteed payout", () => {
    useGameStore.setState({
      ...createInitialState(),
      inventory: [
        inventoryItem("scrap", "misc_junk", "rusted"),
        inventoryItem("engine", "elec_none", "rusted"),
        inventoryItem("keep", "engine_small", "decent"),
      ],
    });

    useGameStore.getState().sellAllScrap();
    expect(useGameStore.getState().scrapBucks).toBe(1);
    expect(useGameStore.getState().inventory.map(({ id }) => id)).toEqual(["engine", "keep"]);

    useGameStore.getState().sellBelowQuality("decent");
    expect(useGameStore.getState().scrapBucks).toBe(2);
    expect(useGameStore.getState().inventory.map(({ id }) => id)).toEqual(["keep"]);
  });
});

describe("released Workshop actions", () => {
  it("uses one shared discounted refurbishment quote for affordability and settlement", () => {
    const maxed = createGameplayFixture("maxed").payload.state;
    const wornPart = inventoryItem("worn-engine", "engine_v4", "worn");
    useGameStore.setState({
      ...createInitialState(),
      ...maxed,
      scrapBucks: 1,
      inventory: [wornPart],
    });

    const quote = getPartRefurbishQuote(useGameStore.getState(), wornPart);
    expect(quote).toMatchObject({ cost: 1, newCondition: "decent" });

    useGameStore.getState().refurbishPart(wornPart.id);
    expect(useGameStore.getState().scrapBucks).toBe(0);
    expect(useGameStore.getState().inventory[0].condition).toBe("decent");
    expect(useGameStore.getState().activityLog.at(-1)?.message).toContain("for $1");
  });

  it("charges for bulk decomposition before the Bulk Scrapper milestone", () => {
    useGameStore.setState({
      ...createInitialState(),
      prestigeCount: 2,
      scrapBucks: BULK_DECOMPOSE_COST,
      inventory: [
        inventoryItem("rusted", "engine_small", "rusted"),
        inventoryItem("worn", "wheel_busted", "worn"),
        inventoryItem("keep", "engine_small", "decent"),
      ],
    });

    useGameStore.getState().decomposeAllJunk();

    const state = useGameStore.getState();
    expect(state.scrapBucks).toBe(0);
    expect(state.inventory.map(({ id }) => id)).toEqual(["keep"]);
    expect(state.lifetimeTotalDecomposed).toBe(2);
    expect(state.activityLog.find((entry) => entry.message.startsWith("Bulk-decomposed"))).toMatchObject({
      category: "craft",
      scrapDelta: -BULK_DECOMPOSE_COST,
    });
    expect(state.activityLog.find((entry) => entry.message.startsWith("Bulk-decomposed"))?.message).toContain(`for $${BULK_DECOMPOSE_COST}`);
    expect(state.activityLog.some((entry) => entry.message.startsWith("Challenge complete:"))).toBe(true);
  });

  it("makes bulk decomposition free at Prestige 3", () => {
    useGameStore.setState({
      ...createInitialState(),
      prestigeCount: 3,
      scrapBucks: 0,
      inventory: [inventoryItem("rusted", "engine_small", "rusted")],
    });

    useGameStore.getState().decomposeAllJunk();

    const state = useGameStore.getState();
    expect(state.inventory).toHaveLength(0);
    expect(state.scrapBucks).toBe(0);
    const actionLog = state.activityLog.find((entry) => entry.message.startsWith("Bulk-decomposed"));
    expect(actionLog?.message).toContain("for free");
    expect(actionLog?.scrapDelta).toBeUndefined();
    expect(state.activityLog.some((entry) => entry.message.startsWith("Challenge complete:"))).toBe(true);
  });

  it("does not bulk-decompose when the paid action is unaffordable", () => {
    const item = inventoryItem("rusted", "engine_small", "rusted");
    useGameStore.setState({
      ...createInitialState(),
      prestigeCount: 2,
      scrapBucks: BULK_DECOMPOSE_COST - 1,
      inventory: [item],
    });

    useGameStore.getState().decomposeAllJunk();

    expect(useGameStore.getState().inventory).toEqual([item]);
    expect(useGameStore.getState().activityLog).toHaveLength(0);
  });

  it("sells a fatigue drink with an exact capped recovery and run counter", () => {
    useGameStore.setState({
      ...createInitialState(),
      scrapBucks: FATIGUE_DRINK_COST,
      fatigue: 7,
    });

    useGameStore.getState().purchaseFatigueDrink();

    const state = useGameStore.getState();
    expect(state.scrapBucks).toBe(0);
    expect(state.fatigue).toBe(0);
    expect(state.challengeProgress[FATIGUE_DRINK_PROGRESS_KEY]).toBe(1);
    expect(state.activityLog.at(-1)).toMatchObject({
      category: "upgrade",
      message: `Bought Fatigue Drink for $${FATIGUE_DRINK_COST} (-7 fatigue)`,
      scrapDelta: -FATIGUE_DRINK_COST,
    });
  });

  it("enforces the fatigue drink per-run limit", () => {
    useGameStore.setState({
      ...createInitialState(),
      scrapBucks: FATIGUE_DRINK_COST,
      fatigue: 20,
      challengeProgress: {
        ...createInitialState().challengeProgress,
        [FATIGUE_DRINK_PROGRESS_KEY]: FATIGUE_DRINK_RUN_LIMIT,
      },
    });

    useGameStore.getState().purchaseFatigueDrink();

    expect(useGameStore.getState().scrapBucks).toBe(FATIGUE_DRINK_COST);
    expect(useGameStore.getState().fatigue).toBe(20);
    expect(useGameStore.getState().activityLog).toHaveLength(0);
  });
});

describe("Dealer board lifecycle", () => {
  it("fills once on the Rep unlock transition but does not refill a depleted board for free", () => {
    useGameStore.setState({
      ...createInitialState(),
      repPoints: 99,
      dealerBoard: [],
      gameTick: 100,
      scrapBucks: 500,
    });
    useGameStore.getState().applyTickResult([], 0, 1);
    expect(useGameStore.getState().dealerBoard).toHaveLength(3);

    useGameStore.setState((state) => ({ ...state, dealerBoard: [] }));
    const cashBefore = useGameStore.getState().scrapBucks;
    useGameStore.getState().applyTickResult([], 0, 0);

    expect(useGameStore.getState().dealerBoard).toEqual([]);
    expect(useGameStore.getState().scrapBucks).toBe(cashBefore);
  });
});

describe("achievement activity", () => {
  it("logs newly earned achievements under their own category", () => {
    useGameStore.setState({
      ...createInitialState(),
      lifetimeWinsAllTime: 1,
    });

    useGameStore.getState().checkAchievements();

    const state = useGameStore.getState();
    expect(state.earnedAchievements).toContain("ach_first_win");
    expect(state.activityLog.at(-1)).toMatchObject({
      category: "achievement",
      message: "Earned 1 achievement(s)",
    });
    expect(state.activityLog.some(({ category }) => category === "prestige")).toBe(false);
  });
});
