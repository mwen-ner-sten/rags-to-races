/**
 * Single source of truth for the top-level navigation tabs.
 *
 * Consumed by the page router, the desktop sidebar, the mobile bottom nav,
 * the tutorial overlay and the currency bar. Add a tab here and every surface
 * picks it up.
 */
export type TabId =
  | "junkyard"
  | "garage"
  | "race"
  | "gear"
  | "upgrades"
  | "help"
  | "log"
  | "settings"
  | "dev";

import type { IconId } from "@/components/icons/Icon";

export interface TabDefinition {
  id: TabId;
  /** Full label used by the desktop sidebar. */
  label: string;
  /** Compact label used by the mobile bottom bar. */
  shortLabel: string;
  /** Interface glyph id (see components/icons/Icon.tsx). */
  icon: IconId;
  /** "primary" tabs sit in the mobile bottom bar; "overflow" tabs live behind "More". */
  placement: "primary" | "overflow";
}

export const TABS: readonly TabDefinition[] = [
  { id: "junkyard", label: "Junkyard", shortLabel: "Junk",     icon: "junkyard", placement: "primary" },
  { id: "garage",   label: "Garage",   shortLabel: "Garage",   icon: "garage", placement: "primary" },
  { id: "race",     label: "Race",     shortLabel: "Race",     icon: "race", placement: "primary" },
  { id: "gear",     label: "Workshop", shortLabel: "Workshop", icon: "workshop", placement: "primary" },
  { id: "upgrades", label: "Upgrades", shortLabel: "Upgr",     icon: "upgrades", placement: "primary" },
  { id: "help",     label: "Help",     shortLabel: "Help",     icon: "help", placement: "overflow" },
  { id: "log",      label: "Activity", shortLabel: "Activity", icon: "log", placement: "overflow" },
  { id: "settings", label: "Settings", shortLabel: "Settings", icon: "settings", placement: "overflow" },
  { id: "dev",      label: "Dev",      shortLabel: "Dev",      icon: "dev", placement: "overflow" },
];

export const PRIMARY_TABS = TABS.filter((t) => t.placement === "primary");
export const OVERFLOW_TABS = TABS.filter((t) => t.placement === "overflow");
