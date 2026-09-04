/**
 * Base spacing between manual scavenges. The garage always works on its own;
 * manual effort is the active accelerator, paced so it rewards attention
 * rather than click speed. Hold-to-scavenge upgrades shorten it.
 */
export const MANUAL_SCAVENGE_COOLDOWN_MS_DEFAULT = 2_000;
/** Floor for the manual scavenge cooldown after every upgrade. */
export const MANUAL_SCAVENGE_COOLDOWN_MS_MIN = 100;

/**
 * Auto-race skips entries while the active vehicle sits below this condition,
 * so unattended play produces progress instead of a wreck. Player-adjustable.
 */
export const AUTO_RACE_MIN_CONDITION_DEFAULT = 25;
export const AUTO_RACE_MIN_CONDITION_OPTIONS = [0, 10, 25, 50] as const;

/**
 * Maximum number of loose parts automation may retain. Overflow is converted
 * to Scrap Bucks so accelerated live play and offline catch-up cannot create
 * an ever-growing save or an unusable inventory screen.
 */
export const LOOSE_INVENTORY_LIMIT = 250;

/** Backward-compatible name for the shared live/offline inventory ceiling. */
export const OFFLINE_LOOSE_INVENTORY_LIMIT = LOOSE_INVENTORY_LIMIT;

/**
 * Maximum station-equipment records retained from scavenge drops. A drop
 * that finds the shelf full is salvaged on the spot for Reforge Shards.
 */
export const STATION_EQUIPMENT_INVENTORY_LIMIT = 250;

/**
 * Maximum loot gear (the driver's kit, kept in the Locker) retained from race
 * drops. A drop that finds the Locker full is auto-salvaged for Scrap Bucks at
 * the same value the Locker's Salvage button would pay, so no run ever grows
 * an unbounded kit. Owned pieces are never salvaged, only the new drop.
 */
export const LOOT_GEAR_INVENTORY_LIMIT = 250;

/** Maximum transient mod-drop records retained in one batched simulation. */
export const AUTOMATION_DROP_DETAIL_LIMIT = 250;

/** Maximum real-world absence simulated when a save resumes. */
export const MAX_OFFLINE_DURATION_MS = 8 * 60 * 60 * 1_000;

/**
 * Offline catch-up runs at the same tick floor as live play so a short absence
 * yields exactly what the garage would have produced online.
 */
export const OFFLINE_TICK_MS_MIN = 100;

/**
 * Hard ceiling on ticks replayed in one catch-up. Every tick runs the full
 * per-tick math, so this bounds main-thread work on resume (30,000 ticks is
 * roughly the old 8 h @ 1 s budget). Tradeoff: at sub-second tick speeds a
 * long absence is truncated to this many ticks rather than the full 8 hours;
 * the ticks that do run are exact — we stop early instead of scaling results.
 */
export const OFFLINE_TICK_CAP = 30_000;

/**
 * Backward-compatible numeric escrow stored inside the existing generic
 * challenge-progress map while a manual race animation is in flight.
 */
export const PENDING_MANUAL_RACE_ENTRY_FEE_KEY = "pendingManualRaceEntryFee";
