/**
 * Crew System — NPC crew members with roles, XP, and specializations.
 *
 * Crew unlock after the first Team Reset. They persist through Scrap Resets
 * but reset on Team Reset (unless Crew Retention upgrade is purchased).
 */

export type CrewRole = "mechanic" | "scout" | "driver" | "trader";

export type CrewSpecialization =
  | "tuner"           // mechanic path A
  | "salvage_expert"  // mechanic path B
  | "treasure_hunter" // scout path A
  | "bulk_hauler"     // scout path B
  | "speed_demon"     // driver path A
  | "safety_first"    // driver path B
  | "fence"           // trader path A
  | "negotiator";     // trader path B

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  level: number;
  xp: number;
  specialization: CrewSpecialization | null;
}

export const CREW_ROLES: CrewRole[] = ["mechanic", "scout", "driver", "trader"];

export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  mechanic: "Mechanic",
  scout: "Scout",
  driver: "Driver",
  trader: "Trader",
};

export const CREW_ROLE_ICONS: Record<CrewRole, string> = {
  mechanic: "🔧",
  scout: "🔍",
  driver: "🏎",
  trader: "💰",
};

export const CREW_ROLE_DESCRIPTIONS: Record<CrewRole, string> = {
  mechanic: "Reduces build and repair costs. Gains XP from building and repairing.",
  scout: "Improves scavenge luck and yield. Gains XP from scavenging.",
  driver: "Boosts race performance and reduces DNF. Gains XP from racing.",
  trader: "Increases sell value and dealer discounts. Gains XP from selling and trading.",
};

export interface SpecializationDefinition {
  id: CrewSpecialization;
  name: string;
  description: string;
  role: CrewRole;
  bonusDescription: string;
}

export const CREW_SPECIALIZATIONS: SpecializationDefinition[] = [
  // Mechanic specializations
  {
    id: "tuner",
    name: "Tuner",
    description: "Focus on build optimization. Extra build cost reduction.",
    role: "mechanic",
    bonusDescription: "-5% build cost",
  },
  {
    id: "salvage_expert",
    name: "Salvage Expert",
    description: "Focus on repair efficiency. Extra repair cost reduction.",
    role: "mechanic",
    bonusDescription: "-5% repair cost",
  },
  // Scout specializations
  {
    id: "treasure_hunter",
    name: "Treasure Hunter",
    description: "Focus on finding rare parts. Extra scavenge luck.",
    role: "scout",
    bonusDescription: "+5% scavenge luck",
  },
  {
    id: "bulk_hauler",
    name: "Bulk Hauler",
    description: "Focus on quantity. Extra scavenge yield.",
    role: "scout",
    bonusDescription: "+10% scavenge yield",
  },
  // Driver specializations
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Push harder on the track. Extra race performance.",
    role: "driver",
    bonusDescription: "+5% race performance",
  },
  {
    id: "safety_first",
    name: "Safety First",
    description: "Consistent finishes. Extra DNF reduction.",
    role: "driver",
    bonusDescription: "-3% DNF chance",
  },
  // Trader specializations
  {
    id: "fence",
    name: "Fence",
    description: "Better black market connections. Extra sell value.",
    role: "trader",
    bonusDescription: "+10% sell value",
  },
  {
    id: "negotiator",
    name: "Negotiator",
    description: "Better deals on purchases. Extra dealer discount.",
    role: "trader",
    bonusDescription: "-5% dealer prices",
  },
];

/** Get specialization options for a given role */
export function getSpecializationsForRole(role: CrewRole): SpecializationDefinition[] {
  return CREW_SPECIALIZATIONS.filter((s) => s.role === role);
}

/** Starter crew templates — recruited at milestones */
export const CREW_TEMPLATES: { name: string; role: CrewRole }[] = [
  { name: "Dave", role: "mechanic" },
  { name: "Jess", role: "scout" },
  { name: "Rico", role: "driver" },
  { name: "Mags", role: "trader" },
  { name: "Toni", role: "mechanic" },
  { name: "Kai", role: "scout" },
  { name: "Blaze", role: "driver" },
  { name: "Sly", role: "trader" },
];

/** Create a new crew member from template */
export function createCrewMember(template: { name: string; role: CrewRole }, id: string): CrewMember {
  return {
    id,
    name: template.name,
    role: template.role,
    level: 1,
    xp: 0,
    specialization: null,
  };
}
