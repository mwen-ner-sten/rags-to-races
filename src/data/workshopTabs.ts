import type { GameState } from "@/state/store";
import {
  isSystemRevealed,
  SYSTEM_REVEAL_DEFINITIONS,
  SYSTEM_REVEALS_BY_ID,
  type SystemRevealState,
  type WorkshopSystem,
} from "./featureUnlocks";

export type WorkshopTab =
  | "inventory" | "fabrication" | "addons" | "dealer"
  | "stations" | "locker" | "philosophy" | "skills" | "facilities";

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
 * fabrication once the player holds the thing they act on (reveal on
 * relevance, featureUnlocks.ts), and the permanent layers once a reset has
 * happened. Rep prices stay on venues, locations, vehicles and lines; no
 * section here opens on a bare Rep threshold.
 */
export const WORKSHOP_TABS: WorkshopTabDefinition[] = [
  { id: "inventory", label: "Inventory", revealHint: "Always available.", guide: { what: "Every loose part you own, with its stats against the active vehicle.", why: "Sell, decompose, or enhance parts here before they go into a build." } },
  { id: "facilities", label: "Facilities", revealHint: "Always available.", guide: { what: "Permanent workshop upgrades bought with Scrap Bucks.", why: "They raise scavenge quality, cut costs, and speed the garage up." } },
  { id: "addons", label: "Add-ons", revealHint: SYSTEM_REVEALS_BY_ID.addons.trigger, guide: { what: "Bolt-on parts that fit into slots on decent-or-better core parts.", why: "They add pace, grip, or reliability without replacing the part underneath." } },
  { id: "dealer", label: "Dealer", revealHint: SYSTEM_REVEALS_BY_ID.dealer.trigger, guide: { what: "A rotating board of parts for sale at a markup.", why: "Buy the exact part a build is missing instead of waiting for the junkyard." } },
  { id: "fabrication", label: "Fabrication", revealHint: SYSTEM_REVEALS_BY_ID.fabrication.trigger, guide: { what: "Recipes that turn materials into parts, and enhancement past pristine.", why: "Materials come from decomposing junk; this is where junk becomes an upgrade." } },
  { id: "stations", label: "Stations", revealHint: SYSTEM_REVEALS_BY_ID.stations.trigger, guide: { what: "Reusable garage equipment with rarity and stat bonuses.", why: "Installed pieces improve scavenging, racing, and repairs across every run." } },
  { id: "locker", label: "Locker", revealHint: SYSTEM_REVEALS_BY_ID.locker.trigger, guide: { what: "New system: Locker. Personal loot gear for six slots, with affixes, enhancement levels, and mod sockets.", why: "Equipped gear adds scavenge luck, race pace, and cost cuts on top of everything the garage gives you." } },
  { id: "skills", label: "Skills", revealHint: "Raise any racer skill to level 1.", guide: { what: "Driving, mechanics, scavenging, and endurance grow with what you do.", why: "Each level adds a small permanent edge to that activity." } },
  { id: "philosophy", label: "Philosophy", revealHint: "Earn Legacy Points from a Scrap Reset.", guide: { what: "Three exclusive garage philosophies bought with Legacy Points.", why: "The first real strategic choice a reset gives you; it shapes every later run." } },
];

/** Systems that reveal inside an existing section rather than as a tab of their own. */
export const WORKSHOP_SYSTEM_GUIDES: Record<Exclude<WorkshopSystem, WorkshopTab>, { where: string; what: string; why: string }> = {
  decompose: {
    where: "Find it under Workshop > Inventory, on any rusted or worn part.",
    what: "Decompose breaks junk parts into materials instead of selling them for pennies.",
    why: "Materials feed Fabrication and enhancement; a rusted part is worth more as metal than as a part.",
  },
  refurbish: {
    where: "Buy the Refurbishment Bench under Workshop > Facilities, then refurbish parts from the Junkyard inventory.",
    what: "Refurbishing raises a part's condition up to Pristine for Scrap Bucks.",
    why: "A worn part on your racer is costing pace and reliability every race; refurbishing is cheaper than replacing it.",
  },
};

type WorkshopTabState = SystemRevealState & Pick<
  GameState,
  "racerSkills" | "lifetimeLegacyPoints" | "lifetimeLPAllTime" | "unlockedPlaystyleNodes"
>;

export function isWorkshopTabAvailable(tab: WorkshopTab, state: WorkshopTabState): boolean {
  // Saves from older versions (and the pre-hydration render) can lack fields;
  // treat anything missing as "nothing yet". Reveals are lifetime gates:
  // spending or decay never hides a section again.
  switch (tab) {
    case "inventory":
    case "facilities":
      return true;
    case "addons":
    case "dealer":
    case "fabrication":
    case "stations":
    case "locker":
      return isSystemRevealed(state, tab);
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

export interface WorkshopRevealGuide {
  id: string;
  title: string;
  what: string;
  where: string;
  why: string;
}

/** The unlock card for a `WORKSHOP_REVEAL_PREFIX` announcement, by section or system label. */
export function getWorkshopRevealGuide(label: string): WorkshopRevealGuide | null {
  const tab = WORKSHOP_TABS.find((candidate) => candidate.label === label);
  if (tab) {
    return {
      id: `workshop-${tab.id}`,
      title: `${tab.label} opened in the Workshop`,
      what: tab.guide.what,
      where: `Find it under Workshop > ${tab.label}.`,
      why: tab.guide.why,
    };
  }
  const system = SYSTEM_REVEAL_DEFINITIONS.find((candidate) => candidate.label === label);
  if (system && system.id in WORKSHOP_SYSTEM_GUIDES) {
    const guide = WORKSHOP_SYSTEM_GUIDES[system.id as keyof typeof WORKSHOP_SYSTEM_GUIDES];
    return { id: `workshop-${system.id}`, title: `${system.label} is ready`, ...guide };
  }
  return null;
}
