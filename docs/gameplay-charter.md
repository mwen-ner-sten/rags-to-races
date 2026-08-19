# Gameplay Charter

Status: Product direction v1.0

## Why This Exists

Rags to Races is intended to grow into a broad, deeply layered incremental game.
Complexity is part of the reward, but it must be earned through play rather than
presented as a wall of menus. This charter defines how the game expands from one
scrappy garage into the wider world of racing.

Existing code is evidence and an option, not a promise. Systems may be moved,
combined, redesigned, hidden, or removed when they do not strengthen that journey.

The project also exists to teach web deployment. That learning goal shapes how the
game is tested and released, but it should not make the player experience feel like
a deployment exercise.

## Vision

Rags to Races is a long-form browser incremental about turning discarded junk into
increasingly improbable racing machines, then growing that scrappy operation into
a racing team, organization, and eventually an entire racing ecosystem.

The player begins as a DIY scavenger and engineer, becomes a racer and crew chief,
then grows into a team owner and racing organizer. Each promotion adds a new game
layer, compresses work the player has already mastered, and changes how future runs
can be approached. Earlier layers remain connected to the later game instead of
becoming irrelevant.

The player should feel that each leap in speed came from understanding, combining,
and improving what they found rather than merely waiting for a larger number.

## Player Promise

Start with almost nothing. Find useful junk. Make questionable engineering choices.
Build something that can move. Race it. Learn why it failed. Return with a better
machine and gradually automate the labor without automating away the interesting
decisions.

Casual players can progress with clear recommendations, robust defaults, and idle
automation. Expert players can inspect the underlying simulation, specialize builds,
write detailed operating policies, influence races, and optimize the whole organization.

## Design Pillars

### Junk Becomes Identity

Parts, condition, add-ons, and vehicle construction should make the player's machine
feel assembled rather than purchased from a linear tier list. Progression from mower
to prototype should remain visually and mechanically connected to the junkyard origin.

### Automation Elevates the Player

Automation removes repetition after the player understands a task. It should expose
a higher-level decision instead of turning the game into unattended accumulation.

### Racing Produces Information

A race should answer more than win or lose. It should reveal a weakness, validate a
build decision, create a tradeoff, or change what the player wants to do next.

### Resets Change Strategy

A reset must do more than increase multipliers. It should create a new route, remove
old friction, unlock a new decision, or encourage a different build strategy.

The first reset is the only reset visible at the start. Higher resets are revealed
through the story as the player's responsibilities expand. A higher reset may define
the next campaign with a discipline, region, regulations, commercial model, or other
advantages and constraints. These run identities should be closer to Evolve's planets
than to another permanent percentage-upgrade screen.

### Complexity Must Earn Its Place

Every currency and subsystem must strengthen scavenging, engineering, racing, or the
relationship among them. A system that creates upkeep without a meaningful decision
should be simplified, deferred, or hidden.

Complexity itself is a long-term reward. A system earns its place when it arrives at
the moment the player can understand why it exists, changes a meaningful decision,
and either deepens the current role or promotes the player into a new one.

### Active Play Rewards Decisions

Idle play should always produce useful progress. Active play may improve efficiency,
surface opportunities, and influence races through decisions such as pace, risk, pit
timing, weather response, or mechanical triage. Active rewards must not depend on
reaction speed or repetitive clicking, and unattended strategies must remain viable.

### The Roots Remain Visible

Growth into management must not turn the game into a generic multiplier dashboard.
Vehicles, components, circuits, drivers, and race outcomes remain the language of the
game at every layer. Old classes can return through restricted events, historic racing,
training programs, fleet assignments, sponsor objectives, and unusual campaign rules.

## Unfolding Player Roles

The names and exact reset contracts remain subject to playtesting, but the intended
order of responsibility is established:

1. **DIY Builder** — personally scavenge, evaluate parts, assemble one machine, race,
   diagnose failures, and improve within the current class.
2. **Experienced Racer / Garage** — retain knowledge, blueprints, better opening
   options, and automation while pursuing specialized same-tier builds.
3. **Crew Chief / Race Team** — hire and equip people, assign responsibilities,
   operate several vehicles, plan events, and automate garage labor through policies.
4. **Team Owner** — choose an organizational identity, sponsors, development programs,
   facilities, budgets, drivers, and championships.
5. **Series / Track Organizer** — define campaign environments and rules that combine
   benefits with constraints, producing strategically different future runs.

Additional layers are welcome when progression naturally reaches a new scale of racing.
They are not justified solely by the need for a larger number.

## Provisional Experience Targets

These are playtest hypotheses, not balance commitments.

