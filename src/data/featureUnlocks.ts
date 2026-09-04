import { isFeatureAvailable, type FeatureId } from "@/config/features";
import type { GameState } from "@/state/store";
import type { BuiltVehicle } from "@/engine/build";
import { diagnoseFocus, findDiagnosticVehicle } from "@/engine/engineeringDiagnostics";
import { getCircuitById } from "./circuits";
import { dealerListingPrice } from "./dealer";
import { MATERIAL_DEFINITIONS, type MaterialType } from "./materials";
import { CONDITIONS, getPartById, type PartDefinition } from "./parts";
import { getVehicleById } from "./vehicles";

export interface FeatureUnlockCondition {
  id: FeatureId;
  name: string;
  description: string;
  conditions: {
    lifetimeScrapResets?: number;
    lifetimeLPAllTime?: number;
    lifetimeTeamPoints?: number;
    teamEraCount?: number;
    ownerEraCount?: number;
    trackEraCount?: number;
    reachedCircuitTier?: number;
    reachedCircuitTierCount?: number;
  };
}

export interface FeatureUnlockStats {
  lifetimeScrapResets: number;
  lifetimeLPAllTime: number;
  lifetimeTeamPoints: number;
  teamEraCount: number;
  ownerEraCount: number;
  trackEraCount: number;
  reachedCircuitTier: number;
  reachedCircuitTierCount: number;
}

/** Check whether a feature unlock condition is satisfied by the given stats */
export function checkFeatureUnlock(
  condition: FeatureUnlockCondition,
  stats: FeatureUnlockStats,
): boolean {
  const c = condition.conditions;

  if (c.lifetimeScrapResets !== undefined && stats.lifetimeScrapResets < c.lifetimeScrapResets) {
    return false;
  }
  if (c.lifetimeLPAllTime !== undefined && stats.lifetimeLPAllTime < c.lifetimeLPAllTime) {
    return false;
  }
  if (c.lifetimeTeamPoints !== undefined && stats.lifetimeTeamPoints < c.lifetimeTeamPoints) {
    return false;
  }
  if (c.teamEraCount !== undefined && stats.teamEraCount < c.teamEraCount) {
    return false;
  }
  if (c.ownerEraCount !== undefined && stats.ownerEraCount < c.ownerEraCount) {
    return false;
  }
  if (c.trackEraCount !== undefined && stats.trackEraCount < c.trackEraCount) {
    return false;
  }
  if (c.reachedCircuitTier !== undefined && stats.reachedCircuitTier < c.reachedCircuitTier) {
    return false;
  }
  if (c.reachedCircuitTierCount !== undefined && stats.reachedCircuitTierCount < c.reachedCircuitTierCount) {
    return false;
  }

  return true;
}

// ── Feature Unlock Definitions ─────────────────────────────────────────────

const CREW_SYSTEM: FeatureUnlockCondition = {
  id: "crew_system",
  name: "Crew System",
  description: "Unlocks the crew recruitment and management system.",
  conditions: { teamEraCount: 1 },
};

const NEW_WORKSHOP_CATS: FeatureUnlockCondition = {
  id: "new_workshop_cats",
  name: "Advanced Workshop",
  description: "Unlocks new workshop upgrade categories.",
  conditions: { teamEraCount: 1 },
};

const TRACK_CUSTOMIZATION: FeatureUnlockCondition = {
  id: "track_customization",
  name: "Track Customization",
  description: "Unlocks the ability to customize and own tracks.",
  conditions: { trackEraCount: 1 },
};

// ── Export ──────────────────────────────────────────────────────────────────

export const FEATURE_UNLOCK_DEFINITIONS: FeatureUnlockCondition[] = [
  CREW_SYSTEM,
  NEW_WORKSHOP_CATS,
  TRACK_CUSTOMIZATION,
].filter((feature) => isFeatureAvailable(feature.id));

