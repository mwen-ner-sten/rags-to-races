/** Manual scavenges required before Auto-Scavenge becomes available. */
export const AUTO_SCAVENGE_MANUAL_TARGET = 100;

/**
 * Maximum number of loose parts automation may retain. Overflow is converted
 * to Scrap Bucks so accelerated live play and offline catch-up cannot create
 * an ever-growing save or an unusable inventory screen.
 */
export const LOOSE_INVENTORY_LIMIT = 250;

/** Backward-compatible name for the shared live/offline inventory ceiling. */
export const OFFLINE_LOOSE_INVENTORY_LIMIT = LOOSE_INVENTORY_LIMIT;

/** Maximum station-equipment records retained from automated drops. */
export const STATION_EQUIPMENT_INVENTORY_LIMIT = 250;

/** Maximum transient mod-drop records retained in one batched simulation. */
export const AUTOMATION_DROP_DETAIL_LIMIT = 250;

/** Maximum real-world absence simulated when a save resumes. */
export const MAX_OFFLINE_DURATION_MS = 8 * 60 * 60 * 1_000;

/**
 * Offline catch-up never schedules more than one simulated tick per elapsed
 * second. Endgame online automation may run faster, but replaying hundreds of
 * thousands of UI-era ticks on resume would block the browser main thread.
 */
export const OFFLINE_TICK_MS_MIN = 1_000;

/**
 * Backward-compatible numeric escrow stored inside the existing generic
 * challenge-progress map while a manual race animation is in flight.
 */
export const PENDING_MANUAL_RACE_ENTRY_FEE_KEY = "pendingManualRaceEntryFee";
