import type { PartCategory } from "./parts";

export type MaterialType =
  | "metalScrap"       // bent steel and pipe fittings
  | "rubberCompound"   // cracked belts and tire carcasses
  | "heatCore"         // seized pistons and manifold bits
  | "circuitFragment"  // fried sensors and fuse relics
  | "carbonDust"       // shattered fairings and gear teeth
  | "greaseSludge";    // drained oil and old lubricant

export interface MaterialDefinition {
  id: MaterialType;
  name: string;
  description: string;
  /** Which part categories yield this material when decomposed */
  sourceParts: PartCategory[];
}

export const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  {
    id: "metalScrap",
    name: "Metal Scrap",
    description: "Bent steel and pipe fittings salvaged from structural parts.",
    sourceParts: ["frame", "suspension", "exhaust"],
  },
  {
    id: "rubberCompound",
    name: "Rubber Compound",
    description: "Cracked belts and tire carcasses, still good for something.",
    sourceParts: ["wheel", "drivetrain"],
  },
  {
    id: "heatCore",
    name: "Heat Core",
    description: "Seized pistons and manifold bits from engines that ran too hot.",
    sourceParts: ["engine", "exhaust"],
  },
  {
    id: "circuitFragment",
    name: "Circuit Fragment",
    description: "Fried sensors and fuse relics from electronics that saw too much.",
    sourceParts: ["electronics", "fuel"],
  },
  {
    id: "carbonDust",
    name: "Carbon Dust",
    description: "Shattered fairings and gear teeth, ground fine by friction.",
    sourceParts: ["aero", "drivetrain"],
  },
  {
    id: "greaseSludge",
    name: "Grease Sludge",
    description: "Drained oil and old lubricant — disgusting, useful.",
    sourceParts: ["fuel", "suspension", "engine"],
  },
];

/**
 * Returns which materials a given part category yields when decomposed.
 * A category may yield 1 or 2 material types.
 */
export const CATEGORY_TO_MATERIALS: Record<PartCategory, MaterialType[]> = {
  engine:      ["heatCore", "greaseSludge"],
  wheel:       ["rubberCompound"],
  frame:       ["metalScrap"],
  fuel:        ["circuitFragment", "greaseSludge"],
  electronics: ["circuitFragment"],
  drivetrain:  ["rubberCompound", "carbonDust"],
  exhaust:     ["metalScrap", "heatCore"],
  suspension:  ["metalScrap", "greaseSludge"],
  aero:        ["carbonDust"],
  misc:        ["metalScrap"],
};

export const INITIAL_MATERIALS: Record<MaterialType, number> = {
  metalScrap: 0,
  rubberCompound: 0,
  heatCore: 0,
  circuitFragment: 0,
  carbonDust: 0,
  greaseSludge: 0,
};

export function getMaterialById(id: MaterialType): MaterialDefinition | undefined {
  return MATERIAL_DEFINITIONS.find((m) => m.id === id);
}
