import type { MaterialId } from "../types";

export interface ToolDef {
  id: string;
  name: string;
  blurb: string;
  cash: number;
  materials: Partial<Record<MaterialId, number>>;
  /** How many you can own. */
  max: number;
  /** Bench speed added per copy (fraction). */
  benchSpeed?: number;
  /** Benches added per copy. */
  benches?: number;
  /** Storage slots added per copy. */
  storage?: number;
}

export const TOOLS: readonly ToolDef[] = [
  { id: "parts_washer", name: "Parts Washer", blurb: "A bucket of solvent with ambitions. Bench work +15%.", cash: 25, materials: {}, max: 1, benchSpeed: 0.15 },
  { id: "shelving", name: "Shelving", blurb: "Six more spots for parts.", cash: 20, materials: { metal: 4 }, max: 4, storage: 6 },
  { id: "tire_machine", name: "Tire Machine", blurb: "No more prying with a screwdriver. Bench work +15%.", cash: 90, materials: {}, max: 1, benchSpeed: 0.15 },
  { id: "impact_wrench", name: "Impact Wrench", blurb: "Bzzzt. Bench work +20%.", cash: 120, materials: { wiring: 1 }, max: 1, benchSpeed: 0.2 },
  { id: "welder", name: "Welder", blurb: "A buzz box from a garage sale. Lets you learn Welding.", cash: 150, materials: {}, max: 1 },
  { id: "second_bench", name: "Second Bench", blurb: "Two jobs on the bench at once.", cash: 250, materials: { metal: 8 }, max: 1, benches: 1 },
  { id: "engine_hoist", name: "Engine Hoist", blurb: "Lifts a V6. Needed for the Beater plans.", cash: 350, materials: { metal: 6 }, max: 1 },
];

export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

/** Cash at which the tools counter is revealed. */
export const TOOLS_REVEAL_CASH = 25;
