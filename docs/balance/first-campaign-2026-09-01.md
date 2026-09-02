# First-campaign balance — 2026-09-01

Baseline after the incremental-core-loop changes (idle from the first tick,
real stat tradeoffs, contested races, Workshop disclosure, formula fixes).

## Targets

From `docs/gameplay-charter.md` and `src/data/campaignPacing.ts`:

- First Scrap Reset: earned over **1–2 engaged hours**, never a sprint.
- Idle play always progresses; active play accelerates without click-grinding.
- Every circuit is a contest for a tier-appropriate build (never a lock).

## Measured

| Play style | Method | Time to first Scrap Reset | Races | Vehicles |
|---|---|---|---|---|
| Engaged | `src/state/__tests__/campaignPacing.test.ts` (seeded, manual scavenge + races, one background tick per ~15 manual actions / race) | **~88 hands-on minutes** | 74 | Push Mower, Riding Mower, Go-Kart, Street Racer |
| Idle, check-in every 30 min | `scripts/simulate-idle-campaign.ts 30` | **~7.0 game hours** (15 check-ins) | 103 | same four |
| Idle, check-in every 10 min | `scripts/simulate-idle-campaign.ts 10` | **~9 game hours** | 156 | + Beater Car |

Active play is roughly 5× faster than idle. The guard in the pacing test
is 60–130 engaged minutes.

## Contest calibration

`scripts/calibrate-circuits.ts` prints, per circuit, the circuit-fitted
performance of a decent tier-minimum build (floor) and a pristine
tier-maximum build (ceiling), and the win chance each implies:

| Circuit | Floor win | Ceiling win |
|---|---|---|
| Backyard Derby | 32% | 84% (T1 on a T0 track) |
| Dirt Track | 40% | 67% |
| Regional Circuit | 36% | 72% |
| National Circuit | 35% | 67% |
| World Championship | 35% | 50% |
| Continental Grand Prix | 26% | 47% |
| Endurance Series | 30% | 45% |

The last three deliberately require enhanced parts (polished and above),
station equipment, skills or team bonuses to farm — the scavengeable
ceiling is parity.

Win curve: `0.05 + 0.80 × r³ / (1 + r³)` on `r = performance / difficulty`,
capped at 85%. DNF base risk: `0.32 × e^(−reliability / 45)`.

## Tradeoff probe

`scripts/probe-tradeoffs.ts` compares a heavy power Street Racer (V8, steel,
sport tires) with a light grip build (V6, carbon, slicks): the heavy build
is faster, the light one corners better, and the gap between them narrows
on the power-led Regional Circuit versus the grip-led National Circuit.

## Known gaps / next tuning candidates

- Parts are still one-per-tier in most categories, so the pace/grip choice
  mostly happens between tiers and via weight. Parallel light/heavy part
  variants would deepen it.
- The idle simulation's check-in policy is naive (sells low parts, builds
  highest tier). Real idle players will land somewhere between the two rows.
- Second-run pacing with automation + Legacy upgrades has not been
  re-measured since the changes.
