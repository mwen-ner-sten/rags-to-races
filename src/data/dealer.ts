import type { PartCondition } from "./parts";
import { PART_DEFINITIONS } from "./parts";
import { randInt } from "@/utils/random";

export interface DealerListing {
  id: string;             // unique listing instance id
  definitionId: string;   // PartDefinition id
  condition: PartCondition;
  price: number;          // scrap bucks
  /** Tick count when this listing expires (refreshes automatically) */
  expiresAt: number;
}

/** How often the dealer board refreshes (in ticks) */
export const DEALER_REFRESH_INTERVAL = 30;

/** Number of listings on the board at once */
export const DEALER_BOARD_SIZE = 3;

/** Rep threshold to unlock the dealer board */
export const DEALER_UNLOCK_REP = 8000;

/** Rep threshold for tier-2 stock (better conditions available) */
export const DEALER_TIER2_REP = 50000;

/** Rep threshold for tier-3 stock (high-tier parts available) */
export const DEALER_TIER3_REP = 200000;

let _listingCounter = 0;
function makeListingId(): string {
  return `listing_${Date.now()}_${_listingCounter++}`;
}

/**
 * Generate a fresh dealer board based on player rep.
 * Higher rep unlocks better conditions and higher-tier parts.
 */
export function generateDealerBoard(
  repPoints: number,
  currentTick: number,
): DealerListing[] {
  const listings: DealerListing[] = [];

  // Determine max part tier available based on rep
  let maxPartTier = 1;
  if (repPoints >= DEALER_TIER3_REP) maxPartTier = 4;
  else if (repPoints >= DEALER_TIER2_REP) maxPartTier = 2;

  // Determine available conditions based on rep
  const availableConditions: PartCondition[] = repPoints >= DEALER_TIER2_REP
    ? ["decent", "good", "pristine"]
    : ["decent", "good"];

  // Eligible parts by tier
  const eligible = PART_DEFINITIONS.filter(
    (p) => p.minTier <= maxPartTier && p.category !== "misc" && p.scrapValue > 0,
  );

  if (eligible.length === 0) return listings;

  const usedDefIds = new Set<string>();

  for (let i = 0; i < DEALER_BOARD_SIZE; i++) {
    // Pick a random eligible part (avoid duplicates when possible)
    let attempts = 0;
    let def = eligible[randInt(0, eligible.length - 1)];
    while (usedDefIds.has(def.id) && attempts < 10) {
      def = eligible[randInt(0, eligible.length - 1)];
      attempts++;
    }
    usedDefIds.add(def.id);

    const condition = availableConditions[randInt(0, availableConditions.length - 1)];

    // Price = 2x–5x scrap value depending on condition
    const conditionPriceMult: Record<PartCondition, number> = {
      rusted: 1.0,
      worn: 1.5,
      decent: 2.0,
      good: 3.5,
      pristine: 5.0,
      polished: 7.0,
      legendary: 12.0,
      mythic: 20.0,
      artifact: 40.0,
    };
    const price = Math.max(5, Math.floor(def.scrapValue * (conditionPriceMult[condition] ?? 2.0)));

    listings.push({
      id: makeListingId(),
      definitionId: def.id,
      condition,
      price,
      expiresAt: currentTick + DEALER_REFRESH_INTERVAL,
    });
  }

  return listings;
}

/**
 * Returns true if the dealer board needs refreshing at the given tick.
 */
export function shouldRefreshDealer(
  board: DealerListing[],
  currentTick: number,
): boolean {
  if (board.length === 0) return true;
  return board.some((l) => currentTick >= l.expiresAt);
}
