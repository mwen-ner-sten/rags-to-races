# Rags to Races · 50 development iterations

The batch starts at `c926a87`, where a career already ran from curbside salvage through Team, Owner, and Circuit Office. These iterations deepen the decisions available along that route. Each linked ledger pairs a numbered change with its own playtest or inspection.

| Iterations | Where to play | What changes between runs |
| --- | --- | --- |
| [1–13](builder-iterations.md) | Trips, Garage, and the reset planner | Scout for a particular build, protect a donor engine, and run Hand-Me-Down Horsepower. Pick a different opening for the next Season. |
| [14–25](owner-iterations.md) | Owner, after a Team State championship | Try a consistency or wins sponsor, field two scoring cars for Works, or earn an all-Feature calendar by winning the same charter in Dirt and Drag. |
| [26–37](circuit-iterations.md) | Circuit, after a first Owner title | Spend a workshop pass on a visiting rival, race the points leader with ballast, and preserve a worn guest for a return season. |
| [38–50](garage-notebook-iterations.md) | Garage, Notebook, and Race | Identify parts by silhouette, look up a retired build and where its parts came from, and replay a rival meeting from the driver's record. |

## Garage artwork

[View all nineteen Blender renders together](../art/review/garage-inventory-sheet.png). The inventory uses transparent 192 × 192 WebP images. The model and lighting source is in [the Blender render script](../../scripts/render_garage_parts.py).

## Progression trials

An accelerated mixed-play garage continued from an earned Circuit-era save. It assembled a Street Stock and won the Independent tour with 48 points and the County-to-State tour with 43. Two earlier exported games, from the Touring Licence and first Owner title milestones, also loaded through the current save decoder.

The seeded Close Grid comparison used the same starting field for both decisions. Visitor repairs narrowed the final winning margin from 8.3% to 2.5% and supplied the extra close finish needed to certify. The Builder trial started the Auction Bidder opening with zero cash and reputation, sold curbside finds for the 40-Scrap entry fee, and brought home auction loot.

These trials establish reachable routes and demonstrate tradeoffs. Long-term pacing and which builds human players prefer remain playtest questions.

## Final checks

On the integrated branch, 237 unit tests passed. TypeScript, ESLint and the production build passed. All 46 browser cases passed against that build across 1440-pixel desktop and 390-pixel mobile Chromium layouts. The County-to-State championship export from the accelerated garage also loaded through Settings in a fresh browser.
