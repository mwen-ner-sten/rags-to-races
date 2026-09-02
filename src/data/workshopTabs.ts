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
  /** Shown on the unlock card the first time the section appears. */
  guide: { what: string; why: string };
}

/** Message pushed to unlockEvents when a Workshop section first appears. */
export const WORKSHOP_REVEAL_PREFIX = "Workshop section unlocked: ";

/**
 * Workshop sections appear when they first have something to say, in the
 * order the charter introduces them: the core loop first, sourcing and
 * fabrication once the player has touched materials or Rep, and the
 * permanent layers once a reset has happened.
 */
export const WORKSHOP_TABS: WorkshopTabDefinition[] = [
  { id: "inventory", label: "Inventory", revealHint: "Always available.", guide: { what: "Every loose part you own, with its stats against the active vehicle.", why: "Sell, decompose, or enhance parts here before they go into a build." } },
  { id: "facilities", label: "Facilities", revealHint: "Always available.", guide: { what: "Permanent workshop upgrades bought with Scrap Bucks.", why: "They raise scavenge quality, cut costs, and speed the garage up." } },
  { id: "addons", label: "Add-ons", revealHint: `Reach ${REP_PROGRESSION.workshop.addon_bench} Rep or find an add-on part.`, guide: { what: "Bolt-on parts that fit into slots on decent-or-better core parts.", why: "They add pace, grip, or reliability without replacing the part underneath." } },
  { id: "dealer", label: "Dealer", revealHint: `Reach ${REP_PROGRESSION.dealer.unlock} Rep.`, guide: { what: "A rotating board of parts for sale at a markup.", why: "Buy the exact part a build is missing instead of waiting for the junkyard." } },
  { id: "fabrication", label: "Fabrication", revealHint: "Decompose a part into materials.", guide: { what: "Recipes that turn materials into parts, and enhancement past pristine.", why: "Materials come from decomposing junk; this is where junk becomes an upgrade." } },
  { id: "stations", label: "Stations", revealHint: `Find your first piece of station equipment or reach ${REP_PROGRESSION.gear.uncommon} Rep.`, guide: { what: "Reusable garage equipment with rarity and stat bonuses.", why: "Installed pieces improve scavenging, racing, and repairs across every run." } },
  { id: "skills", label: "Skills", revealHint: "Raise any racer skill to level 1.", guide: { what: "Driving, mechanics, scavenging, and endurance grow with what you do.", why: "Each level adds a small permanent edge to that activity." } },
  { id: "philosophy", label: "Philosophy", revealHint: "Earn Legacy Points from a Scrap Reset.", guide: { what: "Three exclusive garage philosophies bought with Legacy Points.", why: "The first real strategic choice a reset gives you; it shapes every later run." } },
];

type WorkshopTabState = Pick<
  GameState,
  | "repPoints" | "inventory" | "materials" | "workshopLevels"
  | "stationEquipmentInventory" | "equippedStationEquipment"
  | "racerSkills" | "lifetimeLegacyPoints" | "lifetimeLPAllTime" | "unlockedPlaystyleNodes"
>;

export function isWorkshopTabAvailable(tab: WorkshopTab, state: WorkshopTabState): boolean {
  // Saves from older versions (and the pre-hydration render) can lack fields;
  // treat anything missing as "nothing yet".
  const rep = state.repPoints ?? 0;
  const workshopLevels = state.workshopLevels ?? {};
  switch (tab) {
    case "inventory":
    case "facilities":
      return true;
    case "addons":
      return rep >= REP_PROGRESSION.workshop.addon_bench
        || (workshopLevels.addon_bench ?? 0) > 0
        || (state.inventory ?? []).some((part) => part.type === "addon");
    case "dealer":
      return rep >= REP_PROGRESSION.dealer.unlock;
    case "fabrication":
      return MATERIAL_DEFINITIONS.some((material) => (state.materials?.[material.id as MaterialType] ?? 0) > 0)
        || (workshopLevels.parts_bin ?? 0) > 0
        || rep >= REP_PROGRESSION.workshop.parts_bin;
    case "stations":
      return (state.stationEquipmentInventory ?? []).length > 0
        || Object.values(state.equippedStationEquipment ?? {}).some(Boolean)
        || rep >= REP_PROGRESSION.gear.uncommon;
    case "skills":
      return Object.values(state.racerSkills ?? {}).some((skill) => (skill?.level ?? 0) >= 1);
    case "philosophy":
      return (state.lifetimeLegacyPoints ?? 0) > 0
        || (state.lifetimeLPAllTime ?? 0) > 0
        || (state.unlockedPlaystyleNodes ?? []).length > 0;
  }
}

export function getAvailableWorkshopTabs(state: WorkshopTabState): WorkshopTabDefinition[] {
  return WORKSHOP_TABS.filter((tab) => isWorkshopTabAvailable(tab.id, state));
}
