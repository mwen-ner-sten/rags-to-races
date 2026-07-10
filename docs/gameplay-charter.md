# Gameplay Charter

Status: Draft v0.1 for discussion and playtesting

## Why This Exists

Rags to Races already contains more systems than its core vision currently needs.
This charter defines the intended player experience before more gameplay is built.
Existing code is evidence and an option, not a promise that every system must ship.

The project also exists to teach web deployment. That learning goal shapes how the
game is tested and released, but it should not make the player experience feel like
a deployment exercise.

## Vision

Rags to Races is a browser incremental game about turning discarded junk into
increasingly improbable racing machines, then growing that scrappy operation into
a racing empire.

The player should feel that each leap in speed came from understanding, combining,
and improving what they found rather than merely waiting for a larger number.

## Player Promise

Start with almost nothing. Find useful junk. Make questionable engineering choices.
Build something that can move. Race it. Learn why it failed. Return with a better
machine and gradually automate the labor without automating away the interesting
decisions.

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

### Complexity Must Earn Its Place

Every currency and subsystem must strengthen scavenging, engineering, racing, or the
relationship among them. A system that creates upkeep without a meaningful decision
should be simplified, deferred, or hidden.

## Provisional Experience Targets

These are playtest hypotheses, not balance commitments.

| Moment | Target experience |
| --- | --- |
| First 5 minutes | Understand scavenging, parts, selling, and the immediate vehicle goal |
| First 15 minutes | Assemble or nearly assemble the first vehicle through understandable choices |
| First 30 minutes | Race, identify a weakness, and make a targeted improvement |
| First 60-120 minutes | Reach the first Scrap Reset with a clear reason to begin again |
| Second run | Feel materially different because automation or a strategic option changed |
| Midgame | Make competing choices about build direction rather than buying every upgrade in order |
| Long game | Grow the racing operation without losing the importance of vehicles and races |

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

## Current System Hypotheses

This is an initial classification to test, not a final cut list.

### Core

- Scavenging and inventory evaluation
- Vehicle assembly and active vehicle choice
- Racing, race selection, and race feedback
- Vehicle condition, repair, and improvement
- Workshop progression
- Scrap Reset and early automation

### Supporting

- Offline progress
- Achievements and milestones that teach or reward core play
- Activity history and useful statistics
- Themes, vehicle art, and progression presentation
- Save export/import and environment-safe testing

### Experimental Until Proven

- Random loot gear, mods, talents, and racer attributes
- Crew and higher organizational layers
- Crafting, materials, Dealer, forging, and trade-ups
- Fatigue and momentum
- Challenges and playstyle trees
- Team, Owner, and Track resets

Experimental systems should stay available in `dev` when useful for learning. They
should enter UAT only when their player decision and relationship to the core loop are
clear and their advertised effects work.

### Deferred

- AI mechanic advisor
- Competitive leaderboards, seasons, and community events
- Server-authoritative multiplayer or anti-cheat work
- Animated vehicle sheets, damage overlays, and procedural recoloring

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

If those answers are weak, keep the system experimental rather than filling in more
content around it.

## Non-Goals For Now

- Commercial monetization or retention optimization
- Perfect balance across an effectively infinite endgame
- Multiplayer credibility without server-authoritative validation
- More currencies merely to extend progression
- Developing every scaffold simply because code already exists
- Hiding confusing gameplay behind tutorial text instead of improving the interaction

## Open Design Decisions

The first charter review should settle these questions:

1. Rank the dominant pleasures: engineering a vehicle, watching or influencing a
   race, and optimizing the racing organization.
2. Decide how much agency exists immediately before and during a race.
3. Decide whether a vehicle is a temporary stepping stone or a build the player can
   develop and care about for a meaningful span of time.
4. Decide whether Scrap Reset is the primary repeating loop or the first of several
   genuinely different games.
5. Decide the intended balance between active sessions and unattended progress.

Until those are settled, avoid adding another progression layer.

## Definition Of A Charter-Aligned Feature

A feature is ready for UAT when:

- Its player decision is stated in its PR.
- It strengthens at least one design pillar.
- Its effects are wired and observable.
- Its fresh-save and existing-save behavior are tested.
- Its mobile and desktop paths work.
- Help text describes what the game actually does.
- The playtest has a concrete success or failure signal.
