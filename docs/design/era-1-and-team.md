# Era 1 and the Team layer: design spec v1

Date: 2026-10-03. Status: draft for owner review. Companion to the
[Era Plan](https://claude.ai/artifact/6ZTYnzo8NniibxsuTtSYib).

All numbers here are starting tunables. They live in one tuning table and are
checked by the pacing simulator. Treat them as hypotheses, not commitments.

## Owner decisions this spec follows (2026-10-03)

- The first run takes 7 to 10 days of mixed play and exposes **one layer of
  gameplay**: the hands-on builder.
- Every reset is worth doing and every run has a goal. Nobody resets just to
  reset.
- There is no fixed number of runs and no forced length. Short runs and long
  push runs are both valid, and there are different reasons to choose each,
  even within one era.
- Unlocks start slow and done by hand. They get quicker as you learn, and
  eventually happen automatically.
- Each era has its own visual look.
- No loot gear and no Locker in Era 1. No random-stat loot anywhere.
- The longest single job is 8 hours.
- This spec covers Layer 1 (Scrap Reset) and Layer 2 (Team) only.
- No paywall, ads or premium anything. Offline progress is free and at full
  rate.
- Upgrades come in many kinds, and each system owns its own lever. Many
  systems never feed one multiplier.
- The game tells one cohesive story.

---

## 1. Story spine

| Unit | Fiction | Ends with |
|---|---|---|
| **Run** | One racing **Season**. You're a kid with a wagon, a borrowed socket set and your family's garage. | **Scrap Reset**: the season ends, everything gets scrapped or sold, and you keep what you learned. |
| **Era 1: The Curb** | Every Season before you found a team. You race the neighbourhood, then the county, then the state. | Winning the State Invitational gets you an offer from Lou, who owns a race shop. |
| **Team era** | You found a team in Lou's back bay and commit to a **discipline**. Every Season from then on, you run that team. | **Team Reset**: the team folds, you re-found it, and you may switch discipline. |

The story is told through a **Journal**: short entries tied to firsts, like
your first find, first engine start, first loss to Dale, and first Feature
win. Named rivals carry the story across Seasons:

- **Dale**, from two doors down: backyard races.
- **Marisol**, whose dad runs the junkyard: karts.
- **Big Ron**, the five-time County Fair champion.
- **The Kessler twins**: the Regional and State circuits.

Rivals remember you. Head-to-head records persist forever.

---

## 2. State scopes (what a reset touches)

What survives a reset is decided by **where state lives**, never by
hand-written lists.

| Scope | Lives through | Holds |
|---|---|---|
| **Meta** | Everything | Codex, Know-how tiers, Habit memory, records, Hall of Fame, rival history, achievements, owned perks, discipline mastery, hardship mastery |
| **Layer: Scrap** | Scrap Resets, cleared by a Team Reset | Legacy Points balance, perk loadout slots, tune-up points, dares completed this era |
| **Layer: Team** | Team Resets | Team Points, team upgrades |
| **Team era** | Scrap Resets within one team, cleared by a Team Reset | Discipline, crew roster, crew experience, team-era stats |
| **Run (Season)** | Nothing | Parts, vehicles, Scrap Bucks, Rep, places opened, tools, benches, techniques learned this Season, Habit slots filled, queue |

---

## 3. Era 1: the one layer of gameplay

### 3.1 What's scarce

| Resource | Starts at | Grows by |
|---|---|---|
| **Hands**: your active job | 1 job plus a queue of 3 | Crew (Team era), perks |
| **Bench**: time-based work | 1 bench | Buying a 2nd bench mid-era, the Second Bench perk |
| **Garage space**: part slots | 12 | Shelving (bought), the Parts Room (Team) |
| **Carry**: parts per haul | Wagon: 2 | Riding-mower trailer 5, beater-car trunk 10, the Tow Hitch perk |
| **Scrap Bucks** | 0 | Race prizes, selling parts |
| **Rep**: local standing | 0 | Wins, beating rivals, records. Spent to open places and events. |

### 3.2 Verbs, revealed one at a time

| # | Reveal | Trigger | New decision |
|---|---|---|---|
| 1 | **Walk the curb** (a 15 s haul) | Start | None yet. The reveal is the point. |
| 2 | **Sort**: keep, strip or sell | First find | Space versus cash |
| 3 | **Bench: Clean** | First dirty part | Clean now or keep hauling |
| 4 | **Garage: Build** | A compatible engine and wheel | Which part goes in which slot |
| 5 | **Race: Backyard Derby** | First vehicle runs (a staged first start) | Which event, and Push or Nurse it |
| 6 | **Debrief and Codex** | First race | What to fix next |
| 7 | **Neighbourhood Yards** | 5 Rep (ask permission) | Where to haul |
| 8 | **Queue** (3 slots) | First job of 10 min or longer | What runs while you're away |
| 9 | **Habits** | Any job done 10 times | What to automate |
| 10 | **Know-how: Study** | First locked technique you meet | Learn now or work around it |
| 11 | **Tools counter** | First 50 Scrap Bucks | Which tool first |
| 12 | Riding Mower blueprint | Win the Backyard Feature | Build it, or keep improving the mower |
| 13 | Dirt Track and Local Junkyard | Rep, plus the riding mower trailer | Longer hauls, bigger events |
| 14 | Welding, then the Go-Kart | Study Welding | Fabricate versus find |
| 15 | Salvage Auction | Rep. Weekly lots with a buy-in, better condition. | Spend Scrap Bucks to save time |
| 16 | **The Beater project** | Rep, plus the Engine Hoist tool | A multi-stage restoration |
| 17 | County Fair invite, and the **Scrap Reset preview** | Win the Dirt Track Feature | You can see the goal days ahead |
| 18 | Regional Invitational, then State Invitational | Win the County Fair Feature | Push territory (see §5) |

Era 1 never shows crew, disciplines, sponsors or any other later system.

### 3.3 Jobs and durations (run 1 values)

| Kind | Examples | Duration |
|---|---|---|
| Haul | Curb / Yards / Junkyard / Auction lot / Long haul (bulk junkyard) | 15 s / 2 min / 10 min / 1 h / **8 h** |
| Bench | Clean / patch tyre / rebuild carb / strip mower / weld bracket / strip car / engine rebuild | 1 min / 5 min / 20 min / 30 min / 45 min / 4 h / **8 h** |
| Study | Rebuilding / Welding / Tuning / Wiring / Bodywork | 10 min / 1 h / 2 h / 4 h / 6 h |
| Race | Sprint / Heat / Feature | Prep plus a 10–20 s replay. Events run **on a schedule** (Backyard every 2/5/15 min up to State every 2/8/24 h), like Friday night at the Dirt Track. This caps prize income and gives each visit a "race night" to plan around. |

No job exceeds 8 hours. When the queue empties, the game says so plainly. It
never silently wastes the player's time.

### 3.4 Habits: automation you earn

- Doing a job **10, 25 or 50 times** (depending on the job) turns it into a
  Habit, like *Curb Route* or *Carb Kit*.
- A Habit runs in a **Habit slot** at 60% of your manual speed. You start
  with 1 slot and gain one each at the Riding Mower, the Go-Kart and the
  Beater, for 4 by the end of Era 1.
- **Muscle Memory**: each Season in which you re-earn a Habit halves its
  threshold for next time, down to 2.
- Habits never make decisions. They repeat a job you configured.

### 3.5 Know-how: unlocks that speed up as you learn

Every technique, blueprint and place has a Know-how tier that persists in
meta.

| Tier | How you reach it | What unlocking costs that Season |
|---|---|---|
| **Learning** | Never done before | The full study job, practice, and the Rep or permission talk |
| **Familiar** | Done in any previous Season | 25% of the study time, half the Rep |
| **Second Nature** | Done in 3 Seasons, or deep Codex mastery | **Automatic.** It unlocks the moment its trigger fires: owning a welder teaches Welding, and reaching the Rep threshold opens the Junkyard. |

This is how unlocks go from slow and manual to quick to automatic, without a
"skip" button.

### 3.6 Racing

- The result is computed first, from the build, part condition, build tuning,
  the driver's practice at that circuit, and a seeded roll. The 10–20 s
  replay then tells it truthfully: a position ticker, gaps, and beats with
  causes ("Lap 3: rear tyre let go, lost two places").
- One call per race in Era 1: **Push** (faster, more wear, higher DNF risk)
  or **Nurse it**.
- A debrief names the weakest part, how close the result was, and one fix
  that links straight to the bench or the garage.
- Watching is optional once the *Race Day* Habit exists, so auto-race is
  earned.
- Events follow the existing Sprint/Heat/Feature ladder at each venue:
  Backyard Derby, Dirt Track, **County Fair** (new venue), Regional
  Invitational, State Invitational.

### 3.7 Economy notes (added during implementation, 2026-10-04)

- **Dealer saturation.** Selling many of the same part lowers its price, and the dealer recovers by one step per hour. Without this, Habit trips printed money and Scrap Bucks stopped mattering.
- **Parts Counter.** Buy any part you've seen at three times its value, in Good condition, up to one tier above what you drive. It's the main Scrap Bucks sink, and it trades money for time.
- **Sedan shell.** Bought at the Salvage Auction (150 Scrap Bucks). It needs Clean, then Bodywork, before it fits the Beater.
- **Clean** brings Scrap up to Rusted (double time), and Rusted up to Worn. Required parts can be pulled for repair, but the vehicle can't race until its slots are filled again.
- **Perks are bought and equipped in the same reset screen**, using the Legacy Points that reset awards.
- **Scripted opening.** The first two trips ever find a seized engine and a busted wheel.

Measured with `npm run sim` (4×15 min visits a day): Season 1 takes about 6.5–7 days. Later Sprint Seasons take 3–5 days, with high variance from the greedy bot. A push player founds a team in about 34 days.

### 3.8 Vehicles do more than race

Each vehicle in Era 1 also changes the economy. This makes cars part of your
identity, and they don't become disposable tiers.

- The **Riding Mower** tows a trailer, so carry goes to 5.
- The **Go-Kart** cuts the travel time to the Dirt Track.
- The **Beater**'s trunk raises carry to 10 and makes the long haul possible.

Every finished vehicle goes into the **Hall of Fame** with its history:
where each part came from, its wins and its breakdowns.

---

## 4. Bonus channels: one system, one lever

Every bonus targets a named **channel**. Each channel declares its sources,
and a unit test enforces two rules:

- **No channel has more than 3 sources.**
- **No source touches more than 2 channels.**

The UI shows each channel's breakdown wherever its rate is shown.

| Channel | Era 1 sources | Team-era sources | Effect kind |
|---|---|---|---|
| Carry | Vehicle carrier | Tow Rig, Tow Hitch perk | Flat |
| Haul time | Tune-up (Haul), Codex location level | Hauler crew | % |
| Find quality | Codex location level, Junkyard Eyes perk | One Yard mastery | Shifts the condition odds, and reveals |
| Bench speed | Tools, tune-up (Wrench) | Hand Tools mastery | % |
| Bench parallelism | Benches bought, Second Bench perk | Second Bay | Capacity |
| Storage | Shelving | Parts Room | Capacity |
| Sell value | Haggling know-how, Swap Meet perk (convert) | | %, and conversion |
| **Car performance** | Parts, condition, build tuning, circuit practice | Driver crew | **Intrinsic: no global % ever** |
| Race payout | Event tier | Sponsor Board | Flat per event |
| Rep gain | Rivals beaten, records | | Flat |
| Automation | Habit slots, Kid Brother perk | Crew assignments | Capacity |
| Unlock speed | Know-how tier | Scouting Network | Time, then automatic |
| Away efficiency | Overnight jobs, Night Owl perk | Short Season mastery | % while offline |
| Legacy gain | Milestones, records, dares | | Flat per milestone |
| Wear and repair | Condition, Shade Tree perk | Rust Everything mastery, Dirt Oval mastery | Time and cost |

**Effect kinds used across the game.** The aim is variety, so no single kind
should dominate the perk and upgrade lists:

- Flat
- Percent
- Capacity
- Parallelism
- Time reduction
- Cost reduction
- Unlock: a new place or verb
- Information: reveal condition or odds
- Rule bend: for example, repairs that use metal
- Conversion: for example, three parts into one
- Automation
- Risk/reward
- Conditional: for example, rain
- Milestone

---

## 5. Layer 1: the Scrap Reset

### 5.1 The goal of every Season

The **County Fair Feature** unlocks the Scrap Reset. The reset preview shows
four things from the moment the Fair invite arrives:

- what you'd earn now
- the next milestone and what it adds
- what you keep
- what you lose

### 5.2 Legacy Points (LP)

LP comes only from things the player achieved. Hours played and race count
never earn LP.

| Source | LP (first time reached this Season) |
|---|---|
| Backyard Feature | 2 |
| Dirt Track Feature | 5 |
| **County Fair Feature** (gate) | 12 |
| Regional Invitational Feature | 30 |
| State Invitational Feature | 70 |
| **Record**: beat your best time to any milestone | +25% of that milestone's LP |
| **Dare** completed | Unlocks a perk (see §5.4), not LP |

### 5.3 Three kinds of Season, and why you'd pick each

| Kind | You stop at | Why you'd do it |
|---|---|---|
| **Sprint** | County Fair | Once perks mature this is the best LP per hour, and it's where records get beaten. Typically around a day after a few resets. |
| **Push** | Regional or State | The most LP per Season. You meet later parts (V6, steel unibody, ECU), which feeds Codex depth, and you unlock push-only perks. A State win is the **gate to the Team layer**. |
| **Dare** | Depends on the dare | The only way to unlock specific perks. You build a loadout around one odd objective. |

No kind dominates. The pacing simulator must show:

- Sprint wins on LP per hour.
- Push wins on LP per Season, and on the Team gate.
- Dares win on unlocking perks.

### 5.4 Perks: owned forever, a few equipped per Season

- **Owned perks** persist in meta. **Loadout slots** limit how many are
  active in a Season.
- Slots start at 2. You gain a slot at your first Regional Feature win, your
  first State Feature win, and after 5 dares completed.
- Choosing a sprint loadout versus a push loadout is a real decision every
  reset.
- LP buys perks and their ranks (1–3, with costs rising per rank).
- Some perks are only unlocked by dares or by push milestones.

| Perk | Kind | Channel | Unlocked by |
|---|---|---|---|
| Barn Find | Head start | Starts you with a rusted Riding Mower | LP |
| Tow Hitch | Flat | Carry +2 per rank | LP |
| Kid Brother | Automation | One Habit runs from minute one | LP |
| Shade Tree Mechanic | Rule bend | Repairs can use metal instead of a donor part | LP |
| Junkyard Eyes | Information | See a part's condition before you haul it | LP |
| Night Owl | Away | Bench jobs run +25% faster while you're away | LP |
| Second Bench | Parallel | Start with 2 benches | Push: first Regional win |
| Swap Meet Regular | Conversion | A weekend swap meet: 3 parts in, 1 chosen part out | Dare: *Packrat Season* (never sell a part) |
| Grudge Match | Risk/reward | Last Season's toughest rival returns early, and beating them pays double | Dare: *Settle It* (beat Big Ron at the Dirt Track) |
| Underdog | Conditional | A lower-tier vehicle gets better odds in higher-tier events | Dare: *Mower Madness* (win the Dirt Feature with a Riding Mower) |
| Early Bird | Milestone | The first race each Season pays triple | Dare: *Quick Season* (Fair Feature within 48 h) |
| Scavenger's Map | Unlock | The Long Haul is open from the start | Push: first State win |
| Old Notebook | Unlock speed | Familiar techniques study in 10% of the time | LP, after 10 techniques reach Familiar |

### 5.5 Tune-up points

- You get 5 points at the first reset, and +1 for each depth milestone you
  reach for the first time ever.
- Each point gives +10% speed to one skill: Haul, Wrench, Build or Race prep.
- Stack or spread them freely. They respec at every reset.

### 5.6 Pacing targets (simulator-checked)

| Moment | Target (4 short visits a day) |
|---|---|
| Season 1 to the County Fair Feature | 7–10 days |
| Season 2 | 3–5 days |
| A mature Sprint | about 1–1.5 days |
| Push from the Fair to State | +3–6 days on top of the Fair, shrinking with perks |
| First State win (Team gate) | about 3–5 weeks of total play |

There are three player models:

- 4 visits a day, 15 min each
- 1 visit a day, 5 min
- a heavy active player

---

## 6. Layer 2: Team

### 6.1 Gate and founding

- **Gate**: win the State Invitational Feature in any Season.
- A preview appears once the Regional Invitational opens.
- The first Team Reset is **Founding**: you pick a team name, colours and a
  discipline. The interface switches to the Race Shop look in your team's
  colours.

### 6.2 What a Team Reset does

| Clears | Keeps |
|---|---|
| The Season; the LP balance; perk loadout slots back to 2; tune-up points back to 5; crew; discipline | Meta (Codex, Know-how, Habit memory, owned perks, records, Hall of Fame, masteries), Team Points, team upgrades |

The first Season of each team is slower again: base slots and a new
discipline to learn. It then speeds up as Team upgrades and crew come online.

### 6.3 The new verb: people

- **Hiring.**
  - Each Season, 3 named candidates come from an authored roster.
  - Each has one strength, one quirk and a role: **Wrench**, **Hauler**,
    **Driver** or **Spotter**.
  - Example: *Gus, retired mechanic. Bench jobs +30%. Won't work in the
    rain.*
  - There are no random stats.
- **Crew work in parallel.** They take jobs from the queue and can run any
  Habit you've learned. Habit slots are replaced by crew assignments.
- **Morale is the new scarce thing.** Each crew member has a daily stamina.
  Overtime lowers morale, and morale scales their speed. Rest days restore
  it.
- **Experience.** Crew improve at the job types they do. Experience lasts for
  the life of the team and is lost at a Team Reset, unless you buy *Old
  Hands*.
- **The driver matters.** A Driver crew member adds circuit practice and a
  second race call: **pit or stay out** (Dirt Oval), or **launch timing**
  (Drag).

### 6.4 Disciplines (rule changes)

The discipline is chosen at each Team Reset. Version 1 ships **Dirt Oval**
and **Drag**. Rally and Demolition follow.

| Discipline | Rule changes | What becomes valuable | Mastery (meta, "while inactive" bonus) |
|---|---|---|---|
| **Dirt Oval** | Standard ladder; cautions; tyre wear matters | Handling, reliability, tyres | Wear and repair −X% in every discipline |
| **Drag** | 1/8 and 1/4 mile; no handling stat; engines can blow up; many short races | Power, traction, weight; exhaust and drivetrain parts | Engine rebuild time −X% in every discipline |
| Rally (later) | Stages; damage carries forward between stages; Spotter calls the notes | Reliability, suspension | Haul time −X% |
| Demolition (later) | Last car standing; your car is destroyed and its wreck is salvaged | Frame, weight | Strip yield +X% |

Each discipline has:

- its own milestone ladder and **Championship** (its "State")
- its own Codex chapter
- its own mastery

Mastery is the reason to switch disciplines rather than repeat the best one.

### 6.5 Team Points (TP) and team upgrades

**TP** is earned at a Team Reset from three sources:

- discipline milestones reached in that team's life (the Championship pays
  most)
