import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { getAvailableWorkshopTabs, getWorkshopRevealGuide, isWorkshopTabAvailable, WORKSHOP_TABS } from "../workshopTabs";
import { evaluateSystemReveals, isSystemRevealed, nextRustedPileSinceTick, SYSTEM_REVEAL_DEFINITIONS } from "../featureUnlocks";
import { dealerListingPrice } from "../dealer";
import { getPartById } from "../parts";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";

const fresh = () => createInitialState() as GameState;
const ids = (state: GameState) => getAvailableWorkshopTabs(state).map((tab) => tab.id);

function vehicle(parts: Record<string, { definitionId: string; condition: "rusted" | "worn" | "decent" | "good" }>): BuiltVehicle {
  return {
    id: "reveal-car",
    definitionId: "beater_car",
    parts: Object.fromEntries(Object.entries(parts).map(([slot, part]) => [slot, { part: { id: `${slot}-part`, definitionId: part.definitionId, condition: part.condition, foundAt: "test", type: "part" as const }, addons: [] }])),
    stats: { speed: 10, handling: 2, reliability: 10, weight: 300, performance: 10 },
    builtAt: 0,
    condition: 100,
    totalRaces: 0,
  };
}

/** A Beater Car with its required slots filled and Electronics empty. */
function beaterWithEmptyElectronics(condition: "decent" | "worn" = "decent"): BuiltVehicle {
  return vehicle({
    engine: { definitionId: "engine_v4", condition },
    wheel: { definitionId: "wheel_basic", condition },
    frame: { definitionId: "frame_steel", condition },
    fuel: { definitionId: "fuel_tank_large", condition },
  });
}

