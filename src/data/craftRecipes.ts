import type { MaterialType } from "./materials";
import type { PartCategory, PartCondition } from "./parts";

export interface CraftRecipe {
  /** Which part category is produced */
  category: PartCategory;
  /** Resulting part condition */
  resultCondition: PartCondition;
  /** Material costs */
  cost: Partial<Record<MaterialType, number>>;
  /** Name for display */
  label: string;
  /** Flavor description */
  description: string;
}

/**
 * Salvage crafting recipes — spend materials, get a random part of the chosen category.
 * Only available after unlocking the "Parts Bin" workshop upgrade (~15k rep).
 * Part is chosen randomly from eligible definitions for that category at T0-T1.
 *
 * Two tiers of recipe per category:
 *   "basic" → Worn condition (cheap)
 *   "refined" → Decent condition (more expensive)
 */
export const CRAFT_RECIPES: CraftRecipe[] = [
  // ── Engine ───────────────────────────────────────────────────────────────────
  {
    category: "engine",
    resultCondition: "worn",
    cost: { heatCore: 4, metalScrap: 2, greaseSludge: 2 },
    label: "Cobbled Engine (Worn)",
    description: "Bang some pistons together. Won't win races but it'll run.",
  },
  {
    category: "engine",
    resultCondition: "decent",
    cost: { heatCore: 10, metalScrap: 5, greaseSludge: 5 },
    label: "Rebuilt Engine (Decent)",
    description: "A properly assembled lump. Compression's almost right.",
  },

  // ── Wheel ────────────────────────────────────────────────────────────────────
  {
    category: "wheel",
    resultCondition: "worn",
    cost: { rubberCompound: 3, metalScrap: 1 },
    label: "Patched Tire (Worn)",
    description: "Rubber on rim. Questionable, but round.",
  },
  {
    category: "wheel",
    resultCondition: "decent",
    cost: { rubberCompound: 8, metalScrap: 3 },
    label: "Remolded Tire (Decent)",
    description: "You melted the rubber compound back into something usable.",
  },

  // ── Frame ────────────────────────────────────────────────────────────────────
  {
    category: "frame",
    resultCondition: "worn",
    cost: { metalScrap: 5, greaseSludge: 1 },
    label: "Welded Frame (Worn)",
    description: "Steel, welds, and optimism. Structural integrity: maybe.",
  },
  {
    category: "frame",
    resultCondition: "decent",
    cost: { metalScrap: 12, greaseSludge: 3 },
    label: "Reinforced Frame (Decent)",
    description: "A proper frame. Corners are even approximately square.",
  },

  // ── Electronics ───────────────────────────────────────────────────────────────
  {
    category: "electronics",
    resultCondition: "worn",
    cost: { circuitFragment: 4, greaseSludge: 1 },
    label: "Jury-Rigged Wiring (Worn)",
    description: "Salvaged fragments twisted into something that almost works.",
  },
  {
    category: "electronics",
    resultCondition: "decent",
    cost: { circuitFragment: 10, metalScrap: 2 },
    label: "Rebuilt Electronics (Decent)",
    description: "A circuit board you'd actually trust with your car.",
  },

  // ── Fuel ──────────────────────────────────────────────────────────────────────
  {
    category: "fuel",
    resultCondition: "worn",
    cost: { greaseSludge: 3, circuitFragment: 1 },
    label: "Makeshift Fuel System (Worn)",
    description: "A tank, a pipe, and duct tape. Fuel goes in, engine goes brrrr.",
  },
  {
    category: "fuel",
    resultCondition: "decent",
    cost: { greaseSludge: 8, circuitFragment: 4 },
    label: "Rebuilt Fuel System (Decent)",
    description: "Tight fittings, no major leaks. Good enough.",
  },

  // ── Drivetrain ───────────────────────────────────────────────────────────────
  {
    category: "drivetrain",
    resultCondition: "worn",
    cost: { rubberCompound: 2, metalScrap: 3, carbonDust: 1 },
    label: "Chain Drive (Worn)",
    description: "A chain stretched past its limits. Still transmits power.",
  },
  {
    category: "drivetrain",
    resultCondition: "decent",
    cost: { rubberCompound: 5, metalScrap: 6, carbonDust: 3 },
    label: "Rebuilt Gearbox (Decent)",
    description: "Gears that actually mesh. Shifting might even be smooth.",
  },

  // ── Exhaust ───────────────────────────────────────────────────────────────────
  {
    category: "exhaust",
    resultCondition: "worn",
    cost: { metalScrap: 3, heatCore: 2 },
    label: "Pipe Section (Worn)",
    description: "A tube that gases can flow through. More or less.",
  },
  {
    category: "exhaust",
    resultCondition: "decent",
    cost: { metalScrap: 7, heatCore: 5 },
    label: "Welded Headers (Decent)",
    description: "Heat-formed and sealed. Sounds aggressive, runs cleaner.",
  },

  // ── Suspension ────────────────────────────────────────────────────────────────
  {
    category: "suspension",
    resultCondition: "worn",
    cost: { metalScrap: 4, greaseSludge: 2 },
    label: "Leaf Spring (Worn)",
    description: "It bounces. That's what springs do.",
  },
  {
    category: "suspension",
    resultCondition: "decent",
    cost: { metalScrap: 9, greaseSludge: 5 },
    label: "Rebuilt Coilover (Decent)",
    description: "Actual damping. You might not lose teeth on the dirt track.",
  },

  // ── Aero ──────────────────────────────────────────────────────────────────────
  {
    category: "aero",
    resultCondition: "worn",
    cost: { carbonDust: 3, metalScrap: 2 },
    label: "Bent Spoiler (Worn)",
    description: "It creates downforce if you squint. Or maybe just drag.",
  },
  {
    category: "aero",
    resultCondition: "decent",
    cost: { carbonDust: 8, metalScrap: 4 },
    label: "Shaped Wing (Decent)",
    description: "Ground the dust into panels. They're actually aerodynamic.",
  },
];

export function getRecipesForCategory(category: PartCategory): CraftRecipe[] {
  return CRAFT_RECIPES.filter((r) => r.category === category);
}

export function canAffordRecipe(
  recipe: CraftRecipe,
  materials: Partial<Record<MaterialType, number>>,
): boolean {
  for (const [mat, qty] of Object.entries(recipe.cost) as [MaterialType, number][]) {
    if ((materials[mat] ?? 0) < qty) return false;
  }
  return true;
}