- hardships completed
- crew who became **Legends** (maxed experience in their role)

Raw time and race count never earn TP.

| Upgrade | Channel | Kind |
|---|---|---|
| Second Bay | Bench parallelism +1 | Capacity |
| Parts Room | Storage +12 | Capacity |
| Tow Rig | Carry +5 | Flat |
| Crew Quarters | Crew cap +1 | Capacity |
| Dyno | Shows exact performance and odds before a race | Information |
| Sponsor Board | Race payout, flat per event tier | Flat |
| Scouting Network | Places reach Second Nature after 1 Season instead of 3 | Unlock speed |
| Legacy Ledger | Perk loadout slot +1 | Capacity |
| Old Hands | Keep one crew member through a Team Reset | Rule bend |

### 6.6 Hardship runs (unlocked in the Team era)

- Optional flags you queue at a Scrap Reset for the next Season. Up to 2
  flags to start, and 4 later.
- A hardship is completed by reaching the County Fair Feature under it. A
  higher tier requires State.
- Each hardship grants **mastery in its own channel**, stacking with
  diminishing returns. No hardship feeds a global multiplier.

| Hardship | Rule | Mastery channel |
|---|---|---|
| Hand Tools Only | No Habits and no crew automation | Bench speed |
| One Yard | Only one haul location | Find quality |
| Rookie Plates | No perks | One-time +1 loadout slot, then Legacy gain |
| Rust Everything | Every part spawns one condition step worse | Wear and repair |
| Solo | No crew | Automation (+1 Habit slot, once) |
| Short Season | Must reach the Fair within 48 h | Away efficiency |

