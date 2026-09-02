import type { GameState } from "@/state/store";
import { REP_PROGRESSION } from "@/config/progression";
import { MATERIAL_DEFINITIONS, type MaterialType } from "./materials";

export type WorkshopTab =
  | "inventory" | "fabrication" | "addons" | "dealer"
  | "stations" | "philosophy" | "skills" | "facilities";

export interface WorkshopTabDefinition {
  id: WorkshopTab;
  label: string;
  /** Player-facing reason the tab is still hidden, for Help and tooltips. */
  revealHint: string;
}

/**
 * Workshop sections appear when they first have something to say, in the
 * order the charter introduces them: the core loop first, sourcing and
 * fabrication once the player has touched materials or Rep, and the
 * permanent layers once a reset has happened.
 */
export const WORKSHOP_TABS: WorkshopTabDefinition[] = [
  { id: "inventory", label: "Inventory", revealHint: "Always available." },
  { id: "facilities", label: "Facilities", revealHint: "Always available." },
  { id: "addons", label: "Add-ons", revealHint: `Reach ${REP_PROGRESSION.workshop.addon_bench} Rep or find an add-on part.` },
  { id: "dealer", label: "Dealer", revealHint: `Reach ${REP_PROGRESSION.dealer.unlock} Rep.` },
  { id: "fabrication", label: "Fabrication", revealHint: "Decompose a part into materials." },
  { id: "stations", label: "Stations", revealHint: `Find your first piece of station equipment or reach ${REP_PROGRESSION.gear.uncommon} Rep.` },
  { id: "skills", label: "Skills", revealHint: "Raise any racer skill to level 1." },
  { id: "philosophy", label: "Philosophy", revealHint: "Earn Legacy Points from a Scrap Reset." },
];

type WorkshopTabState = Pick<
  GameState,
  | "repPoints" | "inventory" | "materials" | "workshopLevels"
  | "stationEquipmentInventory" | "equippedStationEquipment"
  | "racerSkills" | "lifetimeLegacyPoints" | "lifetimeLPAllTime" | "unlockedPlaystyleNodes"
>;

export function isWorkshopTabAvailable(tab: WorkshopTab, state: WorkshopTabState): boolean {
  switch (tab) {
    case "inventory":
    case "facilities":
      return true;
    case "addons":
      return state.repPoints >= REP_PROGRESSION.workshop.addon_bench
        || (state.workshopLevels.addon_bench ?? 0) > 0
        || state.inventory.some((part) => part.type === "addon");
    case "dealer":
      return state.repPoints >= REP_PROGRESSION.dealer.unlock;
    case "fabrication":
      return MATERIAL_DEFINITIONS.some((material) => (state.materials[material.id as MaterialType] ?? 0) > 0)
        || (state.workshopLevels.parts_bin ?? 0) > 0
        || state.repPoints >= REP_PROGRESSION.workshop.parts_bin;
    case "stations":
      return state.stationEquipmentInventory.length > 0
        || Object.values(state.equippedStationEquipment).some(Boolean)
        || state.repPoints >= REP_PROGRESSION.gear.uncommon;
    case "skills":
      return Object.values(state.racerSkills).some((skill) => skill.level >= 1);
    case "philosophy":
      return state.lifetimeLegacyPoints > 0
        || state.lifetimeLPAllTime > 0
        || state.unlockedPlaystyleNodes.length > 0;
  }
}

export function getAvailableWorkshopTabs(state: WorkshopTabState): WorkshopTabDefinition[] {
  return WORKSHOP_TABS.filter((tab) => isWorkshopTabAvailable(tab.id, state));
}