export const FEATURE_UNLOCKS_BY_ID = Object.fromEntries(
  FEATURE_UNLOCK_DEFINITIONS.map((f) => [f.id, f]),
) as Record<string, FeatureUnlockCondition>;

// ── Reveal on relevance (phase 2, lever 5) ──────────────────────────────────
//
// Workshop systems appear when the player first holds the thing they act on,
// never on a bare Rep threshold. The Rep *prices* on venues, locations,
// vehicles and workshop lines are untouched. Once a system has revealed it
// stays revealed: the store records the id in `revealedSystems`.

export type WorkshopSystem = "decompose" | "fabrication" | "addons" | "dealer" | "stations" | "refurbish" | "locker";

export type SystemRevealState = Pick<
  GameState,
  | "inventory" | "materials" | "workshopLevels" | "garage" | "activeVehicleId"
  | "lastRaceOutcome" | "scrapBucks" | "stationEquipmentInventory" | "equippedStationEquipment"
  | "dealerBoard" | "lifetimeTotalDecomposed" | "gameTick" | "rustedPileSinceTick" | "revealedSystems"
  | "lootGearInventory" | "equippedLootGear"
>;

export interface SystemRevealDefinition {
  id: WorkshopSystem;
  label: string;
  /** Player-facing trigger, for Help and locked-section hints. */
  trigger: string;
  isTriggered: (state: SystemRevealState) => boolean;
}

function activeVehicle(state: Pick<SystemRevealState, "garage" | "activeVehicleId">): BuiltVehicle | undefined {
  return (state.garage ?? []).find((vehicle) => vehicle.id === state.activeVehicleId);
}

function hasAnyMaterial(state: SystemRevealState): boolean {
  return MATERIAL_DEFINITIONS.some((material) => (state.materials?.[material.id as MaterialType] ?? 0) > 0);
}

/**
 * Junk-grade (rusted or worn) loose parts: what Decompose is for. Rusted finds
 * are auto-sold from the first tick, so worn parts are the pile a fresh save
 * actually holds.
 */
function isJunkGradePart(part: { type?: string; condition: string }): boolean {
  return part.type !== "addon" && (part.condition === "rusted" || part.condition === "worn");
}

/** A junk part has sat in the pile since `rustedPileSinceTick`; a full tick has passed once the counter moved on. */
function rustedPartSatForATick(state: SystemRevealState): boolean {
  const since = state.rustedPileSinceTick;
  if (since == null) return false;
  return (state.gameTick ?? 0) > since && (state.inventory ?? []).some(isJunkGradePart);
}

/** The last race was lost and the debrief named grip (handling) as the weakest stat. */
function lostOnHandling(state: SystemRevealState): boolean {
  const outcome = state.lastRaceOutcome;
  if (!outcome || outcome.result !== "loss") return false;
  const vehicle = findDiagnosticVehicle(state.garage ?? [], outcome.vehicleId);
  const circuit = getCircuitById(outcome.circuitId);
  if (!vehicle || !circuit) return false;
  return diagnoseFocus(vehicle, circuit, outcome) === "grip";
}

/** Cheapest board price of a part that fills an empty slot on the active vehicle, if any slot is empty. */
export function cheapestMissingCorePartPrice(state: Pick<SystemRevealState, "garage" | "activeVehicleId">): number | null {
  const vehicle = activeVehicle(state);
  const definition = vehicle ? getVehicleById(vehicle.definitionId) : undefined;
  if (!vehicle || !definition) return null;
  const prices = definition.slots
    .filter((slot) => !vehicle.parts[slot.slot])
    .flatMap((slot) => slot.acceptableParts.map((id) => getPartById(id)).filter((part): part is PartDefinition => Boolean(part && part.scrapValue > 0)))
    .map((part) => dealerListingPrice(part, "decent"));
  return prices.length > 0 ? Math.min(...prices) : null;
}

