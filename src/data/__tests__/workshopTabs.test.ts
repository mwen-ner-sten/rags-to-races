import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { getAvailableWorkshopTabs, isWorkshopTabAvailable, WORKSHOP_TABS } from "../workshopTabs";
import { REP_PROGRESSION } from "@/config/progression";

const fresh = () => createInitialState() as GameState;
const ids = (state: GameState) => getAvailableWorkshopTabs(state).map((tab) => tab.id);

describe("workshop tab disclosure", () => {
  it("shows only the core loop on a fresh save", () => {
    expect(ids(fresh())).toEqual(["inventory", "facilities"]);
  });

  it("reveals sourcing and building sections on the shared Rep ladder", () => {
    expect(isWorkshopTabAvailable("addons", { ...fresh(), lifetimeRep: REP_PROGRESSION.workshop.addon_bench })).toBe(true);
    expect(isWorkshopTabAvailable("dealer", { ...fresh(), lifetimeRep: REP_PROGRESSION.dealer.unlock - 1 })).toBe(false);
    expect(isWorkshopTabAvailable("dealer", { ...fresh(), lifetimeRep: REP_PROGRESSION.dealer.unlock })).toBe(true);
  });

  it("reveals Fabrication the moment the player holds a material", () => {
    const state = fresh();
    expect(isWorkshopTabAvailable("fabrication", state)).toBe(false);
    expect(isWorkshopTabAvailable("fabrication", { ...state, materials: { ...state.materials, metalScrap: 1 } })).toBe(true);
  });

  it("reveals Stations on the first equipment drop and Skills on the first level", () => {
    const state = fresh();
    expect(isWorkshopTabAvailable("stations", state)).toBe(false);
    expect(isWorkshopTabAvailable("stations", { ...state, equippedStationEquipment: { ...state.equippedStationEquipment, workbench: "eq_1" } })).toBe(true);
    expect(isWorkshopTabAvailable("skills", state)).toBe(false);
    expect(isWorkshopTabAvailable("skills", { ...state, racerSkills: { ...state.racerSkills, driving: { xp: 100, level: 1 } } })).toBe(true);
  });

  it("reveals Philosophy only once Legacy Points have ever been earned", () => {
    const state = fresh();
    expect(isWorkshopTabAvailable("philosophy", state)).toBe(false);
    expect(isWorkshopTabAvailable("philosophy", { ...state, lifetimeLPAllTime: 1 })).toBe(true);
  });

  it("keeps every tab reachable in the maxed state and preserves order", () => {
    const all = { ...fresh(), lifetimeRep: 1e9, lifetimeLPAllTime: 1, materials: { ...fresh().materials, metalScrap: 1 }, stationEquipmentInventory: [{ id: "x" }] as GameState["stationEquipmentInventory"], racerSkills: { ...fresh().racerSkills, driving: { xp: 1, level: 1 } } };
    expect(ids(all)).toEqual(WORKSHOP_TABS.map((tab) => tab.id));
  });
});
