# Home county salvage routes

Learn Scouting and complete a haul at three different locations to choose a home county at Scrap Reset. The choice determines which local yard serves the next Season. A Team Reset carries that county forward. A later Scrap Reset can move the garage again.

| Home county | What the route offers | Cost and limits |
|---|---|---|
| Mill County | The original Curbside, Neighbourhood Yards and Marisol route. | The original opening prices, trip times and loot tables. |
| River County | Floodplain Lots replace Neighbourhood Yards. Free 3-minute trips favor frames and tires. The light, high-handling River Tire fits mowers, Go-Karts and Beaters. | The lots open at 5 Rep. Engine draws are rarer than in Neighbourhood Yards and wet stock averages worse condition. The River Tire gives up reliability to gain handling. |
| Quarry County | Quarry Breakers replaces Marisol's Junkyard. Its motors, chassis and gearboxes support a power build. The heavy Quarry Four fits Riding Mowers, Go-Karts and Beaters. | Base opening cost is 20 Rep with a Riding Mower or Borrowed Trailer, and each 16-minute trip costs 14 Scrap Bucks. Tires make up about 11% of its unscouted draws, compared with about 22% at Marisol's. |

Curbside, the shared Salvage Auction and The Long Haul remain part of all routes. The auction still provides the sedan shell. A Borrowed Trailer and Dirt Track Pass waive the local trailer yard's opening Rep, and the Quarry trip fee still applies.

The new stock comes from its own yard. The Parts Counter and Swap Meet direct players back to that county. When fitted or carried as a donor, a component retains the original county, source and Season. The Garage, donor selection, Season records and Hall of Fame show those labels. Works recasting retains the physical source and adds the drawing name. The Parts With a Past challenge counts distinct sources hauled this Season, and treats named sources in older saves as original finds.

## Naturally earned, paired trials

`npx tsx scripts/county-forks.ts 3` took `pace-0` through `pace-2` through normal first-Season actions on the mixed schedule. Each earned the Fair gate, Scouting and three visited sources in Season 1. The script copied that same earned checkpoint for each county and for two career depths. The neighboring policy favored Floodplain Lots before the Riding Mower or Quarry Breakers before the Go-Kart when it had time and could afford the trip. All other sourcing and racing used the regular bot. Each of the 18 final saves decoded successfully.

| County | Short Fair days for seeds 0 / 1 / 2 | Deep State days for seeds 0 / 1 / 2 | Native equipment observed |
|---|---|---|---|
| Mill | 3.76 / 3.76 / 3.93 | 13.75 / 13.33 / 14.33 | Original yard stock |
| River | 4.34 / 4.34 / 4.76 | 17.33 / 15.75 / 15.33 | 0–3 River Tires in each short run and 7–15 in each deep run. Ending and archived builds included Push and Riding Mowers with River Tires. |
| Quarry | 4.34 / 5.33 / 4.75 | 14.53 / 16.33 / 18.75 | 1–4 Quarry Fours in each short run and 3–6 in each deep run. Ending and archived builds included Riding Mowers and Go-Karts with Quarry Fours. |

Elapsed days start at the selected Scrap Reset. The deep runs cover the Regional invitation and the later State win. The more familiar Mill supply chain was fastest in this sample. River yielded a source for new handling builds, while Quarry spent 98 Scrap Bucks on completed local trips per short run and 168–196 per deep run for earlier access to stronger motors. The paired results are evidence of viable routes and the recorded tradeoffs in three seeds.

Core tests exercise the earned permit through real hauls and study, native source fees and exclusivity, fitting a hauled River Tire and carrying it through reset and reload, original-source compatibility, and invalid county tags. The Works suite exercises geographical attribution after a recast. The browser case selects River County at Scrap Reset and checks the new Trips options after reload.
