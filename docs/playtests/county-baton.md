# County freight playtest

With Experimental careers enabled, run `npx tsx scripts/county-baton.ts`. The script earns a county passport and one Parts With a Past clear through player actions, then branches the same save into two county Seasons. At each Fair it compares shipping the local part to its neighbour against carrying it in the ordinary crate. Both resulting saves must decode.

| Source | Part | Days to local Fair | LP after crate | LP after freight |
| --- | --- | ---: | ---: | ---: |
| River | River Tire | 3.76 | 36 | 28 |
| Quarry | Quarry Four | 3.34 | 36 | 28 |

The freight plan preserves an extra slot for the new Season. These runs establish eligibility, cost and persistence. They do not measure whether players enjoy the choice. See the [workshop decision](../design/county-baton.md) for the proposed human trial.

## Retired two-leg route

The following measurements are historical. The original script and handoff UI can be found at commit `3242c42`.

| Seed | Route | First Fair | Parts clears | Dirt qualification | Scrap transfer | Fair delivery |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| pace-0 | River → Quarry | 6.34 | 10.52 / 5.53 | 3.03 | 3.52 | 3.26 |
| pace-1 | Quarry → River | 6.34 | 10.33 / 5.92 | 1.76 | 3.34 | 3.88 |
| pace-2 | River → Quarry | 6.75 | 4.92 / 7.33 | 1.88 | 3.92 | 3.44 |
| pace-3 | Quarry → River | 6.52 | 10.33 / 5.92 | 2.34 | 2.34 | 3.26 |
| pace-4 | River → Quarry | 5.52 | 2.75 / 8.75 | 1.46 | 2.93 | 2.84 |
| pace-5 | Quarry → River | 6.34 | 13.33 / 7.33 | 1.34 | 1.92 | 3.86 |

Both directions completed three times. Preserving the winning part separately after qualifying kept later garage upgrades from trading or wearing it out. These runs cover gameplay through the permit award. A targeted regression compares actually taking the 8-LP freight option with using the ordinary slot and checks saved state, wrong destinations, Rookie Plates, and the ban on carrying the same part twice.
