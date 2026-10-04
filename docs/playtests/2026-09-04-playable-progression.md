# Rags to Races: playable progression playtest

Date: 2026-09-04. Branch: `codex/playable-progression`, based on `feat/systems-harmony` at `c188573`.

## Result

The complete Builder → Scrap Reset → Team → Owner → Track route is implemented and playable locally. The real-store campaign driver reaches Track without developer grants. The existing National Feature first-reset gate remains in place. No deployment was performed.

## Changes

- One next objective links to the relevant activity. Passive scavenging guarantees starter engine and wheel access, including Light and Sturdy variants. The tutorial covers building, racing, diagnosis, repair, and preparation; workshop announcements wait until it finishes.
- Race preparation compares current and recommended circuit-specific outcomes, with detailed controls available on demand. Part replacement compares circuit performance before installation.
- Auto-racing respects a cash reserve, condition floor, and fatigue ceiling. Repair automation and permanent opening shortcuts reduce familiar work in later runs.
- Run, lifetime, and Team/Owner/Track-era achievements are separate. Spending upgrades cannot remove eligibility. Promotions use the approved reset counts, Feature wins, fleet venues, and sponsor families.
- Scrap rewards use one highest-Feature reward, unique run rivals, and logarithmic run-earned Scrap Bucks. Starting grants, waiting, race count, and fatigue do not create rewards. The preview shows reward, elapsed-hour pace, next depth milestone, retention, and canceled work.
- Every reset preserves loot gear and installed mods, discoveries, achievements, tutorial completion, and lifetime history. Team retains half of Legacy levels; Owner retains half of Team levels; Track clears lower upgrades. Toolkit/Dirt Track and Owner repair/project-slot knowledge survive later resets.
- Team policies trade income against crew development. Assigned crew have role-specific benefits; vehicles and crew stay reserved until collection. Owner specialties have benefits and drawbacks, and three sponsor families pay once per Owner era.
- Hosted events are three-round series. Surface, class, corners, distance, condition, selected vehicle, and committed budget affect forecasts and actual results. Rounds carry wear forward; rewards collect once.
- Junkyard Dog, Track Rat, and Iron Lungs have 2/4/6-piece bonuses. Enhancement from level three uses reserved projects. Salvage returns set materials and cash. Feature mods have explicit drawbacks. Existing unassigned gear keeps its identity during migration.
- Rep never decays; its legacy-floor value becomes starting Rep. Offline simulation credits up to 48 hours using bounded worker batches, atomic settlement, overflow conversion, progress reporting, and an explanatory return summary.

## Measured opening and checks

| Check | Result |
|---|---|
| Passive starter availability | Ten fixed seeds build a Push Mower through real store actions by 30 base ticks: 15 simulated minutes, without repeated manual scavenging |
| Race and informed improvement | The same ten saves complete a real-store race and apply circuit-recommended preparation with higher performance and no increased DNF risk; no additional resource waiting is needed after the fifteen-minute build |
| Online/offline equivalence | Seeded 100-tick parity covers races, wear, fatigue, challenges, achievements, crew, skills and rewards; another test matches elapsed time when a speed project completes mid-batch |
| Unit tests | 543 passed in 81 files |
| Browser suite | 108 passed on desktop 1440×900 and mobile 390×844 against the production build |
| Type checking / lint | Passed |
| Production build | Passed |
| First-reset gate | National Feature, two rivals and 2,500 lifetime Rep remain unchanged |

Focused tests cover reset boundaries and exact awards, halved upgrades and crew capacity, equipped gear/mod retention, migration without fabricated history, queued-item reservations, fleet exclusivity, crew-role outcomes, sponsor claims, series eligibility, and duplicate settlement/collection prevention. Malformed current-version imports are rejected.

The browser suite also exercises the opening, variant starter parts, diagnosis, workshop actions, projects, save/reload/import/export, all reset layers, crew/fleet work, Owner facilities, series, themes, phone overflow, keyboard operation, and structural accessibility. Production testing caught and fixed a local analytics 404. Development controls now follow the existing release-channel gate consistently in local production builds.

## Farm versus push: ten seeds and two schedules

Comparisons start from equivalent fresh saves and the same seed scheme (`progression-0` through `progression-9`). The driver uses real store purchases, building, repairs, preparation, races, projects, resets, sponsor claims and fleet jobs. Between visits it uses shared offline simulation, including speed changes from completed projects.

