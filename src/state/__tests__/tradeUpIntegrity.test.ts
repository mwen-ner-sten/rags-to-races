import { afterEach, describe, expect, it } from "vitest";
import type { ScavengedPart } from "@/engine/scavenge";
import { createInitialState, useGameStore } from "../store";

function part(id: string, definitionId: string): ScavengedPart {
  return { id, definitionId, condition: "decent", foundAt: "test", type: "part" };
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("part trade-up integrity", () => {
  it("requires three distinct inventory instances", () => {
    const onlyPart = part("trade-1", "engine_v8");
    useGameStore.setState({
      ...createInitialState(),
      inventory: [onlyPart],
      workshopLevels: { parts_trader: 1 },
    });

    useGameStore.getState().tradeUpParts([onlyPart.id, onlyPart.id, onlyPart.id]);

    expect(useGameStore.getState().inventory).toEqual([onlyPart]);
    expect(useGameStore.getState().lifetimeTotalTradeUps).toBe(0);
  });

  it("raises condition without downgrading the strongest consumed part model", () => {
    const inventory = [
      part("trade-1", "engine_turbo_v6"),
      part("trade-2", "engine_v8"),
      part("trade-3", "engine_v6"),
    ];
    useGameStore.setState({
      ...createInitialState(),
      inventory,
      workshopLevels: { parts_trader: 1 },
    });

    useGameStore.getState().tradeUpParts(["trade-1", "trade-2", "trade-3"]);

    expect(useGameStore.getState().inventory).toHaveLength(1);
    expect(useGameStore.getState().inventory[0]).toMatchObject({
      definitionId: "engine_turbo_v6",
      condition: "good",
      foundAt: "trade_up",
    });
  });
});
