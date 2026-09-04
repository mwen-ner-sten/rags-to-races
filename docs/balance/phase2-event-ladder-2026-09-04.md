# Phase 2 balance — event ladder, part variants, reveal on relevance (2026-09-04)

Baseline after the phase-2 levers 2, 4 and 5 (`docs/design/phase2-days-of-play.md`)
and the new first-Scrap-Reset requirement. Levers 1 (fatigue rhythm) and 3
(timed projects) land separately and will move these numbers again.

## What changed

- **Event ladder.** Every venue hosts Sprint (×0.75 difficulty, ×0.5 prize,
  ×0.6 Rep), Heat (×1) and Feature (×1.4 / ×1.8 / ×1.6). Sprint opens with the
  venue, Heat after a Sprint win there, Feature after a Heat win there. Rivals
  only race in Features. Entry fee = 15% of the event prize (the tutorial venue
  stays free). Auto-race enters the open event with the highest expected net
  payout among those the active car can contest (win chance ≥ 35%); the player
  can pin one per venue.
- **Venue ladder.** Heat difficulty `9, 20, 45, 100, 220, 480, 1050`; Heat
  prize `10, 22, 50, 110, 250, 560, 1250`. Rep unlock prices unchanged.
- **Part variants.** Every core part has a Light (−25% weight, −10%
  reliability) and a Sturdy (+20% reliability, +15% weight, −5% power)
  sibling: 37 base parts → 74 variants → 111 core parts (plus 3 misc, `elec_none`).
  Junkyard, race salvage and the Dealer roll base / Light / Sturdy with equal
  weight after the tier roll.
- **Reveal on relevance.** Workshop sections open on what the player holds,
  never on a bare Rep threshold (see `SYSTEM_REVEAL_DEFINITIONS` in
  `src/data/featureUnlocks.ts`). Once revealed, a section stays revealed
  through every reset.
- **First Scrap Reset** = win the National Circuit Feature + defeat two rivals
  + 2,500 lifetime Rep (`SCRAP_RESET_REQUIREMENTS`).

## Measured

| Play style | Method | Before (old gate) | After |
|---|---|---|---|
| Engaged | `src/state/__tests__/campaignPacing.test.ts` (seed `uat-first-campaign`) | ~88 hands-on min, 74 races | **~54 hands-on min**, 67 races, 308 scavenges, 84 LP |
| Idle, check-in every 30 min | `scripts/simulate-idle-campaign.ts 30` | ~7.0 game h | **~9.6 game h** (20 check-ins, 208 races, 3 rivals) |

Engaged play got *faster* despite the harder gate: the spec's geometric venue
ladder (below) turns the first four venues into near-locks for a tier-appropriate
build, so the run is paced by Rep prices (National 500, Stock Car 250, Military
Scrapyard 1,250) and by sourcing a Stock Car, not by contests. The pacing test's
interim guard is **35–90 engaged minutes**; the charter's 2–4 wall-clock days is
to be judged by the mixed-play simulation once levers 1 and 3 are in, not by
this engaged-only harness.

Vehicles built on the engaged seed: Push Mower, Riding Mower, Go-Kart, Street
Racer, Stock Car. Events raced: mostly Features once open (Regional Feature 28,
Dirt Feature 14, Backyard Feature 10); the National Feature was won first time.

## Contest calibration (`scripts/calibrate-circuits.ts`)

> Superseded the same day: the anchor was retuned and the mixed-play
> instrument built in `phase2-mixed-play-2026-09-04.md`. The table below is
> the pre-retune measurement that motivated it.

Win chance for a decent tier-minimum build (floor) and a pristine tier-max build
(ceiling), per event:

| Venue | Sprint floor / ceil | Heat floor / ceil | Feature floor / ceil |
|---|---|---|---|
| Backyard Derby | 46% / 85% | 32% / 84% | 17% / 83% |
| Dirt Track | 84% / 85% | 82% / 84% | 77% / 83% |
| Regional Circuit | 84% / 85% | 83% / 85% | 80% / 84% |
| National Circuit | 82% / 84% | 77% / 84% | 67% / 81% |
| World Championship | 81% / 83% | 76% / 81% | 65% / 75% |
| Continental Grand Prix | 49% / 68% | 32% / 54% | 18% / 35% |
| Endurance Series | 16% / 26% | 10% / 15% | 7% / 9% |

**Finding.** The spec's `9 … 1050` ladder was written against a different
performance scale than the one `engine/performance.ts` produces: the old
per-venue parity fits were `9, 64, 166, 251, 500, 540, 560`. Under the new
ladder Dirt through World are near the 85% cap for any tier-appropriate car
(the charter's "every circuit is a contest" no longer holds there) and the
Endurance Heat is a wall even for a pristine T10. The ladder shape (×2.2 per
venue, ×~1.3 per event) is right; its anchor is not. Recommended follow-up:
rescale the venue difficulties by the measured parity performance of each
tier-minimum build (roughly ×3 from Dirt upward, with Endurance pulled back to
its old fit), then re-measure. Balance constants were not tuned here, per the
phase-2 brief. `src/engine/__tests__/statModel.test.ts` now guards the ladder's
shape and a 0.35 floor ratio rather than per-venue parity.

## Reveal predicates

| System | Reveals when | Evidence that also counts |
|---|---|---|
| Decompose | a rusted **or worn** part has sat in the pile for a full tick (rusted finds are auto-sold from the first tick, so the worn pile is what a fresh save actually holds) | any material held, anything ever decomposed |
| Fabrication | any material > 0 | Parts Bin bought |
| Add-ons | a race lost where the debrief names grip (handling) as the weakest stat | an add-on part owned, Add-on Bench bought |
| Dealer | cash ≥ the cheapest Decent part that fills an empty slot on the active vehicle | a board already stocked |
| Stations | first station-equipment drop | anything equipped |
| Refurbish | a part below Decent installed on the active vehicle | Refurbishment Bench bought |
| Skills | any skill level ≥ 1 (unchanged) | — |

Saves migrating from v5 keep whatever the old Rep thresholds had already shown
(`migratePersistedState`, version 6); venues they had opened stay open with the
Sprint available.