- **Mixed:** four daily visits starting at 08:00, 12:30, 18:00 and 22:00; each has a 15-minute interaction budget.
- **Daily:** one visit at 09:00 with a 5-minute interaction budget. The script calls this `idle`; it still makes decisions during the visit.
- **Farm:** reinvest after the National Feature when eligible; push farther when promotion requires it.
- **Push:** pursue the World Feature before ordinary Scrap resets. Owner completion also pursues fleet and sponsor requirements.

The following distribution measures the first three Scrap runs. Hours are simulated elapsed time, not CPU runtime. LP/hour is actual LP awarded by these resets divided by elapsed time; the reset screen shows the current run projection.

| Schedule / policy | First reset hours min / median / max | Three-run hours min / median / max | Median LP/hour over three runs |
|---|---:|---:|---:|
| Mixed / farm | 52.5 / 58 / 62 | 90.5 / 108 / 148.5 | 5.85 |
| Mixed / push | 62 / 72 / 76.5 | 100 / 110 / 133.5 | 8.02 |
| Daily / farm | 216 / 216 / 264 | 312 / 360 / 384 | 1.96 |
| Daily / push | 240 / 240 / 288 | 360 / 384 / 432 | 2.44 |

**Reproducible tradeoff:** mixed/`progression-0` farming makes the first reinvestment at 58 hours for 201 LP; pushing reaches it at 72 hours for 302 LP. Farming provides permanent purchasing power 14 hours earlier. Over three runs, both finish at 110 hours: farm awards 624 LP and push awards 919 LP. Pushing wins that accumulation scenario by 295 LP. Neither policy dominates both objectives.

Raw data: `output/playtests/2026-09-04/cohort.json` and the forty adjacent per-policy/per-seed `.jsonl` files.

## Complete progression

The initial complete mixed/farm/`progression-0` route reaches Track in 65 driver segments and 277.9 simulated hours, awarding 11,118 LP from Scrap resets along the way. Segments include promotions and fleet-completion visits; segment count is not Scrap-reset count. Its final pre-Track save records 48 lifetime Scrap resets, four Owner resets in the Track era, an Endurance Feature win, and all sponsor families. Fleet assignments supplied distinct venues before Owner promotion.

Mixed/push for the same seed reaches Track in 271.7 hours and awards 23,460 Scrap-reset LP: a measured example of pushing improving full-campaign progress as well as currency accumulation.

| Schedule / policy | Reached Track | Hours min / median / max | Median days | Median awarded LP/hour |
|---|---:|---:|---:|---:|
| Mixed / farm | 10 / 10 | 258.7 / 385.7 / 682.6 | 16.1 | 30.03 |
| Mixed / push | 10 / 10 | 253.6 / 312.3 / 367.4 | 13.0 | 70.36 |
| Daily / farm | 10 / 10 | 2737.4 / 3048.2 / 3240.0 | 127.0 | 6.53 |
| Daily / push | 10 / 10 | 3049.1 / 3456.1 / 3672.0 | 144.0 | 8.77 |

All forty completed routes reached the first Track reset. Full results are in `output/playtests/2026-09-04/full-campaigns/cohort.json`; a compact copy of both cohorts and the offline stress measurement is retained beside this report in `2026-09-04-measurements.json`.

The full daily cohort adds a second farm/push tradeoff: farming reaches Track sooner (127-day median versus 144), while pushing earns more LP per elapsed hour (8.77 versus 6.53). Daily-only pacing is markedly slower than mixed visits, and remains a prominent balance concern for human testing.

Distributions describe these policies and seeds, not promised human completion times. No day-count requirement was added to a reset gate. Existing coarse timing tests remain smoke guards; measurements are recorded before adopting tighter future regression bounds.

## Offline stress test

The extreme save runs at the 100 ms tick floor. A full 48-hour settlement processes **1,728,000 ticks**, completes 680 races, and accounts for 39,079,683 scavenged parts. CPU wall time was **600.9 seconds** on this Windows workstation while other checks ran. This is a stress fixture, not the fresh-game tick rate.

The worker yields every 500 ticks and reports progress. Gameplay stays protected until atomic settlement finishes; expensive work runs off the UI thread. Reloading before completion leaves the original save available for deterministic replay. A duplicate settlement returns false. A 72-hour absence receives the same production budget as 48 hours, with the cap disclosed.

The fixture starts with an old over-cap inventory of 350 parts. All 350 remain valid, new finds do not increase that count, and overflow converts to cash. Gear remains at 250. The migration does not erase an old over-cap collection to enforce the new limit.

