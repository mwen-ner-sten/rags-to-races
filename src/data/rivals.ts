export interface RivalDefinition {
  id: string;
  name: string;
  flavor: string;
  minCircuitTier: number;
  maxCircuitTier: number;
  reward: { type: "blueprint" | "station_set" | "addon"; id: string; label: string };
}

/** Named opponents retained from the parked Gear work and aligned to racing. */
export const RIVAL_DEFINITIONS: RivalDefinition[] = [
  { id: "rival_greasy_pete", name: "Greasy Pete", flavor: "A junkyard mechanic who wins with ugly, unbreakable machines.", minCircuitTier: 1, maxCircuitTier: 2, reward: { type: "blueprint", id: "grease_monkey_methods", label: "Grease Monkey Methods blueprint" } },
  { id: "rival_redline_rosa", name: "Redline Rosa", flavor: "Every setup decision serves acceleration and outright speed.", minCircuitTier: 2, maxCircuitTier: 5, reward: { type: "station_set", id: "redline", label: "Redline station component" } },
  { id: "rival_scrap_queen", name: "The Scrap Queen", flavor: "Turns discarded hardware into brutally efficient race builds.", minCircuitTier: 2, maxCircuitTier: 6, reward: { type: "addon", id: "addon_forged_internals", label: "Forged Internals add-on" } },
  { id: "rival_dust_storm", name: "Dust Storm", flavor: "Thrives when grip disappears and the race turns chaotic.", minCircuitTier: 3, maxCircuitTier: 6, reward: { type: "station_set", id: "slipstream", label: "Slipstream station component" } },
];

export function getRivalById(id: string): RivalDefinition | undefined {
  return RIVAL_DEFINITIONS.find((rival) => rival.id === id);
}