describe("workshop tab disclosure", () => {
  it("shows only the core loop on a fresh save", () => {
    expect(ids(fresh())).toEqual(["inventory", "facilities"]);
  });

  it("never opens a section on Rep alone", () => {
    const rich = { ...fresh(), lifetimeRep: 1e9, repPoints: 1e9 };
    expect(ids(rich)).toEqual(["inventory", "facilities"]);
  });

  it("reveals Decompose once a rusted part has sat in the pile for a full tick", () => {
    const rusted = { id: "r", definitionId: "engine_small", condition: "rusted" as const, foundAt: "curbside", type: "part" as const };
    const state = { ...fresh(), inventory: [rusted], gameTick: 10 };
    expect(nextRustedPileSinceTick(state)).toBe(10);
    expect(nextRustedPileSinceTick({ ...state, inventory: [] })).toBeNull();
    expect(isSystemRevealed({ ...state, rustedPileSinceTick: 10 }, "decompose")).toBe(false);
    expect(isSystemRevealed({ ...state, rustedPileSinceTick: 10, gameTick: 11 }, "decompose")).toBe(true);
    expect(evaluateSystemReveals({ ...state, rustedPileSinceTick: 10, gameTick: 11 })).toEqual(["decompose"]);
    expect(evaluateSystemReveals({ ...state, rustedPileSinceTick: 10, gameTick: 11, revealedSystems: ["decompose"] })).toEqual([]);
  });

  it("reveals Fabrication the moment the player holds a material", () => {
    const state = fresh();
    expect(isWorkshopTabAvailable("fabrication", state)).toBe(false);
    expect(isWorkshopTabAvailable("fabrication", { ...state, materials: { ...state.materials, metalScrap: 1 } })).toBe(true);
  });

  it("reveals Add-ons after a lost race whose debrief names handling as the weakest stat", () => {
    const car = beaterWithEmptyElectronics();
    const loss: RaceOutcome = { result: "loss", position: 5, totalRacers: 8, scrapsEarned: 0, repEarned: 1, log: [], vehicleId: car.id, circuitId: "backyard_derby" };
    const state = { ...fresh(), garage: [car], activeVehicleId: car.id };
    expect(isWorkshopTabAvailable("addons", state)).toBe(false);
    // Backyard Derby is grip-led and this build leans on pace: the debrief says grip.
    expect(isWorkshopTabAvailable("addons", { ...state, lastRaceOutcome: loss })).toBe(true);
    expect(isWorkshopTabAvailable("addons", { ...state, lastRaceOutcome: { ...loss, result: "win" } })).toBe(false);
    expect(isWorkshopTabAvailable("addons", { ...state, inventory: [{ id: "a", definitionId: "addon_roll_cage", condition: "good", foundAt: "x", type: "addon" }] })).toBe(true);
  });

  it("reveals the Dealer once cash covers the cheapest part for an empty slot", () => {
    const car = beaterWithEmptyElectronics();
    const cheapest = Math.min(...["elec_none", "elec_basic", "elec_ecu"].map((id) => getPartById(id)!).filter((part) => part.scrapValue > 0).map((part) => dealerListingPrice(part, "decent")));
    const state = { ...fresh(), garage: [car], activeVehicleId: car.id };
    expect(isWorkshopTabAvailable("dealer", { ...state, scrapBucks: cheapest - 1 })).toBe(false);
    expect(isWorkshopTabAvailable("dealer", { ...state, scrapBucks: cheapest })).toBe(true);
    // A full car has nothing missing, so cash alone is not a reason.
    const full = vehicle({ engine: { definitionId: "engine_v4", condition: "decent" }, wheel: { definitionId: "wheel_basic", condition: "decent" }, frame: { definitionId: "frame_steel", condition: "decent" }, fuel: { definitionId: "fuel_tank_large", condition: "decent" }, electronics: { definitionId: "elec_basic", condition: "decent" } });
    expect(isWorkshopTabAvailable("dealer", { ...state, garage: [full], activeVehicleId: full.id, scrapBucks: 1e6 })).toBe(false);
  });

  it("reveals Refurbish when a part below Decent is installed on the active vehicle", () => {
    const worn = beaterWithEmptyElectronics("worn");
    const decent = beaterWithEmptyElectronics("decent");
    expect(isSystemRevealed({ ...fresh(), garage: [decent], activeVehicleId: decent.id }, "refurbish")).toBe(false);
    expect(isSystemRevealed({ ...fresh(), garage: [worn], activeVehicleId: worn.id }, "refurbish")).toBe(true);
  });

  it("reveals Stations on the first equipment drop and Skills on the first level", () => {
    const state = fresh();
    expect(isWorkshopTabAvailable("stations", state)).toBe(false);
    expect(isWorkshopTabAvailable("stations", { ...state, equippedStationEquipment: { ...state.equippedStationEquipment, workbench: "eq_1" } })).toBe(true);
    expect(isWorkshopTabAvailable("skills", state)).toBe(false);
    expect(isWorkshopTabAvailable("skills", { ...state, racerSkills: { ...state.racerSkills, driving: { xp: 100, level: 1 } } })).toBe(true);
  });

  it("keeps a recorded reveal even after the trigger is gone", () => {
    const state = { ...fresh(), revealedSystems: ["dealer" as const] };
    expect(isWorkshopTabAvailable("dealer", state)).toBe(true);
  });

  it("reveals Philosophy only once Legacy Points have ever been earned", () => {
    const state = fresh();
    expect(isWorkshopTabAvailable("philosophy", state)).toBe(false);
    expect(isWorkshopTabAvailable("philosophy", { ...state, lifetimeLPAllTime: 1 })).toBe(true);
  });

  it("keeps every tab reachable in the maxed state and preserves order", () => {
    const all = {
      ...fresh(),
      revealedSystems: SYSTEM_REVEAL_DEFINITIONS.map((definition) => definition.id),
      lifetimeLPAllTime: 1,
      racerSkills: { ...fresh().racerSkills, driving: { xp: 1, level: 1 } },
    };
    expect(ids(all)).toEqual(WORKSHOP_TABS.map((tab) => tab.id));
  });

  it("explains every reveal, tabs and in-section systems alike", () => {
    for (const tab of WORKSHOP_TABS) expect(getWorkshopRevealGuide(tab.label)?.id).toBe(`workshop-${tab.id}`);
    expect(getWorkshopRevealGuide("Decompose")?.where).toContain("Workshop > Inventory");
    expect(getWorkshopRevealGuide("Refurbish")?.what.length).toBeGreaterThan(10);
    expect(getWorkshopRevealGuide("Nonsense")).toBeNull();
  });
});
