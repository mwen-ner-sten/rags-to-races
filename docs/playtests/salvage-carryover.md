# Scrap Reset salvage carryover

One Parts With a Past completion unlocks salvage carryover at Scrap Reset. The player can bring one loose or installed haul find of tier 2 or below. Its part identity, origin, and condition survive. It uses one of the next Season's perk slots, even if the part is sold early. The part cannot cross a second reset. Rookie Plates disables the route, and the old origin does not count toward a fresh Parts With a Past attempt.

## Two openings from the same checkpoint

Both routes started with zero Rep and Scrap Bucks, eight lifetime Curbside trips, and no vehicle. Across eight paired seeds, a simple player policy hauled Curbside until it found a usable matching engine and wheel, sold spares if storage filled, then queued and completed a Push Mower. Neither route used a race, an inventory grant after reset, or a time-skipping action outside normal engine advancement.

| Opening | Equipped perks | Maximum haul | Median trips to first build | Median game time | First engine |
|---|---|---:|---:|---:|---|
| Standard | Night Owl, Tow Hitch | 4 parts | 1.5 | 80.5 seconds | First usable find |
| Carryover | Night Owl, carry Worn Tiller Engine | 2 parts | 2.5 | 94 seconds | The same Worn Tiller Engine in all 8 runs |

The carried part guarantees the intended build, while the normal loadout gave this policy better first-build speed through larger hauls. Results cover the opening through first assembly and depend on the eight chosen seeds and part-selection policy.

The focused tests assert both routes through hauling and a first assembly, exact part preservation, one-slot cost, repeat-reset behavior, and save import. The Playwright regression covers choosing the part, freeing the occupied slot, and observing its condition after reload.