Incompatible flags (for example, Solo with a crew-only dare) are declared in
data and shown in the UI.

### 6.7 Team-era run choices

| Choice | Short | Long |
|---|---|---|
| Season | A Sprint to the discipline's Fair for LP and records | A Push to the Championship for TP and crew Legends |
| Team | A short team, then switch discipline to build mastery breadth | A deep team: Championship wins, Legends and the biggest TP |

---

## 7. Era looks

| Era | Look | Notes |
|---|---|---|
| Era 1: The Curb | **Backyard notebook**: graph paper, pencil, masking-tape labels, Polaroids of builds, red-pencil margin notes | Low chrome. Mostly typography and paper texture. Light-first, with a dim "night in the garage" variant. |
| Team era | **Race shop**: pegboard tool wall, whiteboard schedule, team livery | Built from the player's team colours, chosen at Founding. |

Both looks are theme token sets in the existing system. Midnight Circuit is
saved for a later era.

---

## 8. Engine requirements this spec creates

- **State scopes** as in §2, plus a generic `performReset(layerId, choices)`.
- **LayerDef entries** for `scrap` and `team`: gate predicate, award formula,
  scope policy and choices. The choices are perks and dares for Scrap, and
  discipline and hardships for Team.
- **RunModifier** kinds: perk, dare, hardship and discipline. Each has
  `flags`, `statMods` (targeting a channel), `hooks` and `conflicts`.
