import { afterEach, describe, expect, it, vi } from "vitest";
import { ADDON_DEFINITIONS } from "@/data/addons";
import { formatRivalWinStatus, getRivalById, RIVAL_DEFINITIONS } from "@/data/rivals";
import { withRandomSource, type RandomSource } from "@/utils/random";
import { createInitialState, useGameStore } from "../store";

const testVehicle = {
  id: "rival-test-car",
  definitionId: "go_kart",
  parts: {},
  stats: { speed: 1_000, handling: 100, reliability: 100, weight: 50, performance: 1_000 },
  builtAt: 1,
  condition: 100,
  totalRaces: 0,
};

class SequenceRandomSource implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[]) {}

  next(): number {
    return this.values[this.index++] ?? 0.5;
  }
}

function winGreasyPeteRace(): void {
  // Rival encounter, only eligible rival, no DNF, win, no salvage, flavor.
  const random = new SequenceRandomSource([0.1, 0, 0.5, 0, 0.5, 0.5]);
  withRandomSource(random, () => useGameStore.getState().enterRace());
  vi.runAllTimers();
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("rival rewards", () => {
  it("references real add-ons for every add-on reward", () => {
    const addOnIds = new Set(ADDON_DEFINITIONS.map((definition) => definition.id));
    for (const rival of RIVAL_DEFINITIONS.filter((definition) => definition.reward.type === "addon")) {
      expect(addOnIds, `${rival.name} reward`).toContain(rival.reward.id);
    }
  });

  it("grants Greasy Pete's visible add-on once and labels a winning rematch truthfully", () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...createInitialState(),
      scrapBucks: 1_000,
      repPoints: 25_000,
      garage: [testVehicle],
      activeVehicleId: testVehicle.id,
      selectedCircuitId: "dirt_track",
      unlockedCircuitIds: ["backyard_derby", "dirt_track"],
      tutorialStep: -1,
      lifetimeRacesAllTime: 1,
    });

    winGreasyPeteRace();

    const rival = getRivalById("rival_greasy_pete")!;
    const afterFirstWin = useGameStore.getState();
    expect(afterFirstWin.defeatedRivalIds).toContain(rival.id);
    expect(afterFirstWin.inventory.filter((part) => part.definitionId === "addon_roll_cage")).toHaveLength(1);
    expect(afterFirstWin.lastRaceOutcome).toMatchObject({
      result: "win",
      rivalId: rival.id,
      rivalRewardClaimed: true,
    });
    expect(formatRivalWinStatus(rival, true)).toBe("Defeated · Greasy Pete's Roll Cage add-on");

    winGreasyPeteRace();

    const afterRematch = useGameStore.getState();
    expect(afterRematch.defeatedRivalIds.filter((id) => id === rival.id)).toHaveLength(1);
    expect(afterRematch.inventory.filter((part) => part.definitionId === "addon_roll_cage")).toHaveLength(1);
    expect(afterRematch.lastRaceOutcome).toMatchObject({
      result: "win",
      rivalId: rival.id,
      rivalRewardClaimed: false,
    });
    expect(formatRivalWinStatus(rival, false)).toBe("Rematch won · reward already claimed");
  });
});
