# Phase 2 balance — mixed-play pacing and the event-ladder anchor (2026-09-04)

Follows `phase2-event-ladder-2026-09-04.md`. That note found the spec's
`9 … 1050` venue ladder anchored on the wrong performance scale (Dirt through
World at 76–83% for a tier-minimum build, the Endurance Heat at 10%). This
note makes the charter's "2–4 days to the first Scrap Reset with mixed play"
measurable, then re-anchors the ladder against that measurement.

## The instrument: `scripts/simulate-mixed-campaign.ts` (`npm run sim:mixed`)

A wall-clock simulation of a real player, built on the real store and
`computeTick` (`src/testing/mixedCampaign.ts`):

- **Mixed play**: four sessions a day (08:00, 12:30, 18:00, 22:00), each up
  to 15 minutes. **Pure idle**: one 5-minute session a day.
- A session is greedy decisions through store actions, re-planned every two
  minutes: sell surplus parts (keeping the best copy of anything an unlocked
  blueprint can use), spend Rep on the unlock that raises expected income most
  (a venue a garage car can contest, judged by `expectedRaceOn`; else the
  blueprint that reaches the next venue's minimum tier; else the junkyard tier
  that carries a missing part), build the best vehicle the pile allows, swap
  better loose parts onto the active car (Toolkit), start a workshop project
  when a slot is free (`MIXED_PLAY_PROJECT_PRIORITY`), then race until the
  auto-race fatigue ceiling and manual-scavenge otherwise (4 s per scavenge:
  the 2 s cooldown plus a look at the find). Manual scavenging takes priority
  while an unlocked blueprint is waiting on a part the selected junkyard can
  turn up. A player reading the reset card climbs the National ladder rung by
  rung once the venue is open and hunts rivals in Features; otherwise the
  event pin is left to the auto chooser so Heats and Features are entered as
  they open during the hours away.
- Between sessions the save goes through the app's resume path
  (`computeOfflineTickBudget` + `simulateOfflineTicks`, 8 h cap), so projects
  finish, fatigue recovers, Rep decays and auto-race keeps racing while rested.
- Deterministic: `SeededRandomSource` (`mixed-campaign`, `idle-campaign`).
- Prints per day: cash, Rep (spendable / lifetime), highest venue and event
  won, projects done and running, races, wins, rivals, fatigue, LP projection;
  stops at the first Scrap Reset and prints wall days.

Guarded by `src/engine/__tests__/mixedCampaign.test.ts` (both profiles, ~13 s).

## What changed

Only the venue difficulty anchor. No prize, Rep price, project duration or
fatigue constant moved: the mixed profile landed inside the band without them.

| Venue | Heat difficulty before | after | Heat prize (unchanged) |
|---|---|---|---|
| Backyard Derby | 9 | **8** | 10 |
| Dirt Track | 20 | **58** | 22 |
| Regional Circuit | 45 | **140** | 50 |
| National Circuit | 100 | **230** | 110 |
| World Championship | 220 | **380** | 250 |
| Continental Grand Prix | 480 | **385** | 560 |
| Endurance Series | 1050 | **385** | 1250 |

Event multipliers (Sprint ×0.75 / Heat ×1 / Feature ×1.4 difficulty; ×0.5 /
×1 / ×1.8 prize) and the 15% entry fee are unchanged.

**The ×2.2 shape could not be kept.** The anchor target was, per venue, a
decent tier-minimum build at 35–55% on the Heat and a pristine tier-maximum
build at 65–80%. Those bands pin each venue to a narrow window of its
tier-minimum build's circuit-fitted performance, and that performance is not
geometric: `7 → 59 → 150 → 211 → 447 / 383 → 429` for the seven venues'
minimum builds (the Stock Car is only ×1.4 a Street Racer; the World,
Continental and Endurance minimum cars are the same T8–T9 chassis). A
geometric ladder therefore cannot be a contest at every rung, which is what
the earlier note measured. The ladder is now monotonic and anchored on parity;
the top three venues share an anchor because they share cars, and their
prizes still climb ×2.2, so they are where a strong build's money is.
`src/engine/__tests__/statModel.test.ts` guards the bands instead of the
×2–2.5 step.

## Calibration (`scripts/calibrate-circuits.ts`)

Floor = decent tier-minimum build, lightest parts; ceiling = pristine
tier-maximum build, best parts.

| Venue | Sprint floor / ceil | Heat floor / ceil | Feature floor / ceil |
|---|---|---|---|
| Backyard Derby | 55% / 85% | **39%** / 85% | 22% / 84% |
| Dirt Track | 61% / 78% | **46% / 71%** | 27% / 55% |
| Regional Circuit | 65% / 82% | **49% / 78%** | 30% / 69% |
| National Circuit | 57% / 78% | **40% / 70%** | 23% / 55% |
| World Championship | 69% / 77% | **55% / 68%** | 35% / 50% |
| Continental Grand Prix | 61% / 75% | **45% / 66%** | 26% / 47% |
| Endurance Series | 66% / 75% | **51% / 65%** | 32% / 47% |