function canAffordMissingCorePart(state: SystemRevealState): boolean {
  const price = cheapestMissingCorePartPrice(state);
  return price != null && (state.scrapBucks ?? 0) >= price;
}

function subDecentPartInstalled(state: SystemRevealState): boolean {
  const vehicle = activeVehicle(state);
  if (!vehicle) return false;
  return Object.values(vehicle.parts).some((installed) => installed && CONDITIONS.indexOf(installed.part.condition) < CONDITIONS.indexOf("decent"));
}

export const SYSTEM_REVEAL_DEFINITIONS: readonly SystemRevealDefinition[] = [
  {
    id: "decompose",
    label: "Decompose",
    trigger: "Let a rusted or worn part sit in the pile for a full tick.",
    isTriggered: (state) => rustedPartSatForATick(state) || (state.lifetimeTotalDecomposed ?? 0) > 0 || hasAnyMaterial(state),
  },
  {
    id: "fabrication",
    label: "Fabrication",
    trigger: "Hold any material (decompose a part).",
    isTriggered: (state) => hasAnyMaterial(state) || (state.workshopLevels?.parts_bin ?? 0) > 0,
  },
  {
    id: "addons",
    label: "Add-ons",
    trigger: "Lose a race where the debrief names handling as the weakest stat, or find an add-on part.",
    isTriggered: (state) => lostOnHandling(state)
      || (state.workshopLevels?.addon_bench ?? 0) > 0
      || (state.inventory ?? []).some((part) => part.type === "addon"),
  },
  {
    id: "dealer",
    label: "Dealer",
    trigger: "Have the Scrap Bucks for the cheapest part that would fill an empty slot on your active vehicle.",
    isTriggered: (state) => canAffordMissingCorePart(state) || (state.dealerBoard ?? []).length > 0,
  },
  {
    id: "stations",
    label: "Stations",
    trigger: "Find your first piece of station equipment.",
    isTriggered: (state) => (state.stationEquipmentInventory ?? []).length > 0
      || Object.values(state.equippedStationEquipment ?? {}).some(Boolean),
  },
  {
    id: "refurbish",
    label: "Refurbish",
    trigger: "Race with a part below Decent installed on your active vehicle.",
    isTriggered: (state) => subDecentPartInstalled(state) || (state.workshopLevels?.refurbishment_bench ?? 0) > 0,
  },
  {
    id: "locker",
    label: "Locker",
    trigger: "Find your first piece of loot gear.",
    isTriggered: (state) => (state.lootGearInventory ?? []).length > 0
      || Object.values(state.equippedLootGear ?? {}).some(Boolean),
  },
];

export const SYSTEM_REVEALS_BY_ID = Object.fromEntries(
  SYSTEM_REVEAL_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<WorkshopSystem, SystemRevealDefinition>;

/** Revealed earlier, or triggered by what the player holds right now. */
export function isSystemRevealed(state: SystemRevealState, id: WorkshopSystem): boolean {
  if ((state.revealedSystems ?? []).includes(id)) return true;
  return SYSTEM_REVEALS_BY_ID[id].isTriggered(state);
}

/** Systems that trigger now but have not been recorded as revealed yet, in table order. */
export function evaluateSystemReveals(state: SystemRevealState): WorkshopSystem[] {
  const recorded = new Set(state.revealedSystems ?? []);
  return SYSTEM_REVEAL_DEFINITIONS
    .filter((definition) => !recorded.has(definition.id) && definition.isTriggered(state))
    .map((definition) => definition.id);
}

/**
 * When the rusted-part timer should start (a rusted part is in the pile and
 * no timer runs), keep running, or clear (the pile has no rusted part).
 */
export function nextRustedPileSinceTick(state: Pick<SystemRevealState, "inventory" | "gameTick" | "rustedPileSinceTick">): number | null {
  const hasRusted = (state.inventory ?? []).some(isJunkGradePart);
  if (!hasRusted) return null;
  return state.rustedPileSinceTick ?? (state.gameTick ?? 0);
}
