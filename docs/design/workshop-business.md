# Workshop business

**Keep hidden for human playtesting.** The best reason to visit Customers is a spare wheel on the floor and a purchase just out of reach. The best reason to take freight is a kart frame or tiller engine you can actually build with. A second Shop Move used to stand between those decisions.

## Admission test

The current charter lists eleven questions. The first eight concern admission and the final three concern the player's changing role.

| Question | Before | After |
| --- | --- | --- |
| 1. What do I decide? | Register a specific loose part, fix it and surrender it. Later choose a tool or customer lead to relocate. | Compare the selected spare's live dealer offer with the invoice, repair materials and use on my own car. After relocating, choose freight or another customer shop. |
| 2. Why decide again? | Inventory changes, but each new shop asks for the same wheel, engine and tank. A charter requires playing both transfer openings. | The dealer quote varies with the part and saturation. Freight competes with racing and hauling for a real rig. A frame alone can justify a run. Coming home early costs the remaining depot opportunity that Season. |
| 3. Which pillar? | Junk becomes identity through physical parts and recorded invoices. Repeating the book has a weaker link to engineering. | Choosing which component to give up and which to install matters twice, at the bench and on the depot rig. |
| 4. What does it cost? | Bench time, stock, repair materials, moving a garage, remembering two reference types, then custody and collection. | Bench costs are visible before accepting. Founding through freight costs one move, a reference, temporary loss of the rig, two tenders, wear and 15 Scrap Bucks. |
| 5. When does it appear? | The bench reveals Customers. The guide immediately advertises the reset. Depot needs the two-reference charter conditions. | The guide introduces one sale decision. The move controls appear with a full book and hauler. A signed reference and an eligible rig reveal Depot. |
| 6. When is it automated? | Timed bench work and freight finish through the normal clock, including away time. Acceptance, delivery and pickup are manual. | Same. One job per customer and one start per depot route per Season bound earnings. |
| 7. What survives resets? | Scrap Reset, Shop Move and Team Reset clear the current book, ticket and Season receipts. Signed references and depot custody, bookings in flight and stock awaiting collection persist. Shop Move carries one chosen asset into the new opening and awards zero Legacy Points. | Same save contract. A rig left over a reset must still finish both routes to return. An idle rig lodged this Season may return as soon as outstanding stock is collected. |
| 8. How do we test improvement? | The zero-race scripts establish feasibility. They cannot tell whether filling the third book is enjoyable. | Give players a spare engine and a planned build. Watch whether they can explain a sale, repair or refusal without prompting. At the depot, ask which part they want and when they want the mower back. Record mistaken handovers and unexpected resets. |
| 9. What mastered labor disappears? | A transfer eases the opening, then the player fills the same book again. | Freight lets a player skip the second relocation and third book. Its authored reward can replace repeated salvage trips for that component. |
| 10. What responsibility arrives? | Run a service business, then dispatch a rig after already qualifying to found a team. | Dispatch can earn the charter. The player allocates working equipment and spare stock before taking responsibility for a crew. |
| 11. Casual default and expert depth? | Take an eligible job. The cost of giving up the part and the path beyond it are hard to judge from the counter. | The first eligible part has a price and work description. Another part can be selected, the whole job skipped, or one depot delivery taken without committing the rig to both. |

## What was cut and retained

Removed the early locked Shop Move form, the move pitch on the first trip, the second mandatory relocation for depot access, and compulsory two-route service to get a rig back during the lodging Season. One lodging per Season still prevents free rig rotation. Retained the tool-versus-lead opening and the older two-reference charter as a playable alternative for existing garages. No new currency, stat, bonus channel, save field or timer. The Runabout remains an authored hauler assembled from identifiable parts. The Circuit direction can be decided independently.

## Route evidence

Four fresh seeds took 6.7–6.8 simulated hours to qualify for their first move before and after. Both transfer orders still founded in Season 3 on every seed, in 12.4–12.8 hours total. These are continuously active scripted garages. They do not model a person checking in four times a day.

On the new Season 2 equipment-reference route, the mower made the ramp trip in 20.3 minutes and the pump trip in 29.9. The garage fitted its only Worn spare engine to the rig and cleaned its old engine to pay the pump tender. Both receipts earned a 14 Team Point founding without a race. Reload preserved the rig and its history. On the original checkpoint, the Runabout carried 12 versus the mower's 5 and brought home 9 curb finds versus 5 in the scripted comparison.

Reproduce with `npx tsx scripts/customer-career.ts 4`, then `npx tsx scripts/motor-pool-route.ts` and `npx tsx scripts/service-runabout-route.ts`. The first script writes both generations of checkpoint.

| Four-seed pacing measure | Base | Redesign |
| --- | ---: | ---: |
| Daily first Season, median days | 20.4 | 20.4 |
| Mixed first Season, median days | 6.4 | 6.4 |
| Active first Season, median days | 5.3 | 5.3 |
| Slowest daily seed, days | 21.4 | 21.4 |

The default campaign misses the daily ceiling of 21 days and the mixed median floor of 6.5 days on both revisions. The optional zero-race route can found much earlier. That difference merits a human playtest before exposing it to new players.

## Questions for the owner

- Would you still repair Mira's wheel if the only reward were the payment? Play one Season with the move deliberately ignored.
- Does giving up the mower for freight feel like managing a garage, or would you rather keep the counter and reserve dispatch for the Team era?
- After trying both transfer openings, would you ever choose the second move for its own sake? If neither opening changes your next build, retire the reset and keep the customers.
