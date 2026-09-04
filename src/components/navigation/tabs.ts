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

export interface TabDefinition {
  id: TabId;
  /** Full label used by the desktop sidebar. */
  label: string;
  /** Compact label used by the mobile bottom bar. */
  shortLabel: string;
  /** Emoji icon used by the mobile nav. */
  icon: string;
  /** "primary" tabs sit in the mobile bottom bar; "overflow" tabs live behind "More". */
  placement: "primary" | "overflow";
}

export const TABS: readonly TabDefinition[] = [
  { id: "junkyard", label: "Junkyard", shortLabel: "Junk",     icon: "🗑️", placement: "primary" },
  { id: "garage",   label: "Garage",   shortLabel: "Garage",   icon: "🔧", placement: "primary" },
  { id: "race",     label: "Race",     shortLabel: "Race",     icon: "🏎️", placement: "primary" },
  { id: "gear",     label: "Workshop", shortLabel: "Workshop", icon: "🧰", placement: "primary" },
  { id: "upgrades", label: "Upgrades", shortLabel: "Upgr",     icon: "⬆️", placement: "primary" },
  { id: "help",     label: "Help",     shortLabel: "Help",     icon: "❓", placement: "overflow" },
  { id: "log",      label: "Activity", shortLabel: "Activity", icon: "📜", placement: "overflow" },
  { id: "settings", label: "Settings", shortLabel: "Settings", icon: "⚙️", placement: "overflow" },
  { id: "dev",      label: "Dev",      shortLabel: "Dev",      icon: "🛠️", placement: "overflow" },
];

export const PRIMARY_TABS = TABS.filter((t) => t.placement === "primary");
export const OVERFLOW_TABS = TABS.filter((t) => t.placement === "overflow");
