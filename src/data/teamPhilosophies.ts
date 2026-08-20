import type { CrewRole } from "@/data/crew";

export const TEAM_OPERATING_PHILOSOPHY_IDS = [
  "junkyard_works",
  "engineering_works",
  "driver_led",
] as const;

export type TeamOperatingPhilosophy =
  (typeof TEAM_OPERATING_PHILOSOPHY_IDS)[number];

export interface TeamPhilosophyDefinition {
  id: TeamOperatingPhilosophy;
  name: string;
  leadRole: Extract<CrewRole, "scout" | "mechanic" | "driver">;
  laborDelegated: string;
  lostExpertise: string;
}

export const TEAM_PHILOSOPHIES: readonly TeamPhilosophyDefinition[] = [
  {
    id: "junkyard_works",
    name: "Junkyard Works",
    leadRole: "scout",
    laborDelegated: "Automated scavenging and sourcing",
    lostExpertise: "Mechanic and Driver expertise",
  },
  {
    id: "engineering_works",
    name: "Engineering Works",
    leadRole: "mechanic",
    laborDelegated: "Building and repair work",
    lostExpertise: "Scout and Driver expertise",
  },
  {
    id: "driver_led",
    name: "Driver-Led Team",
    leadRole: "driver",
    laborDelegated: "Racing and Fleet work",
    lostExpertise: "Scout and Mechanic expertise",
  },
];

export const TEAM_PHILOSOPHIES_BY_ID = Object.fromEntries(
  TEAM_PHILOSOPHIES.map((philosophy) => [philosophy.id, philosophy]),
) as Record<TeamOperatingPhilosophy, TeamPhilosophyDefinition>;

export function isTeamOperatingPhilosophy(
  value: unknown,
): value is TeamOperatingPhilosophy {
  return typeof value === "string" &&
    TEAM_OPERATING_PHILOSOPHY_IDS.includes(value as TeamOperatingPhilosophy);
}
