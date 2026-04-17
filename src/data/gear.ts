/**
 * Legacy static Gear catalog.
 *
 * This file exists only to keep type definitions and a deterministic empty
 * catalog available to call sites that have not yet been refactored away from
 * the static-gear API. All real gear now flows through loot gear + attribute
 * itemization (see /src/data/lootGear.ts and /src/data/gearAttributes.ts).
 *
 * Safe to delete once every `equippedGear` / `getGearById` reference is gone.
 */

export { GEAR_SLOTS, GEAR_SLOT_LABELS } from "@/data/gearSlots";
export type { GearSlot } from "@/data/gearSlots";
import type { GearSlot } from "@/data/gearSlots";

export interface GearEffect {
  type: string;
  value: number;
}

export interface GearDefinition {
  id: string;
  name: string;
  slot: GearSlot;
  tier: number;
  cost: number;
  description: string;
  flavorText: string;
  effects: GearEffect[];
  unlockRequirement?: {
    repPoints?: number;
  };
}

export const GEAR_DEFINITIONS: GearDefinition[] = [];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getGearById(id: string): GearDefinition | undefined {
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getGearForSlot(slot: GearSlot): GearDefinition[] {
  return [];
}

/** Empty default — static gear is no longer equipped on fresh starts. */
export const DEFAULT_EQUIPPED_GEAR: Record<GearSlot, string> = {
  head: "",
  body: "",
  hands: "",
  feet: "",
  tool: "",
  accessory: "",
};

export const DEFAULT_OWNED_GEAR: string[] = [];
