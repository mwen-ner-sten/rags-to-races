# Era 2: concept options

Date: 2026-11-18. Status: **draft for owner decision**. Nothing here is built.
Companion to [era-1-and-team.md](era-1-and-team.md).

## Where the game stands

The code has one era. `era: null` is Era 1, "The Curb", and a founded team is
the Team layer on top of it. Two resets are real layers:

| Layer | Reset | Pays | Rule change it brings |
|---|---|---|---|
| 1 | Scrap Reset (end the Season) | Legacy Points | Perks, Dares, challenges, tune-up points, home county |
| 2 | Team Reset (re-found the team) | Team Points | Crew instead of Habits, disciplines (Dirt Oval, Drag, Stage Rally), hardships, team upgrades |

Owner championships, the Circuit Office and Clubs sit on top of the Team
layer. They are campaigns with their own records, but **they do not reset
anything**, so they add content without adding a new kind of run.

The original brief (Idle Iktah first era, then Evolve / Kittens Game style
layers that change the rules) needs at least one more layer that changes how
the game is played, not only what is unlocked.

## What Era 2 must do

From the owner decisions in era-1-and-team.md and the gameplay charter:

1. **Change the rules, not just the numbers.** A new verb and a new scarce
   resource, the way crew and morale arrived with the Team layer.
2. **Make Era 1 fast and automatic, not obsolete.** Era 1 becomes the thing
   you automate, the way Trimps automates early zones and NGU automates
   early bosses. Know-how Second Nature and Habits are the start of this.
3. **Every reset is worth doing.** One clear goal per run. No reset just to
   reset.
4. **A visible change.** The owner loves that founding a team re-lights the
   UI in team colours. Era 2 needs its own equally visible change.
5. **One lever per system.** Follow the bonus-channel rule in `channels.ts`.
6. **No paywall, no random loot.**

## Option A: The Circuit (recommended)

**Fiction.** Your team wins enough titles that you stop just racing in other
people's events and start running your own. You own the championship.

- **New layer reset: Charter Reset.** It ends your racing operation's
  "franchise". You keep your Circuit (tracks, certified calendars, staff).
  The team, the Season and LP all reset.
- **New verb: promote.** Publish calendars, set field policies, invite
  rivals, build and upgrade **tracks** (layouts already exist as Club track
  founding). Your own team still races in your events.
- **New scarce resource: Crowd / gate.** Attendance comes from close finishes,
  rivalries and variety. A dull dominant team empties the stands. That turns
  "win every race" into "make racing worth watching", which is a real rule
  change.
- **Automation of the lower layers.** A Team "autopilot" runs Seasons and
  Scrap Resets from a saved plan (perk loadout, objective, discipline),
  unlocked by Charter milestones. Trimps and NGU both do this.
- **Reuses built code.** `ownership.ts`, `promoter.ts`, `club.ts` and
  `clubTrack.ts` already exist and are bot-tested. Era 2 turns them from side
  campaigns into a real layer with its own reset and currency.
- **Visible change.** The UI becomes a race-control / broadcast look, with
  your circuit's name and colours, and a track map you build on.
- **Currency: Charter Points.** Earned from certified calendars, attendance
  milestones and rival storylines. Spent on track pieces, staff and autopilot
  rules.

## Option B: The Works (manufacturer)

**Fiction.** You stop scavenging and start building cars to sell and race.

- New verb: **design and produce.** Blueprints from your Hall of Fame builds
  become production lines.
- New scarce resource: factory floor time and supplier contracts.
- Reuses the hidden Manufacturer code, but that code is the least proven of
  the side careers.
- Risk: it drifts away from racing, which is the heart of the game.

## Option C: Midnight (underground street racing)

**Fiction.** A parallel world of night racing.

- New verb: **heat and risk.** Night races pay well but build heat. Too much
  heat gets cars impounded.
- The Midnight Circuit neon look was originally reserved for this era.
  **Conflict:** the owner restored that look across the whole game on
  2026-11-18, so an era change would need a different visual shift, for
  example a darker "after hours" variant.
- Lots of new content, and the least reuse.

## Recommendation

Option A. It turns the most-built, already-tested late systems into the
missing rule-changing layer, so Owner, Circuit and Club stop being "more
tabs" and become an era. It also gives the game the automation-of-earlier-layers
loop that NGU, Trimps and Progress Knight players expect.

## How many layers, in total?

Proposal: **four layers**, delivered one at a time, each with its own look.

| Layer | Name | Status |
|---|---|---|
| 1 | Scrap Reset (Season) | Built |
| 2 | Team Reset | Built |
| 3 | Charter Reset (Era 2: The Circuit) | This document |
| 4 | Undecided. Candidates: Option B or C, or a "Legacy / Hall of Fame" meta layer | Later |

## Decisions the owner needs to make

1. Option A, B or C for Era 2?
2. Should Owner / Circuit / Club stay playable before Era 2 is built, or be
   hidden until they become Era 2? (They are gated behind the Team layer
   today.)
3. How long should the first Charter run be? A suggested target is 2–3 weeks of
   mixed play after the first team is founded.
4. How much autopilot? A full "run the last plan" button, or rules that
   must be configured?
5. Era 2 look: if Midnight Circuit is now the base theme, what does Era 2
   switch to?