Ordinary 48-hour browser returns, interrupted settlement/reload, and online/offline parity checks passed. Raw stress results: `output/playtests/2026-09-04/offline.json`.

## Manual observations

- **Opening:** followed Guide Me, targeted missing parts, sold surplus, built and activated a Sturdy Push Mower, raced, read the debrief, repaired, and selected recommended preparation. Its displayed win forecast improved from 49% to 61% and DNF from 24% to 18%. This session included inspection pauses and was not a controlled stopwatch trial; the fifteen-minute passive-build bound is measured above.
- **Team:** imported an earned save, chose Income, collected work, recruited a mechanic, and assigned it to a spare Push Mower. The assignment removed both vehicle and crew from available choices.
- **Owner:** inspected an earned save with Endurance specialty, paid Grassroots and Technical sponsors, remaining Endurance objective, and facilities. Reinvested 8 OP in Born Rich.
- **Track promotion:** used the earned pre-Track save and completed the actual promotion after reviewing retention. It kept 250 gear pieces, six equipped pieces and 29 spare mods while clearing eight vehicles, 95 loose parts and two assignments. Opening knowledge remained.
- **Series:** used a labeled accelerated fixture. Push Mower forecasts changed from 49% / 37% / 48% on medium-corner gravel to 42% / 42% / 43% on high-corner asphalt. A Riding Mower forecast 80% / 80% / 80% there, with 120 Scrap entry and 600 maximum prize. Committed it, advanced time through development controls, observed three first-place results, collected 600, and verified its release at 61% condition. This is one outcome, not a claim about expected payout.

## Balance judgments and limitations

The opening now provides a clear engineering decision, and returning players retain useful equipment and knowledge. My subjective assessment is that the loop supports productive short visits and explains how to act on a race result. Human enjoyment feedback remains necessary: automated success cannot establish that every reward feels satisfying.

Daily-only first resets remain substantially slower because the driver makes unlock/build decisions only during its visit. Later runs compress sharply with retained gear and permanent upgrades. Reduced familiar work is intentional; the best amount of compression still needs human playtesting. The extreme 100 ms / 48-hour return takes several minutes despite a responsive UI. These are disclosed balance/performance judgments, not hidden production truncation.

Series choices were checked over 100 fixed outcome seeds at 30% and 100% condition: lower stakes win the damaged-build net-return scenario; higher stakes win with a healthy build. Owner specialties have positive and negative circuit cases. Crew/policy comparisons verify different economic and wear outcomes.

Build-style checks use the shared race odds, with the same 30% performance bonus for each alternative. A rusted, 60%-condition Go-Kart on Dirt Sprint favors Light (38.60% outright win versus 37.42% mixed and 25.00% Sturdy). A pristine, 30%-condition Go-Kart with the first compatible parts favors Sturdy (52.67% versus 50.27% mixed and 49.37% Light). A pristine Push Mower on Backyard Feature favors a balanced mix of light engine and sturdy supporting parts (54.53% versus 53.33% Light and 51.53% Sturdy). These are specific comparisons, not universal rankings; balanced here means mixing parts to meet demands, not fitting every base variant.

The long campaign exposed a driver mistake: after unlocking a higher-class car, it could skip the lower-class blueprint needed for National. The driver now buys a legal build for its goal, and the player objective explains the class requirement. Promotion readiness takes precedence over routine repair prompts. Higher resets also retain lifetime Team/Owner currency totals and recorded promotion counts separately from current-era eligibility counters.

## Reproduction

```powershell
npm ci
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run build
npm run start -- --hostname 127.0.0.1 --port 3102
```

In a second terminal:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3102'
$env:PLAYWRIGHT_FULL_MATRIX='1'
npm run fixtures:generate
npx playwright test --workers=4
```

Campaign and stress commands:

```powershell
npm run sim:progression -- mixed farm progression-0 100
npm run sim:progression -- mixed push progression-0 100
npm run sim:cohort
npm run sim:cohort -- 100
npm run test:offline:48h
```

The default cohort measures three runs. The `100` variant continues through the complete progression and writes to `output/playtests/2026-09-04/full-campaigns/`. An optional second number sets 1–6 concurrent simulation processes. Runs are fresh by default; add `--resume` only to continue interrupted measurements from unchanged code. The 48-hour stress command is deliberately outside the fast test suite. Earned exports and accelerated fixtures are labeled separately. Existing local user files were preserved.
