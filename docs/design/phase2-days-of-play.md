# Phase 2 — Days of play

Status: design spec v1, 2026-09-04. Implements the "2–4 days to first Scrap Reset"
decision from the charter. Builds on Phase 0 (one performance, one bonus algebra)
and Phase 1 (rates everywhere, spendable Rep).

## Target

| Measure | Today | Target |
|---|---|---|
| First Scrap Reset, mixed play | ~70 hands-on min | **2–4 days wall clock** at 4 check-ins/day of ~15 min |
| First Scrap Reset, pure idle | ~12 game hours | 5–7 days |
| Something new to buy or open | every few min, then a wall | every ≤20 min of attention, every ≤4 h idle |
| Walls needing a guide | T0→T1 (×7 difficulty) | none: every next step is visible and its cost is on screen |

Mixed play is the new pacing instrument: `scripts/simulate-mixed-campaign.ts`
runs 4 sessions/day, each session = N greedy decisions (buy what's affordable,
enter the best contestable event, start a project), then idles until the next
session. The pacing test guard becomes **40–100 wall hours** on that model.

## Five levers, in build order

### 1. Fatigue becomes a daily rhythm (engine)

Today fatigue is a function of lifetime races (`25·log2(1+races/100)`) and only
a $500 drink lowers it. That makes it a run-length wall with no rhythm. New model:

- `fatigue` is a stateful resource in 0–99.
- Each race adds `FATIGUE_PER_RACE[tier]` = 4 + tier (tier 0 → 4, tier 6 → 10).
- Recovery: `FATIGUE_RECOVERY_PER_HOUR` = 12 base, so a maxed driver is fresh in
  ~8 hours of wall time. Crew mechanics, momentum "Rested" tier, skills and the
  drink modify the rate, not the amount.
- Performance penalty stays `1 − 0.005·fatigue`; auto-race already respects a
  condition floor, add a fatigue ceiling (`autoRaceMaxFatigue`, default 70) so
  idle play races until tired, then rests. **The rail shows fatigue draining
  while resting and rising while racing**, which is the whole point.
- Remove `calculateFatigue(lifetimeRaces)`; `lifetimeRaces` stays for LP.

Effect: a session is "race hard for 15 minutes, spend, leave"; idle alternates
race/rest. The wall becomes a cadence.

### 2. Event ladder (data + engine)

Seven circuits stay as venues. Each venue hosts three **events**:

| Event | Difficulty × | Prize × | Rep × | Opens when |
|---|---|---|---|---|
| Sprint | 0.75 | 0.5 | 0.6 | venue unlocked (Rep purchase) |
| Heat | 1.0 | 1.0 | 1.0 | won a Sprint here |
| Feature | 1.4 | 1.8 | 1.6 | won a Heat here |

Venue base difficulty re-curved geometrically: `9, 20, 45, 100, 220, 480, 1050`
(×2.2 per venue; with events the ladder is 21 steps at ~×1.3). Base prizes follow
`10, 22, 50, 110, 250, 560, 1250` (×2.25) so prize never outruns difficulty by
more than the event multipliers. `minVehicleTier` stays per venue. Entry fees
scale with prize at 15%.

Rivals attach to venues as today; a rival can only be met in a Feature.

### 3. Timed workshop projects (engine + data + UI)

Every workshop line becomes a **project**: buying it starts a timer instead of
completing instantly. `durationSeconds = BASE_PROJECT_SECONDS · 1.9^tier`, with
BASE 300 (5 min) so tier 6 lines take ~8 h. One project slot at start; the
`pit_crew` line and Team crew add slots. Mechanic skill and crew reduce duration.
Projects continue offline. The rail gains a "Projects" row (running / slots)
with time remaining, and the Workshop panel shows a queue.

Part enhancement (polished and above) also runs as a project, using the same
queue, so the condition grind has a clock rather than a click.

### 4. Part variants (data)

Every core part gets two siblings per tier: **Light** (−25% weight, −10%
reliability), **Sturdy** (+20% reliability, +15% weight, −5% power). Generated
from a table in `src/data/partVariants.ts` applied over `PART_DEFINITIONS`, so the
41 hand-written parts become ~120 without hand-writing. Scavenge rolls the
variant with equal weight; the Dealer stocks by variant. Circuit `demands`
already reward different profiles, so three builds per tier exist before the
first reset.

### 5. Reveal on relevance (data)

Replace bare-Rep reveals for systems with triggers on things the player has:

| System | Reveals when |
|---|---|
| Decompose / materials | a rusted part sits in the pile for a full tick |
| Fabrication | any material > 0 |
| Add-ons | first race lost where handling was the weakest stat (diagnostics already know) |
| Dealer | cash ≥ cheapest missing core part and a slot is empty |
| Stations | first station drop |
| Refurbish | a part below "decent" is installed on the active vehicle |
| Skills | any skill level ≥ 1 (already) |
| Projects queue | first workshop purchase |

The circuit/location/vehicle ladder keeps Rep **prices**; those are decisions.

## First Scrap Reset requirement (new)

Replace `3 vehicles / 500 Rep / $8k` with: **win the National Feature, defeat two
rivals, and reach 2,500 lifetime Rep**. LP award formula unchanged; expect ~120 LP
at that point (re-measure).

## What Phase 2 does not do

No new currencies. No locker (Phase 3). No prestige-layer changes. Art only via
existing manifest.

## Verification

- Unit: fatigue model, event unlock chain, project timers online/offline parity,
  variant generation integrity (every variant id unique, stats in range).
- Simulation: `simulate-mixed-campaign.ts` prints wall days to reset for mixed
  and pure-idle; `calibrate-circuits.ts` extended to events; guard 40–100 h.
- Playwright smoke unchanged; add one e2e for "start a project, reload, timer
  persisted".