- A **channel registry** that declares the sources for each channel, plus the
  cohesion test from §4.
- **Know-how tiers and Habits** as engine features with triggers.
- **One `step` reducer** for manual actions, live ticks and offline catch-up.
  It includes an explicit job queue with 8 h jobs, and pauses with a notice
  when the queue is empty.
- **A deterministic race**, then a replay script generated from the same
  result.
- **A pacing simulator** with the three player models in §5.6 and the
  run-kind checks in §5.3.

---

## 9. Build order for these two layers

1. Clean up: commit and tag the current game, and delete the 3D branch and
   stale branches.
2. The owner reviews this spec.
3. New core, headless: scopes, the reducer, the channel registry, LayerDef
   for scrap plus a Team stub, and modifiers. It is proved by a 14-day sim
   and a Hand Tools Only test.
4. Era 1 content and screens in the notebook look: Haul, Bench, Garage, Race
   replay, Journal and Codex.
5. The Scrap Reset: perks, dares, records, tune-up points and the preview.
6. The owner plays Era 1 for 1–2 weeks, and we tune through the simulator.
7. The Team layer: Founding, crew, Dirt Oval and Drag, team upgrades and
   hardships.
8. Rally and Demolition.

## 10. Decisions (2026-10-04)

1. A run is called a **Season**. The higher layer uses **Founding** and
   **Team Reset**.
2. The first disciplines are **Dirt Oval** and **Drag**.
3. The rival roster stays. Names may change, but no rival is cut.
4. **Fresh save**: no migration from the current game.
5. The rebuild is a hybrid rewrite (recommended, not objected to): a new
   core, with content, math and simulators ported.
