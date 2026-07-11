import { afterEach, describe, expect, it } from "vitest";
import { getVehicleById } from "@/data/vehicles";
import { validateBuildSelection } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { createInitialState, useGameStore } from "@/state/store";

const engine: ScavengedPart = {
  id: "build-engine",
  definitionId: "engine_small",
  condition: "decent",
  foundAt: "test",
  type: "part",
};

const wheel: ScavengedPart = {
  id: "build-wheel",
  definitionId: "wheel_busted",
  condition: "decent",
  foundAt: "test",
  type: "part",
};

afterEach(() => useGameStore.setState(createInitialState()));

describe("garage build selection integrity", () => {
  it("uses current inventory objects and rejects missing or incompatible selections", () => {
    const mower = getVehicleById("push_mower")!;
    const enhancedEngine = { ...engine, condition: "good" as const };

    expect(validateBuildSelection(
      mower,
      { engine, wheel },
      [enhancedEngine, wheel],
    )).toMatchObject({
      valid: true,
      parts: { engine: enhancedEngine, wheel },
    });

    expect(validateBuildSelection(mower, { engine, wheel }, [wheel])).toMatchObject({
      valid: false,
      reason: "The selected engine part is no longer in inventory",
    });

    expect(validateBuildSelection(
      mower,
      { engine: { ...engine, id: wheel.id, definitionId: wheel.definitionId }, wheel },
      [wheel],
    )).toMatchObject({
      valid: false,
      reason: "The selected engine part is not compatible with this vehicle",
    });
  });

  it("does not build a phantom vehicle after a selected part is sold", () => {
    useGameStore.setState({
      ...createInitialState(),
      scrapBucks: 100,
      inventory: [engine, wheel],
      pendingBuildVehicleId: "push_mower",
      pendingBuildParts: { engine, wheel },
      tutorialDismissed: true,
    });

    useGameStore.getState().sellPart(engine.id);
    const afterSale = useGameStore.getState();
    expect(afterSale.inventory.map((part) => part.id)).toEqual([wheel.id]);

    afterSale.buildSelectedVehicle();
    expect(useGameStore.getState().garage).toHaveLength(0);
    expect(useGameStore.getState().scrapBucks).toBe(afterSale.scrapBucks);
  });
});
