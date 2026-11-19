# Planning a Race Night

The Race tab offers Race Night as soon as there is a car and a venue it can enter. Pick the venue and a pace. The booking reserves the hands lane for up to three ordinary starts at that venue, stepping up the ladder after podiums and ending early on the first new Feature win. A venue whose Feature is already won can host a prize night. Entry fees, wear and cooldowns apply, and a missing part or insufficient funds stops the session. Queued trips, research and other races wait. Bench work can continue. Canceling returns the hand slot to the queue after an in-flight race finishes. Race Night is available in a solo Season until its Fair Feature is won.

## Slow daily seeds

The daily baseline took one five-minute visit at 09:00. An action trace from the original simulation recorded these milestones in days since the first Season began.

| Seed | Backyard Feature | Riding Mower | Dirt Feature | Go-Kart | Fair Feature |
|---|---:|---:|---:|---:|---:|
| `pace-4` | 3.4 | 11.4 | 13.4 | 15.4 | 24.4 |
| `pace-6` | 5.4 | 7.4 | 16.4 | 16.4 | 23.4 |
| `pace-9` | 5.4 | 12.4 | 17.4 | 16.4 | 23.4 |

The first two handoffs were the repeat offenders. Seeds 4 and 9 spent a week between the Backyard Feature and the Riding Mower. Seed 6 opened Dirt around day 9 and took another seven visits to win there. Many visits ended with a short haul or a study and a repeat entry at a completed venue. When a higher rung opened after departure, an earlier-rung Habit could not react to it.

## Paired Season 1 benchmark

Run `npx tsx scripts/pacing-check.ts 12` and `npx tsx scripts/pacing-check.ts 12 --race-night`. The opt-in bot favors the highest open event at an unfinished venue when it sees a plausible chance to win. Before learning the Race Habit it also considers a familiar venue when short of cash or Rep. It still enters through the normal action. The default bot and all base rates are unchanged.

| Schedule and metric | Default | Race Night policy |
|---|---:|---:|
| Daily median | 21.4 days | 19.4 days |
| Daily maximum | 24.4 days | 22.4 days |
| Daily seeds exceeding 21 days | 7 of 12 | 3 of 12 |
| Mixed median | 6.5 days | 6.3 days |
| Active median | 5.3 days | 4.9 days |
| Maximum hauls per day across all schedules | 98 | 119 |

The original tail seeds moved from 24.4 to 18.4 days (`pace-4`), 23.4 to 18.4 (`pace-6`), and 23.4 to 20.4 (`pace-9`). The new tail, `pace-2`, took 22.4 days and was three days slower with the optional policy. The daily maximum still exceeds the 21-day goal. The opt-in mixed median fell below the 6.5-day target floor. The benchmark exercises one automated scheduling policy on these seeds, so its changes in loot, wear and time are not a guarantee for any individual player.

Core regressions cover an actual offline ladder, reloading the reservation, ordinary fees and the three-start cap, bench work during the reservation, cancellation, stale references and release after a milestone. The Playwright regression closes the tab with a saved reservation, reopens under an advanced browser clock and checks the away report and actual results.
