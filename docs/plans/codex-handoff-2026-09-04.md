# Codex handoff — reset cadence, loot gear, pacing (2026-09-04)

Branch: `feat/systems-harmony` at `45d6015` (not pushed). Read this file top to
bottom before touching code. Every task lists its files, acceptance criteria, and
the commands that prove it. Do the tasks in order; each one leaves the tree green.

## How to work in this repo

- Gates, all must pass before every commit: `npm run typecheck`, `npm run lint`,
  `npm test` (525 unit tests today), `npm run fixtures:generate`, then
  `npx playwright test --grep @smoke` (18 tests; Chromium is installed; port 3000
  may be busy, so run with `PORT=3311` if the config honours it, or free the port).
- Pacing instruments: `npm run sim:mixed` (wall-clock mixed play and pure idle,
  seeded), `npx tsx scripts/calibrate-circuits.ts` (win chance per venue × event
  for tier-min and tier-max builds), `npx tsx scripts/simulate-idle-campaign.ts 30`.
- Design rules that are settled (see `docs/gameplay-charter.md`, "Settled Product
  Decisions"): every system is a producer, converter, or multiplier on the shared
  resource graph and shows a per-second rate (`src/engine/rates.ts`); Rep is spent,
  not thresholded, for venues/locations/blueprints/workshop lines; systems reveal on
  relevance (`SYSTEM_REVEAL_DEFINITIONS` in `src/data/featureUnlocks.ts`); one
  `vehiclePerformance` (`src/engine/performance.ts`); one bonus algebra
  (`src/engine/bonuses.ts`, add within a class, multiply across classes); one shell
  (`src/components/shell`), themes are token sets in `src/data/themes.ts`; no emoji,
  use `src/components/icons/Icon.tsx`; UI primitives in `src/components/ui`.
- UI rules: `CLAUDE.md` (mobile breakpoint 640px, `.shell-content` reservations,
  z-index table, tutorial `data-tutorial` targets).
- Never loosen a pacing guard to make a number fit. Change the design constant,
  re-measure, then set the guard to the measured value ±20% with a comment.
- Commit per task, conventional prefix (`feat:`, `fix:`, `refactor:`), body lists
  constants changed and measured numbers.
- Do not touch: `src/dirt/**` (a shelved concept on another branch, not present
  here), `docs/art/source/**` (authoring PNGs), `.claude/worktrees/**`.

## Where the game is right now (so you don't re-derive it)

- First Scrap Reset gate: win the National Feature + defeat 2 rivals + 2,500
  lifetime Rep (`SCRAP_RESET_REQUIREMENTS`, `src/config/progression.ts`).
- Measured: mixed play (4 × 15 min sessions/day) reaches it in **3.0 wall days**;
  pure idle (one 5-min visit/day) in **11 days**. Guard 48–96 h in
  `src/engine/__tests__/mixedCampaign.test.ts`.
- Legacy Points at first reset: 116 in the engaged harness, 946 in the mixed sim.
  The formula (`calculateScrapResetAward`, `src/engine/prestige.ts`) has not been
  reviewed since the event ladder landed.
- Higher layers: Team reset needs 200 lifetime LP; Owner needs 500 TP + 3 Team
  eras; Track needs 1,000 OP + 5 Owner eras (`RESPONSIBILITY_RESET_REQUIREMENTS`).
  With ~120–900 LP per Scrap Reset, Team unlocks on the **first or second** reset.
  That is the problem Task 1 fixes.
- Fatigue: stateful, +4+tier per race, 12/h recovery, auto-race rests above 70
  (`src/engine/fatigue.ts`). Workshop lines are timed projects
  (`src/engine/projects.ts`). Event ladder Sprint/Heat/Feature per venue
  (`src/engine/eventLadder.ts`). Part variants Light/Sturdy
  (`src/data/partVariants.ts`).
- Loot gear: drops from races (8% win / 3% loss / 1% DNF) into the Locker
  (`src/components/Locker`), mods 1% on wins; station equipment drops from
  scavenging (`src/engine/gearDrop.ts`). Loot gear bonuses flow through
  `getGearBonuses` → `Bonuses`. Loot gear survives every reset layer.
- Rep decay: see the last section of this file.

## Design intent for this handoff (the owner's words, distilled)

1. The **first Scrap Reset should feel substantial**. 2–4 days is too fast for it.
2. **Layers unlock over time, not every reset.** Several Scrap Resets before Team;
   several Team eras before Owner.
3. **Farm or push is a decision.** A fast reset should be worth doing sometimes; a
   long push should pay more per hour at the right moments, not always.
4. **Higher resets reset the lower tiers and slow them back down**, then each era
   rebuilds them faster than the last, with milestones and high-level unlocks that
   speed up the early game after high-level resets.
5. **Keep loot gear and finish the system that uses it.**
6. Spendable Rep stays.

## Task 1 — Reset cadence model

Goal: encode intent 1, 2 and 4 as data and constants, not prose.

Files: `src/config/progression.ts`, `src/data/campaignPacing.ts`,
`src/engine/prestige.ts`, `src/state/store.ts` (reset actions: `prestige`,
`teamReset`, `ownerReset`, `trackReset`), `src/data/resetContracts.ts`,
`src/data/legacyUpgrades.ts`, `src/data/teamUpgrades.ts`,
`src/data/prestigeMilestones.ts`, `docs/gameplay-charter.md` (targets table).

1. **Targets** (`CAMPAIGN_PACING_TARGETS_HOURS` becomes a cadence table):

   | Milestone | Mixed-play wall time |
   |---|---|
   | First Scrap Reset | 5–8 days (120–192 h) |
   | Scrap Resets 2–4 | 1–3 days each, shrinking |
   | First Team reset | after ≥ 4 Scrap Resets, ~2–3 weeks total |
   | First Scrap Reset after a Team reset | 3–5 days (slower again) |
   | Scrap Resets in Team era 2+ | each era ~25% faster than the last, floor 12 h |

2. **Gates**. Team reset requires `scrapResetsThisTeamEra ≥ 4` AND lifetime LP
   ≥ 400 AND a Continental Feature win this era. Owner requires `teamEras ≥ 3` AND
   500 TP AND an Endurance Feature win. Track unchanged except `ownerEras ≥ 4`.
   Add the era counters to state if missing (`scrapResetsThisTeamEra` exists as
   `prestigeCount` per era? verify; otherwise add and migrate, bump
   `PERSISTENCE_VERSION`).

3. **Higher resets slow the lower tiers.** On Team reset: Legacy upgrade levels
   are cut to `floor(level / 2)` (not wiped), `legacyRepFloor` is halved, workshop
   Blueprint Memory is cleared. On Owner reset: Team upgrades halved the same way,
   plus the Team-era rebuild bonus (next item) resets to era 1 pace. Write the
   retention as rows in `resetContracts.ts` so the matrix test documents it.

4. **Each era rebuilds faster.** Add `eraTempo(layer, eraIndex)` in
   `src/engine/prestige.ts`: Legacy upgrade cost multiplier `0.8^(teamEras)`
   (floor 0.35) and starting LP grant `25 · teamEras` on each Scrap Reset within
   the era. Team upgrades get the analogous `0.85^(ownerEras)`.

5. **Early-game accelerators unlocked by high resets** (new entries in
   `prestigeMilestones.ts`, gated by era counts, not LP): "Muscle Memory" (Team
   era ≥ 1: start every run with Toolkit built and the Dirt Track venue open),
   "Old Crew" (Team era ≥ 2: first project slot count 2 from tick one), "Fresh
   Legs" (Owner era ≥ 1: fatigue recovery ×2 for the first 24 h of every run),
   "Sponsor Call" (Owner era ≥ 2: +$500 and +50 Rep on run start). Each must show
   in the Prestige tab with its era requirement.

Acceptance: unit tests for the gates and the retention halving; `resetContracts`
matrix test updated; charter table updated; `npm test` green.

## Task 2 — Farm-vs-push economics

Goal: intent 3. The player should be able to read "reset now" vs "push on" from
the screen.

Files: `src/engine/prestige.ts` (`calculateScrapResetAward`), `src/engine/rates.ts`
(`legacy_projection` row), `src/components/Upgrades/PrestigeSubTab.tsx`,
`src/components/Upgrades/LpSimulator.tsx` (exists), `src/data/prestigeMilestones.ts`.

1. **Review the LP formula first.** Explain in a comment why mixed play pays 946
   and the engaged harness 116 for the same gate; make LP a function of things the
   player controls (highest Feature won, rivals defeated, lifetime Scrap Bucks this
   run, wall days since run start with diminishing returns after day 7), not of
   race count. Target: first reset ≈ 150 LP for a 6-day mixed run, ≈ 90 LP for a
   fast 2-day push once accelerators exist.
2. **Push bonuses**: winning the World Feature this run ×1.5 LP, Continental
   Feature ×2.2, Endurance Feature ×3.0 (multiplicative, one each). Rivals: +10%
   per rival defeated this run. These are the "push" reasons.
3. **Fast-reset floor**: minimum award `20 + 5 · prestigeCount` so a quick farm
   reset is never worthless, and a "Quick Reset" tag in the UI when the run is
   under 24 h.
4. **Projection UI** in the Prestige tab, using `Stat`: "LP now", "LP per wall
   hour (this run)", "next push milestone: World Feature, ×1.5", and the rail's
   `legacy_projection` rate stays the per-hour secant.
5. Extend `scripts/simulate-mixed-campaign.ts` with a `--policy push|farm` flag
   (farm: reset as soon as eligible; push: reset only after the next Feature
   milestone) and print LP per wall hour for each. Add a test that neither policy
   dominates by more than 1.6× across the first three resets.

Acceptance: `npm run sim:mixed -- both --policy push` and `--policy farm` both
print; test guard in place; PrestigeSubTab smoke test passes.

## Task 3 — Repace the first campaign to 5–8 days

Goal: hit the Task 1 table for the first reset without breaking "every venue is a
contest" (`calibrate-circuits.ts` floor 35–55%, ceiling 65–80%).

Levers, in the order to try (prefer the top ones): (a) first-reset gate → World
Feature instead of National, keep 2 rivals, 4,000 lifetime Rep; (b) project
durations `BASE_PROJECT_SECONDS` 300 → 420 and tier growth 1.9 → 2.0; (c) part
enhancement projects required for the World Heat (enhanced parts as a soft
prerequisite via difficulty anchor); (d) Rep prices for World/Continental ×1.5.
Do not touch prizes or difficulty anchors (they are calibrated).

Re-measure with `npm run sim:mixed`; retighten the guard in
`mixedCampaign.test.ts` to 120–192 h mixed. Pure idle: accept whatever it lands on
(likely 15–20 days) and record it; the owner has not asked for an idle target
now. Update `docs/balance/phase2-mixed-play-2026-09-04.md` with a new dated
section rather than editing the old numbers.

## Task 4 — Finish the loot gear system (the Locker has a source; give it depth)

Files: `src/data/lootGear.ts`, `src/data/gearMods.ts`, `src/engine/gear.ts`,
`src/engine/gearEnhance.ts`, `src/engine/gearDrop.ts`, `src/engine/fatigue.ts`,
`src/engine/projects.ts`, `src/components/Locker/**`, `src/data/helpContent.ts`.

1. **Gear sets** for loot gear, mirroring station sets: three sets of 6 slots,
   2/4/6-piece bonuses. "Junkyard Dog" (scavenge luck, sell value), "Track Rat"
   (race performance, DNF reduction), "Iron Lungs" (fatigue). Set id on each
   drop, weighted by the venue tier it dropped from.
2. **Fatigue is what loot gear is for.** Add bonus ids `fatigue_gain_reduction`
   (0.02–0.08 per piece) and `fatigue_recovery_pct` (0.05–0.20) to the affix
   tables and wire them through `getGearBonuses` into `fatigueAfterRace` and
   `fatigueAfterTick`. Rail sources must list "Gear" in the fatigue row.
3. **Enhancement as a project**: `enhanceLootGear` at level ≥ 3 queues a project
   in the shared queue (same rule as part enhancement), success odds unchanged.
4. **Salvage → materials**: salvaging loot gear yields the material matching its
   set (metal, rubber, carbon) plus Scrap Bucks, not Scrap Bucks only.
5. **Mods**: mods drop only from Feature wins; installing is instant; each mod
   has one drawback (e.g. +performance, −wear reduction) so choosing is a decision.
6. Locker UX: the "Total from gear" summary shows set progress (2/4/6) and the
   fatigue channel; item cards show the set tag; add a "Compare" toggle that
   shows deltas against the equipped piece (helper already exists, extend the
   test).
7. Reveal: Locker reveals on the first race drop (exists); add a guide card line
   about sets on the first second piece of any set.

Acceptance: unit tests for set detection, fatigue bonus wiring, salvage yields;
`Locker equips loot gear` smoke test still passes; new smoke test "salvaging a
set piece yields its material".

## Task 5 — Rep decay: tune and explain (decision included)

How it works today (`src/config/progression.ts` `REP_DECAY`,
`src/engine/repFloor.ts`, `computeTickRepDecay` in `src/engine/tick.ts`):

- Two numbers: `repPoints` (spendable) and `lifetimeRep` (never decreases; gates
  the reset requirement, Dealer, momentum, workshop reveals).
- Only `repPoints` decays, and only the part **above the floor**. Each tick removes
  `(repPoints − floor) · (1 − 0.5^(dt / 3 days))`. Half-life 3 days: 21% of the
  excess is gone after one day, 50% after three, 75% after six. Online and
  offline identical.
- The floor is `legacyRepFloor` = 10% of `lifetimeRep` banked at each Scrap
  Reset, kept across every reset layer, plus a reserved Legacy effect
  `leg_rep_floor` (no upgrade ships yet). On a fresh save the floor is 0.
- Why: unspent Rep is not a savings account. Racing keeps it warm; walking away
  cools the top of the meter; you cannot bank a month of idle Rep and buy the
  whole ladder at once. Lifetime Rep never cools, so nothing you have *earned*
  is lost, only what you have not spent.

Decisions to implement:

1. **Grace band**: no decay while `repPoints < 100`. A new player should never
   watch a two-digit number shrink.
2. **Idle grace**: decay starts only after 12 h without a race (track
   `lastRaceAt`), so an active session never loses Rep mid-play.
3. **Ship `leg_rep_floor`** as a Legacy upgrade ("Reputation", +50 floor per level,
   5 levels, cost curve like `leg_rep_mult`).
4. **UI**: the Rep rail row shows a "cooling in 9h" / "cooling" chip using the
   `warning` token when decay is pending/active, and the tooltip already prints
   the floor and half-life sentence; keep it.

Acceptance: tests for both grace rules; `rates.ts` Rep row sources show
"Cooling" only when decay is active; help glossary updated.

## Task 6 — Idle-only lever (optional, after Task 3)

If the owner later wants pure idle closer to mixed: implement "projects run 1.5×
faster while the tab is closed" (offline-only multiplier in
`simulateOfflineTicks`), which moves idle without moving mixed. Do not do this
unless asked.

## Task 7 — Art backlog (no engine work)

`docs/art/asset-brief.md` P0 list: 16 resource sprites. Generate externally with
the prompt scaffold, drop 128px PNGs in `docs/art/source/resources/`, run
`python scripts/convert_sprites_to_webp.py`, add `resource:<id>` entries to
`src/assets/manifest.ts`; `ResourceGlyph` already falls back to SVG when missing.

## Definition of done for the handoff

- Tasks 1–5 committed on `feat/systems-harmony`, each with green gates.
- `npm run sim:mixed -- both` prints first-reset days inside the Task 1 table, and
  `--policy push` vs `--policy farm` prints LP per hour for both.
- `docs/balance/` has a dated section per measurement.
- Nothing in this file was loosened to pass.