The Backyard ceiling is the Riding Mower against the tutorial venue and sits
on the 85% cap; only its floor is guarded. Features are now the stretch event
for a tier-minimum car (22–35%) and a coin flip for a pristine one; they are
where part condition, variants and swaps pay.

## Measured

Same planner, before and after the anchor change:

| Profile | Method | Old anchor | New anchor |
|---|---|---|---|
| Mixed play, 4 × 15 min/day | `npm run sim:mixed -- mixed` | 2.0 wall days (48 h; 9 sessions, 121 hands-on min) | **3.0 wall days** (72 h; 13 sessions, 181 hands-on min, 207 races, 63 manual, 2,403 manual scavenges, LP 946) |
| Pure idle, 1 × 5 min/day | `npm run sim:mixed -- idle` | 7 wall days | **11 wall days** (12 sessions, 56 hands-on min, 218 races, LP 547) |
| Engaged, rest only between fatigue ceilings | `src/state/__tests__/campaignPacing.test.ts` | — | **185 hands-on min**, 84 h of rest, 166 races, 1,271 scavenges, LP 116 |

Mixed play: day 1 ends at the Backyard Feature with three cars; day 2 at the
Regional Feature with three rivals down; day 3 opens the National Heat; the
National Feature falls in the 13th session. Under the old anchor the same
player reset at exactly 2.0 days because Dirt–National were near-locks.

**Pure idle misses the design note's 5–7 days.** Two structural reasons, both
measured with the instrument:

1. A once-a-day player climbs about one ladder rung per visit: parts for the
   next blueprint arrive overnight from a junkyard opened at the previous
   visit, and the build happens at the next. Riding Mower, Go-Kart + Dirt,
   Street Racer, Regional, Stock Car, National: six visits before the National
   ladder can start.
2. With tier-minimum builds the two rivals (Features only, 35% appearance)
   and the National Feature are 22–30% entries; the idle car is never swapped
   up because the daily visit is spent on the next rung. That is ~4 of the 11
   days, and it is exactly what the old near-lock anchor hid (7 days).

Levers that were tried and rejected because they move both profiles together
(the idle/mixed ratio is structural, ~3.5×, while the targets ask for ~2×):
`FATIGUE.RECOVERY_PER_HOUR` 18 (mixed 2.4 days, idle 12), the 8 h offline cap
raised to 24 h (idle 10–11), the Auto-Repair Rep gate cut to 50 (idle 12),
Rep prices ×0.35 (mixed 2.6, idle 9). Idle-only levers worth a follow-up
decision, in order of plausibility: let auto-race enter a venue's next rung at
lower odds when the reset card needs it (the goal-directed pin the simulation
gives the player, done by the game), let a rival also appear in Heats at
half rate, or have the daily visit's parts land the same day (a "sourcing"
scavenge queue). The pure-idle guard in `mixedCampaign.test.ts` is the measured
value ±20% (9–13 days) until one of those lands.

## Pacing targets

- `CAMPAIGN_PACING_TARGETS_HOURS.scrap` is now `{ min: 48, max: 96 }` wall
  hours of mixed play (charter: "Days 2–4"); the later layers stay in hours of
  play, and `campaignSimulation.test.ts` orders only those.
- `CAMPAIGN_HANDS_ON_MINUTES_GUARD` in `campaignPacing.test.ts` is 148–222
  (185 ±20%). The harness now sleeps off fatigue above the auto-race ceiling
  instead of racing at half performance, and pins the reset's next rung the
  way the mixed simulation does; the old 35–150 band was measured against a
  back-to-back grind at max fatigue.
- LP at the first reset: 116 (engaged), 547 (idle), 946 (mixed). The design
  note expected ~120; the mixed player's figure is high because the greedy
  planner keeps racing the Regional Feature while waiting on Rep for the
  National step and banks the lifetime Scrap Bucks that feed the award.
  Worth a look when the LP formula is next re-measured, not changed here.

## Also in this change

- `src/testing/campaignRaceSimulation.ts` states its underdog / favoured /
  dominant archetypes as ratios of the venue's Heat difficulty (0.62 / 1.22 /
  2.22, the old 28 / 55 / 100 against a 45 Regional) so the 100-race
  calibration keeps its meaning when the anchor moves.

- `scripts/simulate-idle-campaign.ts` now settles fatigue and projects from
  the tick result (it had been leaving fatigue at the cap after lever 1, so
  its garage stopped racing after ~20 races). It remains the game-hours probe;
  wall-clock pacing is `simulate-mixed-campaign.ts`.