| Moment | Target experience |
| --- | --- |
| First 5 minutes | Understand scavenging, parts, selling, and the immediate vehicle goal |
| First 15 minutes | Assemble or nearly assemble the first vehicle through understandable choices |
| First 30 minutes | Race, identify a weakness, and make a targeted improvement |
| First 60-120 minutes | Reach the first Scrap Reset with a clear reason to begin again |
| Second run | Feel materially different because automation or a strategic option changed |
| Midgame | Make competing same-tier builds and promote from personal labor into crew policies |
| Long game | Choose organizations, series, and campaign rules without losing the importance of vehicles and races |

## Core Loop

1. Scavenge for parts and opportunities.
2. Evaluate, sell, repair, combine, or save what was found.
3. Build a vehicle around a goal or constraint.
4. Choose a race that tests that vehicle.
5. Read the outcome and decide what needs to change.
6. Upgrade the machine or the operation.
7. Reset when the next run offers a meaningfully better strategy.

The important connective tissue is evaluation: found items, build choices, and race
results must create understandable next decisions.

## Current System Direction

This classification controls introduction order, not final scope. A later-layer system
can be central to the full game while remaining hidden from a new player.

### Core

- Scavenging and inventory evaluation
- Vehicle assembly and active vehicle choice
- Racing, race selection, and race feedback
- Vehicle condition, repair, and improvement
- Workshop progression
- Scrap Reset and early automation
- Same-tier specialization and reasons to retain multiple builds
- Actionable post-race engineering diagnosis

### Supporting

- Offline progress
- Achievements and milestones that teach or reward core play
- Activity history and useful statistics
- Themes, vehicle art, and progression presentation
- Save export/import and environment-safe testing
- Recommended defaults, templates, and policies for casual play

### Later Layers, Introduced Deliberately

- Crew, roles, development, equipment, and fleet assignments
- Garage station equipment and capability progression
- Crafting, materials, Dealer, forging, and trade-ups
- Racer attributes, fatigue, strategy, and active race influence
- Challenges, championships, sponsors, and playstyle trees
- Team, Owner, Track, and future responsibility resets
- Run-defining disciplines, regions, regulations, and organizational identities

These systems should stay available in `dev` when useful for learning. They should be
progressively gated in the actual campaign and enter UAT only when their player
decision, narrative timing, and relationship to earlier layers are clear.

### Deferred

- AI mechanic advisor
- Competitive leaderboards, seasons, and community events
- Server-authoritative multiplayer or anti-cheat work
- Server-authoritative competitive simulation

## System Admission Test

Before a system is treated as part of the game, answer:

1. What decision does the player make?
2. Why is that decision interesting more than once?
3. Which core pillar does it strengthen?
4. What does it cost in attention, currency, or complexity?
5. When is it introduced?
6. When, if ever, is it automated?
7. What happens to it during each reset?
8. How will a playtest show that it improved the game?
9. Which mastered labor does it automate or compress?
10. What new responsibility or campaign choice does it introduce?
11. Can a casual player use a good default while an expert goes deeper?

If those answers are weak, keep the system experimental rather than filling in more
content around it.

## Non-Goals For Now

- Commercial monetization or retention optimization
- Perfect balance across an effectively infinite endgame
- Multiplayer credibility without server-authoritative validation
- More currencies merely to extend progression
- Developing every scaffold simply because code already exists
- Hiding confusing gameplay behind tutorial text instead of improving the interaction

## Settled Product Decisions

- The dominant fantasy unfolds in order: engineer a vehicle, race and influence it,
  then optimize the racing organization.
- Vehicles are developed within a tier and can remain useful through specialization,
  restricted events, and later fleet programs; they are not merely unlock keys.
- Idle progress is always useful. Active decisions provide bounded advantages.
- Automation removes mastered basic work and exposes higher-order policy decisions.
- The first reset begins a sequence of genuinely different responsibility layers.
- Reset names and current implementations may change when a stronger design emerges.
- The target audience is primarily incremental-game players, with optional depth for
  racing and optimization enthusiasts.
- This is a public MIT-licensed portfolio hobby game. Anti-cheat is not a priority
  unless trusted competitive play is introduced.
- The game may be as deep as players want to make it, provided casual defaults remain
  understandable and each layer is progressively disclosed.

## Open Design Work

These questions should be answered through implementation and playtesting rather than
blocking the roadmap:

1. Which first-reset identity best communicates retained engineering knowledge?
2. Which same-tier specializations produce clearly different race decisions?
3. Which active race decisions are valuable without becoming twitch mechanics?
4. What is the first campaign-defining higher-reset choice that creates a genuinely
   different run?
5. At what exact milestone should each existing advanced system become visible?

## Definition Of A Charter-Aligned Feature

A feature is ready for UAT when:

- Its player decision is stated in its PR.
- It strengthens at least one design pillar.
- Its effects are wired and observable.
- Its fresh-save and existing-save behavior are tested.
- Its mobile and desktop paths work.
- Help text describes what the game actually does.
- The playtest has a concrete success or failure signal.
