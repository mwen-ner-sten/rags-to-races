# County Baton playtest

The first Parts With a Past clear unlocks the ordinary one-slot salvage crate. The second clear and county passport unlock County Baton. The third clear still unlocks the Auction Bidder Card. A player can keep choosing ordinary Seasons or any existing Dare or Season challenge.

County Baton starts in River County or Quarry County. The first leg requires a Dirt Feature win in a Go-Kart fitted with a newly hauled River Tire or Quarry Four from the local source. A repeat Dirt win can qualify. To keep the attempt going, use the next Scrap Reset to switch to the other county and spend a perk slot to carry the exact qualifying part at its current condition. Finish the second leg by winning the Fair Feature in a Beater fitted with that same part. A repeat Fair win can finish. A different Scrap Reset, Team Reset or Shop Move ends the attempt. Banked permits and Parts With a Past records persist.

The resulting freight permit belongs to the receiving county. On a later Scrap Reset into that county, choose an eligible part hauled from its neighbor and pay 8 Legacy Points instead of using the ordinary crate slot. The carried part retains its condition and provenance and can cross only one reset. To use the permit after completing the challenge, haul a new part for a later transfer. Purchase previews account for the fee before equipping perks.

## Natural playthrough

Run `npx tsx scripts/county-baton.ts 6`. Each seed started a new save and used the mixed schedule of four 15-minute visits per day. The simulator used normal player actions for trips, studies, clean/repair, builds, races, protecting the qualifying piece and each reset. It earned both Parts With a Past completions and the county passport in play, with no granted parts, cash, wins, or challenge records. Each row starts with the first Fair, then reports each later Season's elapsed days. Both reset legs were validated with the save decoder.

| Seed | Route | First Fair | Parts clears | Dirt qualification | Scrap transfer | Fair delivery |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| pace-0 | River → Quarry | 6.34 | 10.52 / 5.53 | 3.03 | 3.52 | 3.26 |
| pace-1 | Quarry → River | 6.34 | 10.33 / 5.92 | 1.76 | 3.34 | 3.88 |
| pace-2 | River → Quarry | 6.75 | 4.92 / 7.33 | 1.88 | 3.92 | 3.44 |
| pace-3 | Quarry → River | 6.52 | 10.33 / 5.92 | 2.34 | 2.34 | 3.26 |
| pace-4 | River → Quarry | 5.52 | 2.75 / 8.75 | 1.46 | 2.93 | 2.84 |
| pace-5 | Quarry → River | 6.34 | 13.33 / 7.33 | 1.34 | 1.92 | 3.86 |

Both directions completed three times. Preserving the winning part separately after qualifying kept later garage upgrades from trading or wearing it out. These runs cover gameplay through the permit award. A targeted regression compares actually taking the 8-LP freight option with using the ordinary slot and checks saved state, wrong destinations, Rookie Plates, and the ban on carrying the same part twice.

## Safeguard and restart

Run `npx tsx scripts/county-baton.ts 1 --restart` for the fresh-save abandonment route. After earning both Parts With a Past clears, the player qualified a River Tire, ended the attempt with an ordinary Scrap Reset, and won the Fair in that ordinary Season after 3.34 days. The player started again, qualified a different River Tire in 1.38 days, chose Safeguard and transferred it to Quarry County after 2.53 days. The save decoder confirmed the exact inherited UID and its safeguard. The Beater won the second Fair after 2.93 days.

Both browser projects cover the labelled part in the Garage and Build, the Race Feature setup cue, the keyboard release confirmation and focus return, and the reset confirmation. The transfer keeps protection and provenance after reopening the save. Ordinary carryover can retain the part separately when the player abandons, and the special safeguard ends with that attempt.

## Combined reset decisions

Run `npx tsx scripts/county-baton.ts 1 --veteran test-results/overnight/county_to_state-champion.txt test-results/combined-baton-save.txt` with the earned champion checkpoint. The Dirt team began with three Owner titles, earned two Parts With a Past clears in 2.33 and 8.33 days, then qualified the River Tire in 0.92 days. Before the next reset it safeguarded that physical tire, signed the Reliable Parts sponsorship and Longhaul Engineering Works deal, and opened a museum exhibit. The Scrap transfer after 2.75 days retained the protected tire and three titles, retired the sponsored tour and Works deal, and cleared the open exhibit. The Beater delivered the baton in Quarry County after 3.21 days.

The browser regression ran on both viewport sizes against this earned checkpoint. A separate deterministic browser fixture covers an active Club calendar alongside the sponsored tour, Works, and museum project. The planner shows the stake, the Works and Club records that carry forward, the open museum project, and whether the tire crosses or is scrapped. Switching from the handoff to a standard Season restores the previous county and crate selections. A museum action regression proves that a valid donation can proceed after the player releases the guard and cannot consume a guarded part.
